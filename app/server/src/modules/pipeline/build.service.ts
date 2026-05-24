import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { RunStatus } from '../../common/enums';
import { RunEntity } from '../../db/entities';
import { extractErrorMessage } from '../../common/utils';
import { StorageService } from '../storage/storage.service';
import { PipelineStateService } from './pipeline-state.service';

const execAsync = promisify(exec);
const BUILD_TIMEOUT_MS = 120_000;
const BUILD_MAX_MEMORY_MB = 512;

/**
 * Sensitive env-var prefixes/names stripped from child-process environment
 * to prevent generated code from exfiltrating credentials.
 */
const SENSITIVE_ENV_PATTERNS: RegExp[] = [
  /^DATABASE_URL$/i,
  /^POSTGRES_/i,
  /^DB_/i,
  /^JWT_/i,
  /^AI_.*_API_KEY$/i,
  /^AI_.*_BASE_URL$/i,
  /^SECRET/i,
  /^TOKEN/i,
];

function buildSandboxedEnv(): NodeJS.ProcessEnv {
  const sanitized: NodeJS.ProcessEnv = {};

  for (const [key, value] of Object.entries(process.env)) {
    const isSensitive = SENSITIVE_ENV_PATTERNS.some((pattern) =>
      pattern.test(key),
    );
    if (!isSensitive) {
      sanitized[key] = value;
    }
  }

  sanitized['NODE_OPTIONS'] = `--max-old-space-size=${BUILD_MAX_MEMORY_MB}`;

  return sanitized;
}

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
    await this.state.addLog(run.id, `Build check: attempt ${attempt}`);

    const codePath = path.join(
      this.storageService.getRunPath(userId, slug),
      'code',
    );

    try {
      await this.state.addLog(run.id, 'Installing dependencies');
      await execAsync(
        'npm install --include=dev --ignore-scripts --no-optional',
        {
          cwd: codePath,
          timeout: BUILD_TIMEOUT_MS,
          env: buildSandboxedEnv(),
        },
      );

      await this.state.addLog(run.id, 'Running production build');
      await execAsync('npm run build', {
        cwd: codePath,
        timeout: BUILD_TIMEOUT_MS,
        env: buildSandboxedEnv(),
      });

      await this.state.addLog(run.id, 'Build succeeded');
      const updatedRun = await this.state.updateRunStatus(
        buildRun,
        RunStatus.Completed,
        'built',
        userId,
      );
      return { run: updatedRun };
    } catch (error) {
      const message = extractErrorMessage(error);
      this.logger.warn(`Build failed (attempt ${attempt}): ${message}`);
      await this.state.addLog(run.id, 'Build failed', {
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
