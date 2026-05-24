import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'node:child_process';
import { createServer } from 'node:net';
import { promises as fs } from 'node:fs';
import { promisify } from 'node:util';
import path from 'node:path';
import { chromium } from 'playwright';
import type { Page } from 'playwright';

import { ArtifactType, RunEntity, RunStatus } from '../../db/entities';
import { StorageService } from '../storage/storage.service';
import { PipelineStateService } from './pipeline-state.service';

const SERVER_STARTUP_TIMEOUT_MS = 45_000;
const SERVER_POLL_INTERVAL_MS = 500;
const PAGE_LOAD_TIMEOUT_MS = 60_000;
const PAGE_SETTLE_DELAY_MS = 1000;
const execAsync = promisify(exec);

@Injectable()
export class ScreenshotService {
  private readonly logger = new Logger(ScreenshotService.name);

  constructor(
    private readonly state: PipelineStateService,
    private readonly storageService: StorageService,
  ) {}

  async takeScreenshots(
    run: RunEntity,
    slug: string,
    userId: string,
  ): Promise<RunEntity> {
    const screenshotRun = await this.state.updateRunStatus(
      run,
      RunStatus.Running,
      'take_screenshots',
      userId,
    );
    await this.state.addLog(run.id, 'Preparing result screenshots');

    const runPath = this.storageService.getRunPath(userId, slug);
    const codePath = path.join(runPath, 'code');
    const screenshotsPath = path.join(runPath, 'screenshots');
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    let serverProcess: ReturnType<typeof exec> | undefined;

    try {
      await fs.mkdir(screenshotsPath, { recursive: true });

      const previewPort = await this.findAvailablePort();
      const previewUrl = `http://127.0.0.1:${previewPort}`;

      await this.state.addLog(run.id, 'Starting website preview');
      serverProcess = exec('npm run start', {
        cwd: codePath,
        env: {
          ...process.env,
          PORT: String(previewPort),
          HOSTNAME: '127.0.0.1',
          NEXT_TELEMETRY_DISABLED: '1',
        },
      });

      await this.waitForServer(previewUrl);

      await this.state.addLog(run.id, 'Capturing page screenshots');
      browser = await chromium.launch();
      const page = await browser.newPage();
      page.setDefaultTimeout(PAGE_LOAD_TIMEOUT_MS);
      page.setDefaultNavigationTimeout(PAGE_LOAD_TIMEOUT_MS);

      await page.setViewportSize({ width: 1440, height: 900 });
      await this.gotoReadyPage(page, previewUrl);
      await page.screenshot({
        path: path.join(screenshotsPath, 'rendered-desktop.png'),
        fullPage: false,
      });
      await this.state.addLog(run.id, 'Desktop screenshot ready');

      await page.setViewportSize({ width: 390, height: 844 });
      await this.gotoReadyPage(page, previewUrl);
      await page.screenshot({
        path: path.join(screenshotsPath, 'rendered-mobile.png'),
        fullPage: false,
      });
      await this.state.addLog(run.id, 'Mobile screenshot ready');

      const desktopRelativePath = this.state.getRunRelativePath(
        userId,
        slug,
        'screenshots',
        'rendered-desktop.png',
      );
      const mobileRelativePath = this.state.getRunRelativePath(
        userId,
        slug,
        'screenshots',
        'rendered-mobile.png',
      );

      await this.state.saveArtifact(
        screenshotRun.id,
        ArtifactType.DesktopScreenshot,
        desktopRelativePath,
        'image/png',
      );
      await this.state.saveArtifact(
        screenshotRun.id,
        ArtifactType.MobileScreenshot,
        mobileRelativePath,
        'image/png',
      );

      return this.state.updateRunStatus(
        screenshotRun,
        RunStatus.Running,
        'screenshots_ready',
        userId,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Screenshot capture failed: ${message}`);
      await this.state.addLog(run.id, 'Failed to capture screenshots', {
        error: message,
      });

      return this.state.updateRunStatus(
        screenshotRun,
        RunStatus.Failed,
        'screenshots_failed',
        userId,
      );
    } finally {
      if (browser) await browser.close().catch(() => undefined);
      if (serverProcess?.pid) {
        await this.killProcessTree(serverProcess.pid);
      }
    }
  }

  private findAvailablePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = createServer();

      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        server.close(() => {
          if (address && typeof address === 'object') {
            resolve(address.port);
            return;
          }

          reject(
            new Error(
              'Failed to find an available port for the preview server',
            ),
          );
        });
      });
    });
  }

  private async waitForServer(url: string): Promise<void> {
    const startedAt = Date.now();
    let lastError = '';

    while (Date.now() - startedAt < SERVER_STARTUP_TIMEOUT_MS) {
      try {
        const response = await fetch(url, { method: 'HEAD' });

        if (response.ok || response.status < 500) {
          return;
        }

        lastError = `${response.status} ${response.statusText}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }

      await this.state.sleep(SERVER_POLL_INTERVAL_MS);
    }

    throw new Error(
      `Preview server did not become ready in ${SERVER_STARTUP_TIMEOUT_MS}ms: ${lastError}`,
    );
  }

  private async gotoReadyPage(page: Page, url: string): Promise<void> {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });
    await page.waitForLoadState('load', { timeout: PAGE_LOAD_TIMEOUT_MS });
    await page.waitForTimeout(PAGE_SETTLE_DELAY_MS);
  }

  private async killProcessTree(pid: number): Promise<void> {
    try {
      if (process.platform === 'win32') {
        await execAsync(`taskkill /PID ${pid} /T /F`);
        return;
      }

      process.kill(-pid, 'SIGTERM');
    } catch {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        // Process is already gone.
      }
    }
  }
}
