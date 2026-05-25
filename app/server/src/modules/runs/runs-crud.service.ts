import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'node:fs';
import { DataSource, Repository } from 'typeorm';

import { ArtifactType, RunStatus } from '../../common/enums';
import { RunEntity, RunLogEntity } from '../../db/entities';
import { StorageService } from '../storage/storage.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { RunLogService } from './run-log.service';
import type { CreateRunDto } from './dto/create-run.dto';
import type { UpdateRunDto } from './dto/update-run.dto';

const RUN_NUMBER_PAD = 3;
const RUNNING_STEP_TIMEOUT_MS = 20 * 60 * 1000;
const STALE_CHECK_INTERVAL_MS = 60_000;

const INTERNAL_ARTIFACT_TYPES = new Set<ArtifactType>([
  ArtifactType.CodePlan,
  ArtifactType.CodeContentModule,
  ArtifactType.CodeLayoutModule,
  ArtifactType.CodeSectionsModule,
  ArtifactType.ReferenceContextSummary,
]);

function toRunSlug(runNumber: number): string {
  return `run-${String(runNumber).padStart(RUN_NUMBER_PAD, '0')}`;
}

@Injectable()
export class RunsCrudService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RunsCrudService.name);
  private staleCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(RunEntity)
    private readonly runsRepository: Repository<RunEntity>,
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
      },
      order: {
        isPinned: 'DESC',
        createdAt: 'DESC',
      },
      take: 25,
    });
    for (const run of runs) {
      run.logs = [];
      run.artifacts = run.artifacts.filter(
        (a) => !INTERNAL_ARTIFACT_TYPES.has(a.type),
      );
    }
    return runs;
  }

  async getRunStatus(
    id: string,
    userId: string,
  ): Promise<{
    id: string;
    status: RunStatus;
    currentStep: string | null;
    updatedAt: Date;
  } | null> {
    const run = await this.runsRepository.findOne({
      where: { id, userId },
      select: ['id', 'status', 'currentStep', 'updatedAt'],
    });
    if (!run) return null;
    return {
      id: run.id,
      status: run.status,
      currentStep: run.currentStep,
      updatedAt: run.updatedAt,
    };
  }

  async getRun(id: string, userId: string): Promise<RunEntity | null> {
    const run = await this.runsRepository.findOne({
      where: { id, userId },
      relations: {
        artifacts: true,
      },
    });
    if (run) {
      run.artifacts = run.artifacts.filter(
        (a) => !INTERNAL_ARTIFACT_TYPES.has(a.type),
      );
      run.logs = [];
    }
    return run;
  }

  async getRunLogs(
    id: string,
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{ items: RunLogEntity[]; total: number }> {
    await this.getRunLightOrFail(id, userId);
    return this.runLogService.getLogs(id, limit, offset);
  }

  async updateRun(id: string, dto: UpdateRunDto, userId: string) {
    await this.getRunLightOrFail(id, userId);
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
    await this.getRunLightOrFail(id, userId);

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
    const run = await this.getRunLightOrFail(id, userId);
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

  async getRunLight(id: string, userId: string): Promise<RunEntity | null> {
    return this.runsRepository.findOne({
      where: { id, userId },
    });
  }

  async getRunLightOrFail(id: string, userId: string): Promise<RunEntity> {
    const run = await this.getRunLight(id, userId);

    if (!run) {
      throw new NotFoundException('Run not found');
    }

    return run;
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

  // ===================== Lifecycle =====================

  onModuleInit() {
    this.staleCheckTimer = setInterval(() => {
      void this.failStaleRuns();
    }, STALE_CHECK_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer);
      this.staleCheckTimer = null;
    }
  }

  // ===================== Private helpers =====================

  private async failStaleRuns(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - RUNNING_STEP_TIMEOUT_MS);
      const staleRuns = await this.runsRepository.find({
        where: { status: RunStatus.Running },
        select: ['id', 'currentStep', 'updatedAt'],
      });

      for (const run of staleRuns) {
        if (new Date(run.updatedAt) < cutoff) {
          const message = 'Step timed out and was automatically stopped';
          await this.markRunStopped(run, message);
          this.logger.warn(`Stale run ${run.id} marked as failed`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to check stale runs', error);
    }
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
