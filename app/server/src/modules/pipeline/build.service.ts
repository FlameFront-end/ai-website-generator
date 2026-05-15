import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { RunEntity, RunStatus } from '../../db/entities';
import { StorageService } from '../storage/storage.service';
import { PipelineStateService } from './pipeline-state.service';

const execAsync = promisify(exec);
const BUILD_TIMEOUT_MS = 120_000;

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
    const result = await this.buildProjectOnce(run, slug, userId, attempt);
    return result.run;
  }

  async buildProjectOnce(
    run: RunEntity,
    slug: string,
    userId: string,
    attempt = 1,
  ): Promise<{ run: RunEntity; error?: string }> {
    const buildRun = await this.state.updateRunStatus(
      run,
      RunStatus.Running,
      'build_project',
      userId,
    );
    await this.state.addLog(run.id, `Проверка сборки: попытка ${attempt}`);

    const codePath = path.join(
      this.storageService.getRunPath(userId, slug),
      'code',
    );

    try {
      await this.state.addLog(run.id, 'Устанавливаем зависимости');
      await execAsync('npm install --include=dev', {
        cwd: codePath,
        timeout: BUILD_TIMEOUT_MS,
      });

      await this.state.addLog(run.id, 'Проверяем production-сборку');
      await execAsync('npm run build', {
        cwd: codePath,
        timeout: BUILD_TIMEOUT_MS,
      });

      await this.state.addLog(run.id, 'Сборка прошла успешно');
      const updatedRun = await this.state.updateRunStatus(
        buildRun,
        RunStatus.Completed,
        'built',
        userId,
      );
      return { run: updatedRun };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Build failed (attempt ${attempt}): ${message}`);
      await this.state.addLog(run.id, 'Сборка завершилась ошибкой', {
        error: message,
      });

      const updatedRun = await this.state.updateRunStatus(
        buildRun,
        RunStatus.BuildFailed,
        'build_failed',
        userId,
      );
      return { run: updatedRun, error: message };
    }
  }
}
