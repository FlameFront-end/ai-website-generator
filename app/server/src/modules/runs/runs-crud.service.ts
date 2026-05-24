import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'node:fs';
import { DataSource, Repository } from 'typeorm';

import { RunEntity, RunLogEntity, RunStatus } from '../../db/entities';
import { StorageService } from '../storage/storage.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { RunLogService } from './run-log.service';
import type { CreateRunDto } from './dto/create-run.dto';
import type { UpdateRunDto } from './dto/update-run.dto';

const RUN_NUMBER_PAD = 3;
const RUNNING_STEP_TIMEOUT_MS = 20 * 60 * 1000;

function toRunSlug(runNumber: number): string {
  return `run-${String(runNumber).padStart(RUN_NUMBER_PAD, '0')}`;
}

@Injectable()
export class RunsCrudService {
  private readonly logger = new Logger(RunsCrudService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(RunEntity)
    private readonly runsRepository: Repository<RunEntity>,
    @InjectRepository(RunLogEntity)
    private readonly logsRepository: Repository<RunLogEntity>,
    private readonly storageService: StorageService,
    private readonly pipelineService: PipelineService,
    private readonly runLogService: RunLogService,
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
    await this.addLog(run.id, 'Run queued', {
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
      `Project renamed: ${displayName ?? '(untitled)'}`,
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
    await this.addLog(updatedRun.id, isPinned ? 'Run pinned' : 'Run unpinned', {
      isPinned,
    });

    return updatedRun;
  }

  async deleteRun(id: string, userId: string) {
    const run = await this.getRunOrFail(id, userId);
    const runPath = this.storageService.getRunPath(userId, run.id);
    const generatedRoot = this.storageService.getGeneratedRootPath();

    if (!runPath.startsWith(generatedRoot)) {
      throw new NotFoundException(
        'Run directory is outside the generated root',
      );
    }

    await this.runsRepository.remove(run);
    await this.deleteRunDirectory(runPath);

    return { id, deleted: true };
  }

  async getRunOrFail(id: string, userId: string): Promise<RunEntity> {
    const run = await this.getRun(id, userId);

    if (!run) {
      throw new NotFoundException('Run not found');
    }

    return run;
  }

  async addLog(
    runId: string,
    message: string,
    metadata: Record<string, unknown> | null = null,
  ): Promise<void> {
    await this.runLogService.addLog(runId, message, metadata);
  }

  async markRunStopped(run: RunEntity, message: string): Promise<void> {
    await this.runsRepository.update(run.id, {
      status: RunStatus.Failed,
      currentStep: run.currentStep || 'pipeline_failed',
      errorMessage: `PIPELINE_STOPPED: ${message}`,
    });

    await this.addLog(run.id, message, {
      currentStep: run.currentStep,
    });
  }

  // ===================== Private helpers =====================

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
      'Step timed out and was automatically stopped',
    );
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
}
