import { Injectable } from '@nestjs/common';
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
    return path.resolve(
      this.storageService.getGeneratedRootPath(),
      userId,
      'runs',
      slug,
      ...segments,
    );
  }

  getRunRelativePath(
    userId: string,
    slug: string,
    ...segments: string[]
  ): string {
    return path.join(userId, 'runs', slug, ...segments).replaceAll('\\', '/');
  }

  async writeGeneratedFile(
    absolutePath: string,
    content: string | Buffer,
  ): Promise<void> {
    try {
      const dir = path.dirname(absolutePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(absolutePath, content);
      const size = Buffer.byteLength(content);
      await this.log(`File written: ${absolutePath} (${size} bytes)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.log(
        `Failed to write file: ${absolutePath} - ${message}`,
        'error',
      );
      throw error;
    }
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
    await this.addLog(run.id, 'Пайплайн завершился ошибкой', {
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

  async getRun(runId: string): Promise<RunEntity | null> {
    return this.runsRepository.findOne({
      where: { id: runId },
    });
  }

  async updateRun(
    run: RunEntity,
    updates: Partial<RunEntity>,
  ): Promise<RunEntity> {
    const { brief, displayName, status, currentStep, errorMessage, score } =
      updates;
    await this.runsRepository.update(run.id, {
      ...(brief !== undefined && { brief }),
      ...(displayName !== undefined && { displayName }),
      ...(status !== undefined && { status }),
      ...(currentStep !== undefined && { currentStep }),
      ...(errorMessage !== undefined && { errorMessage }),
      ...(score !== undefined && { score }),
    });
    const updatedRun = await this.runsRepository.findOne({
      where: { id: run.id },
    });
    return updatedRun || run;
  }

  async updateArtifact(
    runId: string,
    type: ArtifactType,
    relativePath: string,
  ): Promise<void> {
    await this.artifactsRepository.update(
      { runId, type },
      { path: relativePath },
    );
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async log(
    message: string,
    type: 'info' | 'error' = 'info',
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : '✅';
    const logMessage = `[${timestamp}] ${prefix} ${message}\n`;

    if (type === 'error') {
      console.error(logMessage.trim());
    } else {
      console.log(logMessage.trim());
    }

    await fs
      .appendFile(
        path.resolve(process.cwd(), '..', '..', 'file-operations.log'),
        logMessage,
      )
      .catch(() => {}); // Ignore log file errors
  }
}
