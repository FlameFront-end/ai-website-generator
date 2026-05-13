import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import AdmZip from 'adm-zip';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Repository } from 'typeorm';

import {
  RunArtifactEntity,
  RunEntity,
  RunLogEntity,
  RunLogLevel,
  RunStatus,
} from '../../db/entities';
import { StorageService } from '../storage/storage.service';
import { PipelineService } from '../pipeline/pipeline.service';
import type { CreateRunDto } from './dto/create-run.dto';
import type { UpdateRunDto } from './dto/update-run.dto';

const RUN_NUMBER_PAD = 3;

function toRunSlug(runNumber: number): string {
  return `run-${String(runNumber).padStart(RUN_NUMBER_PAD, '0')}`;
}

@Injectable()
export class RunsService {
  private readonly logger = new Logger(RunsService.name);

  constructor(
    @InjectRepository(RunEntity)
    private readonly runsRepository: Repository<RunEntity>,
    @InjectRepository(RunArtifactEntity)
    private readonly artifactsRepository: Repository<RunArtifactEntity>,
    @InjectRepository(RunLogEntity)
    private readonly logsRepository: Repository<RunLogEntity>,
    private readonly storageService: StorageService,
    private readonly pipelineService: PipelineService,
  ) {}

  async createRun(dto: CreateRunDto, userId: string) {
    const brief = dto.brief.trim();
    const runNumber = await this.getNextRunNumber(userId);
    const slug = toRunSlug(runNumber);

    const run = await this.runsRepository.save({
      runNumber,
      slug,
      brief,
      status: RunStatus.Queued,
      currentStep: 'queued',
      userId,
    } as RunEntity);

    await this.storageService.createRunFolders(userId, slug);
    await this.storageService.writeStatusFile(userId, slug, run);
    await this.addLog(run.id, 'Запуск поставлен в очередь', { slug });

    void this.pipelineService.processRun(run, userId);

    return {
      id: run.id,
      slug: run.slug,
      status: run.status,
    };
  }

  getRuns(userId: string): Promise<RunEntity[]> {
    return this.runsRepository.find({
      where: { userId },
      relations: {
        artifacts: true,
        logs: true,
      },
      order: {
        isPinned: 'DESC',
        createdAt: 'DESC',
        logs: {
          createdAt: 'DESC',
        },
      },
      take: 25,
    });
  }

  getRun(id: string, userId: string): Promise<RunEntity | null> {
    return this.runsRepository.findOne({
      where: { id, userId },
      relations: {
        artifacts: true,
        logs: true,
      },
      order: {
        logs: {
          createdAt: 'DESC',
        },
      },
    });
  }

  async getArtifactContent(runId: string, artifactId: string, userId: string) {
    await this.getRunOrFail(runId, userId);
    const artifact = await this.getArtifactOrFail(artifactId, runId);

    if (
      !artifact.mimeType?.includes('json') &&
      !artifact.mimeType?.startsWith('text/')
    ) {
      throw new BadRequestException('Артефакт не является текстовым файлом');
    }

    const absolutePath = this.resolveArtifactPath(artifact.path);

    try {
      await fs.access(absolutePath);
    } catch {
      throw new NotFoundException('Файл артефакта не найден на диске');
    }

    const content = await fs.readFile(absolutePath, 'utf8');

    return {
      artifactId: artifact.id,
      type: artifact.type,
      path: artifact.path,
      mimeType: artifact.mimeType,
      content,
    };
  }

  async updateRun(id: string, dto: UpdateRunDto, userId: string) {
    await this.getRunOrFail(id, userId);
    const displayName = dto.displayName?.trim() || null;

    await this.runsRepository.update(id, { displayName });

    const updatedRun = await this.getRunOrFail(id, userId);

    await this.storageService.writeStatusFile(
      userId,
      updatedRun.slug,
      updatedRun,
    );
    await this.addLog(
      updatedRun.id,
      displayName ? 'Запуск переименован' : 'Название запуска очищено',
      {
        displayName,
      },
    );

    return updatedRun;
  }

