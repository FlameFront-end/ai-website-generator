import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RunStatus } from '../../common/enums';
import { RunEntity } from '../../db/entities';
import { RunLogService } from '../runs/run-log.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class PipelineStateService {
  constructor(
    @InjectRepository(RunEntity)
    private readonly runsRepository: Repository<RunEntity>,
    private readonly runLogService: RunLogService,
    private readonly storageService: StorageService,
  ) {}

  async touchRun(runId: string): Promise<void> {
    await this.runsRepository.update(runId, { updatedAt: new Date() });
  }

  async updateRunStatus(
    run: RunEntity,
    status: RunStatus,
    currentStep: string,
    userId: string,
  ): Promise<RunEntity> {
    const existingRun = await this.runsRepository.findOne({
      where: { id: run.id },
    });

    if (
      existingRun?.status === RunStatus.Failed &&
      existingRun.errorMessage?.startsWith('PIPELINE_STOPPED:') &&
      run.status !== RunStatus.Failed
    ) {
      return existingRun;
    }

    await this.runsRepository.update(run.id, {
      status,
      currentStep,
      errorMessage: null,
    });

    const updatedRun = await this.runsRepository.findOne({
      where: { id: run.id },
    });

    if (updatedRun) {
      await this.storageService.writeStatusFile(userId, run.id, updatedRun);
    }

    return updatedRun || run;
  }

  async addLog(
    runId: string,
    message: string,
    metadata: Record<string, unknown> | null = null,
  ): Promise<void> {
    await this.runLogService.addLog(runId, message, metadata);
  }

  async failRun(run: RunEntity, message: string): Promise<void> {
    await this.runsRepository.update(run.id, {
      status: RunStatus.Failed,
      currentStep: run.currentStep || 'pipeline_failed',
      errorMessage: message,
    });
    await this.addLog(run.id, 'Pipeline stopped due to an error', {
      error: message,
    });
  }

  async stopRunById(runId: string, reason: string): Promise<void> {
    await this.runsRepository.update(runId, {
      status: RunStatus.Failed,
      errorMessage: `PIPELINE_STOPPED: ${reason}`,
    });
    await this.addLog(runId, `Pipeline stopped: ${reason}`);
  }

  async completeRun(
    qaRun: RunEntity,
    score: number,
    userId: string,
    slug: string,
  ): Promise<RunEntity> {
    const updatedRun = await this.runsRepository.save({
      ...qaRun,
      status: RunStatus.Completed,
      currentStep: 'completed',
      score,
    });
    await this.storageService.writeStatusFile(userId, slug, updatedRun);
    return updatedRun;
  }

  async getRun(runId: string): Promise<RunEntity | null> {
    return this.runsRepository.findOne({
      where: { id: runId },
    });
  }

  async updateRun(
    run: RunEntity,
    updates: Partial<
      Pick<
        RunEntity,
        | 'brief'
        | 'displayName'
        | 'status'
        | 'currentStep'
        | 'errorMessage'
        | 'score'
      >
    >,
  ): Promise<RunEntity> {
    await this.runsRepository.update(run.id, updates);
    const updatedRun = await this.runsRepository.findOne({
      where: { id: run.id },
    });
    return updatedRun || run;
  }
}
