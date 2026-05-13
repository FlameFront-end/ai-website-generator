import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Repository } from 'typeorm';

import {
  ArtifactType,
  RunArtifactEntity,
  RunEntity,
  RunLogEntity,
  RunLogLevel,
  RunStatus,
} from '../../db/entities';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class PipelineStateService {
  private readonly logger = new Logger(PipelineStateService.name);

  constructor(
    @InjectRepository(RunEntity)
    private readonly runsRepository: Repository<RunEntity>,
    @InjectRepository(RunArtifactEntity)
    private readonly artifactsRepository: Repository<RunArtifactEntity>,
    @InjectRepository(RunLogEntity)
    private readonly logsRepository: Repository<RunLogEntity>,
    private readonly storageService: StorageService,
  ) {}

  getRunAbsolutePath(
    userId: string,
    slug: string,
    ...segments: string[]
  ): string {
    return path.join(this.storageService.getRunPath(userId, slug), ...segments);
  }

  getRunRelativePath(
    userId: string,
    slug: string,
    ...segments: string[]
  ): string {
    return this.storageService.getRunRelativePath(userId, slug, ...segments);
  }

  async writeGeneratedFile(
    absolutePath: string,
    content: string | Buffer,
  ): Promise<void> {
    const dir = path.dirname(absolutePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(absolutePath, content);
    this.logger.debug(
      `File written: ${absolutePath} (${Buffer.byteLength(content)} bytes)`,
    );
  }

  async saveArtifact(
    runId: string,
    type: ArtifactType,
    relativePath: string,
    mimeType: string,
  ): Promise<void> {
    await this.artifactsRepository.save({
      runId,
      type,
      path: relativePath,
      mimeType,
    });
  }

  async updateRunStatus(
    run: RunEntity,
    status: RunStatus,
    currentStep: string,
    userId: string,
  ): Promise<RunEntity> {
    await this.runsRepository.update(run.id, {
      status,
      currentStep,
      errorMessage: null,
    });

    const updatedRun = await this.runsRepository.findOne({
      where: { id: run.id },
    });

    if (updatedRun) {
      await this.storageService.writeStatusFile(userId, run.slug, updatedRun);
    }

    return updatedRun || run;
  }

  async addLog(
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

  async failRun(run: RunEntity, message: string): Promise<void> {
    await this.runsRepository.update(run.id, {
      status: RunStatus.Failed,
      currentStep: 'pipeline_failed',
      errorMessage: message,
    });
    await this.addLog(run.id, 'Процесс остановлен из-за ошибки', {
      error: message,
    });
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

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getArtifactByType(
    runId: string,
    type: ArtifactType,
  ): Promise<RunArtifactEntity | null> {
    return this.artifactsRepository.findOne({
      where: { runId, type },
    });
  }

  async readArtifactFile(relativePath: string): Promise<string> {
    const absolutePath = path.resolve(
      this.storageService.getGeneratedRootPath(),
      relativePath,
    );
    return fs.readFile(absolutePath, 'utf8');
  }

  getArtifactAbsolutePath(relativePath: string): string {
    return path.resolve(this.storageService.getGeneratedRootPath(), relativePath);
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

  async updateArtifact(
    runId: string,
    type: ArtifactType,
    relativePath: string,
    mimeType?: string,
  ): Promise<void> {
    const result = await this.artifactsRepository.update(
      { runId, type },
      { path: relativePath, ...(mimeType ? { mimeType } : {}) },
    );

    if (!result.affected) {
      await this.saveArtifact(
        runId,
        type,
        relativePath,
        mimeType ?? 'application/octet-stream',
      );
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