  async updateRunPinned(id: string, isPinned: boolean, userId: string) {
    await this.getRunOrFail(id, userId);

    await this.runsRepository.update({ id, userId }, { isPinned });

    const updatedRun = await this.getRunOrFail(id, userId);
    await this.storageService.writeStatusFile(
      userId,
      updatedRun.slug,
      updatedRun,
    );
    await this.addLog(
      updatedRun.id,
      isPinned ? 'Запуск закреплён' : 'Запуск откреплён',
      { isPinned },
    );

    return updatedRun;
  }

  async deleteRun(id: string, userId: string) {
    const run = await this.getRunOrFail(id, userId);
    const runPath = this.storageService.getRunPath(userId, run.slug);
    const generatedRoot = this.storageService.getGeneratedRootPath();

    if (!runPath.startsWith(generatedRoot)) {
      throw new BadRequestException(
        'Папка запуска находится вне директории generated',
      );
    }

    await this.runsRepository.remove(run);
    await this.deleteRunDirectory(runPath);

    return { id, deleted: true };
  }

  private async deleteRunDirectory(runPath: string): Promise<void> {
    try {
      await fs.rm(runPath, { recursive: true, force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EBUSY') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
          await fs.rm(runPath, { recursive: true, force: true });
        } catch (retryError) {
          this.logger.warn(
            `Failed to delete directory after retry: ${runPath}`,
            retryError,
          );
        }
      } else {
        throw error;
      }
    }
  }

