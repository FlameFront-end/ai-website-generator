import { Injectable } from '@nestjs/common';
import { exec } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { RunEntity, RunStatus } from '../../db/entities';
import { StorageService } from '../storage/storage.service';
import { PipelineStateService } from './pipeline-state.service';

const execAsync = promisify(exec);

@Injectable()
export class BuildService {
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
    const buildLogs: string[] = [];

    const addLogLine = (line: string) => {
      buildLogs.push(line);
    };

    try {
      await this.state.addLog(run.id, 'Установка зависимостей...');
      addLogLine(`=== npm install (попытка ${attempt}) ===`);
      addLogLine(`Working directory: ${codePath}`);
      addLogLine('');

      const { stdout: installOut, stderr: installErr } = await execAsync(
        'npm install',
        {
          cwd: codePath,
          timeout: 120000,
        },
      );

      if (installOut) {
        addLogLine('--- stdout ---');
        addLogLine(installOut);
      }
      if (installErr) {
        addLogLine('--- stderr ---');
        addLogLine(installErr);
      }

      await this.state.addLog(run.id, 'Сборка проекта...');
      addLogLine('');
      addLogLine(`=== npm run build (попытка ${attempt}) ===`);

      const { stdout: buildOut, stderr: buildErr } = await execAsync(
        'npm run build',
        {
          cwd: codePath,
          timeout: 120000,
        },
      );

      if (buildOut) {
        addLogLine('--- stdout ---');
        addLogLine(buildOut);
      }
      if (buildErr) {
        addLogLine('--- stderr ---');
        addLogLine(buildErr);
      }

      await this.state.addLog(run.id, 'Сборка завершена успешно');
      return this.state.updateRunStatus(
        buildRun,
        RunStatus.Completed,
        'built',
        userId,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLogLine('');
      addLogLine(`=== ОШИБКА ===`);
      addLogLine(message);
      await this.state.addLog(run.id, 'Ошибка сборки', { error: message });

      if (attempt < 3) {
        await this.state.sleep(2000);
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
