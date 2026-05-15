import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import AdmZip from 'adm-zip';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DataSource, Repository } from 'typeorm';

import {
  ArtifactType,
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
const RUNNING_STEP_TIMEOUT_MS = 20 * 60 * 1000;

function toRunSlug(runNumber: number): string {
  return `run-${String(runNumber).padStart(RUN_NUMBER_PAD, '0')}`;
}

@Injectable()
export class RunsService {
  private readonly logger = new Logger(RunsService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
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
    const displayName = dto.displayName?.trim() || null;
    const run = await this.createQueuedRun({
      brief,
      displayName,
      userId,
    });

    await this.storageService.createRunFolders(userId, run.id);
    await this.storageService.writeStatusFile(userId, run.id, run);
    await this.addLog(run.id, 'Запуск поставлен в очередь', {
      slug: run.slug,
    });

    void this.pipelineService.processRun(run, userId);

    return {
      id: run.id,
      slug: run.slug,
      status: run.status,
    };
  }

  async getRuns(userId: string): Promise<RunEntity[]> {
    const runs = await this.runsRepository.find({
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
    await Promise.all(runs.map((run) => this.failRunIfStale(run)));
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

  async getRun(id: string, userId: string): Promise<RunEntity | null> {
    const run = await this.runsRepository.findOne({
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
    await this.failRunIfStale(run);

    if (run?.status === RunStatus.Running) {
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

    return run;
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
      updatedRun.id,
      updatedRun,
    );
    await this.addLog(
      updatedRun.id,
      `Проект переименован: ${displayName ?? '«Без названия»'}`,
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
      updatedRun.id,
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
    const runPath = this.storageService.getRunPath(userId, run.id);
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
      this.storageService.getRunPath(userId, run.id),
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
      this.storageService.getRunPath(userId, run.id),
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
      this.storageService.getRunPath(userId, run.id),
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

    await this.addLog(run.id, 'Запущена повторная сборка');

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
    const step = await this.getRestartableStep(
      run.status,
      run.currentStep,
      run.id,
    );

    if (!step) {
      throw new BadRequestException(
        'Перезапустить можно только текущий шаг, который ожидает подтверждения',
      );
    }

    await this.addLog(
      run.id,
      `Запрос на перезапуск шага "${this.formatPipelineStep(step)}" принят`,
    );

    await this.pipelineService.restartStep(run, step, userId);

    return {
      id: run.id,
      status: RunStatus.Running,
    };
  }

  async stopCurrentStep(
    runId: string,
    userId: string,
  ): Promise<{ id: string; status: string }> {
    const run = await this.getRunOrFail(runId, userId);

    if (run.status !== RunStatus.Running && run.status !== RunStatus.Queued) {
      throw new BadRequestException('Остановить можно только активный шаг');
    }

    await this.markRunStopped(run, 'Шаг остановлен пользователем');

    return {
      id: run.id,
      status: RunStatus.Failed,
    };
  }
  async restartCodeStep(
    runId: string,
    userId: string,
  ): Promise<{ id: string; status: string }> {
    const run = await this.getRunOrFail(runId, userId);

    if (!this.canRestartCodeStep(run.status)) {
      throw new BadRequestException(
        'Перезапуск генерации кода доступен только после подготовки дизайна или для ошибок сборки/проверки',
      );
    }

    await this.ensureCodeRestartArtifacts(run.id);

    await this.addLog(run.id, 'Запрос на перегенерацию кода принят');
    await this.pipelineService.restartStep(run, 'code', userId);

    return {
      id: run.id,
      status: RunStatus.Running,
    };
  }

  private async ensureCodeRestartArtifacts(runId: string): Promise<void> {
    const requiredTypes: ArtifactType[] = [
      ArtifactType.ProjectSpec,
      ArtifactType.DesignTokens,
      ArtifactType.DesignDescription,
    ];
    const artifacts = await this.artifactsRepository.find({
      where: { runId },
    });
    const types = new Set(artifacts.map((artifact) => artifact.type));
    const missingTypes = requiredTypes.filter((type) => !types.has(type));

    if (missingTypes.length > 0) {
      throw new BadRequestException(
        `Нельзя перезапустить генерацию кода: не найдены артефакты ${missingTypes.join(', ')}`,
      );
    }
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

  private async createQueuedRun({
    brief,
    displayName,
    userId,
  }: {
    brief: string;
    displayName: string | null;
    userId: string;
  }): Promise<RunEntity> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        "SELECT pg_advisory_xact_lock(hashtext('runs:createQueuedRun'))",
      );

      const raw = await manager
        .getRepository(RunEntity)
        .createQueryBuilder('run')
        .select('COALESCE(MAX(run.runNumber), 0)', 'max')
        .getRawOne<{ max: string | number }>();

      const runNumber = Number(raw?.max ?? 0) + 1;
      const slug = toRunSlug(runNumber);

      return manager.getRepository(RunEntity).save({
        runNumber,
        slug,
        displayName,
        brief,
        status: RunStatus.Queued,
        currentStep: 'queued',
        userId,
      } as RunEntity);
    });
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

  private async failRunIfStale(run: RunEntity | null): Promise<void> {
    if (!run || run.status !== RunStatus.Running) {
      return;
    }

    const lastUpdateAt = new Date(run.updatedAt).getTime();
    const isStale = Date.now() - lastUpdateAt > RUNNING_STEP_TIMEOUT_MS;

    if (!isStale) {
      return;
    }

    await this.markRunStopped(
      run,
      'Шаг превысил лимит ожидания и был остановлен автоматически',
    );
  }

  private async markRunStopped(run: RunEntity, message: string): Promise<void> {
    await this.runsRepository.update(run.id, {
      status: RunStatus.Failed,
      currentStep: run.currentStep || 'pipeline_failed',
      errorMessage: `PIPELINE_STOPPED: ${message}`,
    });

    await this.addLog(run.id, message, {
      currentStep: run.currentStep,
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
      reference: RunStatus.Running,
      code: RunStatus.AwaitingFinalApproval,
      final: RunStatus.Completed,
    };

    const nextStatus = stepToStatusMap[step];
    await this.runsRepository.update(runId, {
      status: nextStatus,
      currentStep:
        step === 'reference' ? 'prepare_frontend_project' : run.currentStep,
    });
    await this.addLog(
      run.id,
      `Шаг подтверждён: ${this.formatPipelineStep(step)}`,
    );

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
      `Запрос правки для шага "${this.formatPipelineStep(step)}": ${instruction}`,
      {
        instruction,
      },
    );

    void this.pipelineService.regenerateStep(run, step, instruction, userId);

    return { id: run.id, status: run.status };
  }

  private getRestartableStep(
    status: RunStatus,
    currentStep?: string | null,
    runId?: string,
  ): Promise<'spec' | 'design' | 'reference' | 'code' | null> {
    const statusToStep: Partial<
      Record<RunStatus, 'spec' | 'design' | 'reference' | 'code'>
    > = {
      [RunStatus.AwaitingSpecApproval]: 'spec',
      [RunStatus.AwaitingDesignApproval]: 'design',
      [RunStatus.AwaitingReferenceApproval]: 'reference',
      [RunStatus.AwaitingCodeApproval]: 'code',
    };

    if (statusToStep[status]) {
      return Promise.resolve(statusToStep[status]);
    }

    if (status === RunStatus.Failed) {
      const step = this.getRestartableStepFromCurrentStep(currentStep);
      if (step || !runId) {
        return Promise.resolve(step);
      }
      return this.inferFailedRestartStepFromArtifacts(runId);
    }

    return Promise.resolve(null);
  }

  private getRestartableStepFromCurrentStep(
    currentStep?: string | null,
  ): 'spec' | 'design' | 'reference' | 'code' | null {
    if (!currentStep) return null;
    if (currentStep.includes('spec')) return 'spec';
    if (currentStep.includes('design')) return 'design';
    if (currentStep.includes('reference')) return 'reference';
    if (
      currentStep.includes('code') ||
      currentStep.includes('frontend') ||
      currentStep.includes('build') ||
      currentStep.includes('screenshot') ||
      currentStep.includes('visual')
    ) {
      return 'code';
    }
    return null;
  }

  private async inferFailedRestartStepFromArtifacts(
    runId: string,
  ): Promise<'spec' | 'design' | 'reference' | 'code'> {
    const artifacts = await this.artifactsRepository.find({
      where: { runId },
    });
    const types = new Set(artifacts.map((artifact) => artifact.type));

    if (!types.has(ArtifactType.ProjectSpec)) return 'spec';
    if (
      !types.has(ArtifactType.DesignTokens) ||
      !types.has(ArtifactType.DesignDescription)
    ) {
      return 'design';
    }
    if (!types.has(ArtifactType.ReferenceImage)) return 'reference';
    return 'code';
  }

  private canRestartCodeStep(status: RunStatus): boolean {
    return [
      RunStatus.AwaitingCodeApproval,
      RunStatus.AwaitingFinalApproval,
      RunStatus.BuildFailed,
      RunStatus.VisualFailed,
      RunStatus.NeedsManualReview,
      RunStatus.Failed,
      RunStatus.Completed,
    ].includes(status);
  }

  private formatPipelineStep(step: string): string {
    const labels: Record<string, string> = {
      spec: 'Спецификация',
      design: 'Дизайн',
      reference: 'Референс',
      code: 'Код',
      final: 'Финальная проверка',
    };

    return labels[step] ?? step;
  }
}