  async getCodeFiles(
    runId: string,
    userId: string,
  ): Promise<{ path: string; size: number }[]> {
    const run = await this.getRunOrFail(runId, userId);
    const codePath = path.join(
      this.storageService.getRunPath(userId, run.slug),
      'code',
    );

    try {
      await fs.access(codePath);
    } catch {
      throw new NotFoundException('Код проекта не найден');
    }

    const result: { path: string; size: number }[] = [];

    async function walk(dir: string, prefix: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          await walk(path.join(dir, entry.name), rel);
        } else {
          const stat = await fs.stat(path.join(dir, entry.name));
          result.push({ path: rel, size: stat.size });
        }
      }
    }

    await walk(codePath, '');
    return result;
  }

  async getCodeFileContent(
    runId: string,
    filePath: string,
    userId: string,
  ): Promise<{ path: string; content: string; mimeType: string }> {
    const run = await this.getRunOrFail(runId, userId);
    const codePath = path.join(
      this.storageService.getRunPath(userId, run.slug),
      'code',
    );
    const absolutePath = path.resolve(codePath, filePath);

    if (!absolutePath.startsWith(codePath)) {
      throw new BadRequestException('Путь файла находится вне папки проекта');
    }

    let content: string;
    try {
      content = await fs.readFile(absolutePath, 'utf8');
    } catch {
      throw new NotFoundException('Файл не найден');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.ts': 'text/typescript',
      '.tsx': 'text/typescript',
      '.js': 'text/javascript',
      '.jsx': 'text/javascript',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css',
      '.scss': 'text/scss',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
    };
    const mimeType = mimeMap[ext] ?? 'text/plain';

    return { path: filePath, content, mimeType };
  }

  async downloadCode(runId: string, userId: string): Promise<Buffer> {
    const run = await this.getRunOrFail(runId, userId);
    const codePath = path.join(
      this.storageService.getRunPath(userId, run.slug),
      'code',
    );

    try {
      await fs.access(codePath);
    } catch {
      throw new NotFoundException('Код проекта не найден');
    }

    const zip = new AdmZip();
    zip.addLocalFolder(codePath, 'frontend-project');

    return zip.toBuffer();
  }

  async rebuildRun(
    runId: string,
    userId: string,
  ): Promise<{ id: string; status: string }> {
    const run = await this.getRunOrFail(runId, userId);

    await this.addLog(run.id, 'Запущена ручная пересборка');

    void this.pipelineService.rebuildRun(run, userId);

    return {
      id: run.id,
      status: run.status,
    };
  }

  async restartCurrentStep(
    runId: string,
    userId: string,
  ): Promise<{ id: string; status: string }> {
    const run = await this.getRunOrFail(runId, userId);
    const step = this.getRestartableStep(run.status);

    if (!step) {
      throw new BadRequestException(
        'Перезапустить можно только текущий шаг, который ожидает подтверждения',
      );
    }

    await this.addLog(run.id, `Запрошен перезапуск текущего шага "${step}"`);

    await this.pipelineService.restartStep(run, step, userId);

    return {
      id: run.id,
      status: RunStatus.Running,
    };
  }

  async getArtifactFile(runId: string, artifactId: string, userId: string) {
    await this.getRunOrFail(runId, userId);
    const artifact = await this.getArtifactOrFail(artifactId, runId);

    if (!artifact.mimeType?.startsWith('image/')) {
      throw new BadRequestException('Артефакт не является изображением');
    }

    const absolutePath = this.resolveArtifactPath(artifact.path);

    try {
      await fs.access(absolutePath);
    } catch {
      throw new NotFoundException('Файл артефакта не найден на диске');
    }

    return {
      absolutePath,
      mimeType: artifact.mimeType,
    };
  }

  private async getArtifactOrFail(
    artifactId: string,
    runId: string,
  ): Promise<RunArtifactEntity> {
    const artifact = await this.artifactsRepository.findOne({
      where: { id: artifactId, runId },
      relations: { run: true },
    });

    if (!artifact) {
      throw new NotFoundException('Артефакт не найден');
    }

    return artifact;
  }

  private resolveArtifactPath(artifactPath: string): string {
    return path.join(this.storageService.getGeneratedRootPath(), artifactPath);
  }

  private async getNextRunNumber(userId: string): Promise<number> {
    const lastRun = await this.runsRepository.findOne({
      where: { userId },
      order: {
        runNumber: 'DESC',
      },
    });

    return (lastRun?.runNumber ?? 0) + 1;
  }

  private async getRunOrFail(id: string, userId: string): Promise<RunEntity> {
    const run = await this.getRun(id, userId);

    if (!run) {
      throw new NotFoundException('Запуск не найден');
    }

    return run;
  }

  private async addLog(
    runId: string,
    message: string,
    metadata: Record<string, unknown> | null = null,
  ): Promise<void> {
    await this.logsRepository.save({
      runId,
      level: RunLogLevel.Info,
      message,
      metadata,
    });
  }

  async approveStep(
    runId: string,
    step: 'spec' | 'design' | 'reference' | 'code' | 'final',
    userId: string,
  ): Promise<{ id: string; status: string }> {
    const run = await this.getRunOrFail(runId, userId);

    const stepToStatusMap: Record<typeof step, RunStatus> = {
      spec: RunStatus.AwaitingDesignApproval,
      design: RunStatus.AwaitingReferenceApproval,
      reference: RunStatus.AwaitingCodeApproval,
      code: RunStatus.AwaitingFinalApproval,
      final: RunStatus.Completed,
    };

    const nextStatus = stepToStatusMap[step];
    await this.runsRepository.update(runId, { status: nextStatus });
    await this.addLog(run.id, `Шаг "${step}" подтверждён`);

    if (step !== 'final') {
      void this.pipelineService.resumeRun(run, userId);
    }

    const updatedRun = await this.getRunOrFail(runId, userId);
    return { id: updatedRun.id, status: updatedRun.status };
  }

  async requestEdit(
    runId: string,
    step: 'spec' | 'design' | 'reference' | 'code' | 'final',
    instruction: string,
    userId: string,
  ): Promise<{ id: string; status: string }> {
    const run = await this.getRunOrFail(runId, userId);

    await this.addLog(
      run.id,
      `Запрос правки для шага "${step}": ${instruction}`,
      {
        instruction,
      },
    );

    void this.pipelineService.regenerateStep(run, step, instruction, userId);

    return { id: run.id, status: run.status };
  }

  private getRestartableStep(
    status: RunStatus,
  ): 'spec' | 'design' | 'reference' | 'code' | null {
    const statusToStep: Partial<
      Record<RunStatus, 'spec' | 'design' | 'reference' | 'code'>
    > = {
      [RunStatus.AwaitingSpecApproval]: 'spec',
      [RunStatus.AwaitingDesignApproval]: 'design',
      [RunStatus.AwaitingReferenceApproval]: 'reference',
      [RunStatus.AwaitingCodeApproval]: 'code',
    };

    return statusToStep[status] ?? null;
  }
}
