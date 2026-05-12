import { Injectable } from '@nestjs/common';
import { exec } from 'node:child_process';
import path from 'node:path';
import { chromium } from 'playwright';

import { ArtifactType, RunEntity, RunStatus } from '../../db/entities';
import { StorageService } from '../storage/storage.service';
import { PipelineStateService } from './pipeline-state.service';

@Injectable()
export class ScreenshotService {
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
    await this.state.addLog(run.id, 'Начато создание скриншотов');

    const runPath = this.storageService.getRunPath(userId, slug);
    const codePath = path.join(runPath, 'code');
    const screenshotsPath = path.join(runPath, 'screenshots');
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    let serverProcess: ReturnType<typeof exec> | undefined;

    try {
      await this.state.addLog(run.id, 'Запуск preview сервера...');
      serverProcess = exec('npm run preview', {
        cwd: codePath,
        env: { ...process.env, PORT: '4173' },
      });

      await this.state.sleep(5000);

      await this.state.addLog(
        run.id,
        'Создание скриншотов через Playwright...',
      );
      browser = await chromium.launch();
      const page = await browser.newPage();

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
      await page.screenshot({
        path: path.join(screenshotsPath, 'rendered-desktop.png'),
        fullPage: false,
      });
      await this.state.addLog(run.id, 'Desktop скриншот сохранен');

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload({ waitUntil: 'networkidle' });
      await page.screenshot({
        path: path.join(screenshotsPath, 'rendered-mobile.png'),
        fullPage: false,
      });
      await this.state.addLog(run.id, 'Mobile скриншот сохранен');

      if (browser) await browser.close();

      if (serverProcess) {
        serverProcess.kill();
      }

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
      await this.state.addLog(run.id, 'Ошибка создания скриншотов', {
        error: message,
      });

      if (browser) await browser.close().catch(() => undefined);
      if (serverProcess) serverProcess.kill();

      return this.state.updateRunStatus(
        screenshotRun,
        RunStatus.Failed,
        'screenshots_failed',
        userId,
      );
    }
  }
}
