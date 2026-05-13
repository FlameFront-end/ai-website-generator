import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { RunEntity, RunStatus } from '../../db/entities';
import { StorageService } from '../storage/storage.service';
import { PipelineStateService } from './pipeline-state.service';

const execAsync = promisify(exec);
const BUILD_TIMEOUT_MS = 120_000;
const MAX_BUILD_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

@Injectable()
export class BuildService {
  private readonly logger = new Logger(BuildService.name);

  constructor(
    private readonly state: PipelineStateService,
    private readonly storageService: StorageService,
  ) {}

  async buildProject(
    run: RunEntity,
    slug: string,
    userId: string,
    attempt = 1,
  ): Promise<RunEntity> {
    const buildRun = await this.state.updateRunStatus(
      run,
      RunStatus.Running,
      'build_project',
      userId,
    );
    await this.state.addLog(run.id, `Попытка сборки ${attempt}`);

    const codePath = path.join(
      this.storageService.getRunPath(userId, slug),
      'code',
    );

    try {
      await this.state.addLog(run.id, 'Установка зависимостей...');
      await execAsync('npm install --include=dev', {
        cwd: codePath,
        timeout: BUILD_TIMEOUT_MS,
      });

      await this.state.addLog(run.id, 'Сборка проекта...');
      await execAsync('npm run build', {
        cwd: codePath,
        timeout: BUILD_TIMEOUT_MS,
      });

      await this.state.addLog(run.id, 'Сборка завершена успешно');
      return this.state.updateRunStatus(
        buildRun,
        RunStatus.Completed,
        'built',
        userId,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Build failed (attempt ${attempt}): ${message}`);
      await this.state.addLog(run.id, 'Ошибка сборки', { error: message });

      if (attempt < MAX_BUILD_ATTEMPTS) {
        await this.state.sleep(RETRY_DELAY_MS);
        return this.buildProject(run, slug, userId, attempt + 1);
      }

      return this.state.updateRunStatus(
        buildRun,
        RunStatus.BuildFailed,
        'build_failed',
        userId,
      );
    }
  }
}
