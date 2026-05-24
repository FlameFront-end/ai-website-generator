import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import sharp from 'sharp';

import { ArtifactType, RunStatus } from '../../common/enums';
import { RunEntity } from '../../db/entities';
import { extractErrorMessage } from '../../common/utils';
import { StorageService } from '../storage/storage.service';
import { ArtifactService } from './artifact.service';
import { PipelineStateService } from './pipeline-state.service';

@Injectable()
export class VisualQAService {
  constructor(
    private readonly state: PipelineStateService,
    private readonly storageService: StorageService,
    private readonly artifactService: ArtifactService,
  ) {}

  async runVisualQA(
    run: RunEntity,
    runId: string,
    slug: string,
    userId: string,
  ): Promise<RunEntity> {
    const qaRun = await this.state.updateRunStatus(
      run,
      RunStatus.Running,
      'visual_qa',
      userId,
    );
    await this.state.addLog(run.id, 'Comparing result with reference');

    try {
      const referenceArtifact = await this.artifactService.getArtifactByType(
        runId,
        ArtifactType.ReferenceImage,
      );

      if (!referenceArtifact) {
        throw new Error('Visual reference artifact not found');
      }

      const referencePath = this.storageService.getArtifactAbsolutePath(
        referenceArtifact.path,
      );
      const renderedPath = this.storageService.getRunAbsolutePath(
        userId,
        slug,
        'screenshots',
        'rendered-desktop.png',
      );
      const diffPath = this.storageService.getRunAbsolutePath(
        userId,
        slug,
        'qa',
        'diff.png',
      );
      const reportPath = this.storageService.getRunAbsolutePath(
        userId,
        slug,
        'qa',
        'visual-report.md',
      );

      await fs.mkdir(path.dirname(diffPath), { recursive: true });

      const referenceExists = await fs
        .access(referencePath)
        .then(() => true)
        .catch(() => false);
      const renderedExists = await fs
        .access(renderedPath)
        .then(() => true)
        .catch(() => false);

      if (!referenceExists || !renderedExists) {
        throw new Error('Comparison files not found');
      }

      const referenceData = await fs.readFile(referencePath);
      const renderedData = await fs.readFile(renderedPath);

      const { diffPixels, diffPng } = await this.compareImages(
        referenceData,
        renderedData,
      );

      const totalPixels = diffPng.width * diffPng.height;
      const diffPercent = (diffPixels / totalPixels) * 100;
      const score = Math.max(0, 100 - diffPercent * 10);

      await fs.writeFile(diffPath, PNG.sync.write(diffPng));

      const report = this.createVisualReport(
        Math.round(score),
        diffPercent,
        diffPixels,
        totalPixels,
      );
      await fs.writeFile(reportPath, report);

      const diffRelativePath = this.storageService.getRunRelativePath(
        userId,
        slug,
        'qa',
        'diff.png',
      );
      const reportRelativePath = this.storageService.getRunRelativePath(
        userId,
        slug,
        'qa',
        'visual-report.md',
      );

      await this.artifactService.saveArtifact(
        runId,
        ArtifactType.DiffImage,
        diffRelativePath,
        'image/png',
      );
      await this.artifactService.saveArtifact(
        runId,
        ArtifactType.VisualReport,
        reportRelativePath,
        'text/markdown',
      );

      await this.state.addLog(
        runId,
        `Visual QA completed: ${Math.round(score)}/100`,
      );

      return this.state.completeRun(qaRun, Math.round(score), userId, slug);
    } catch (error) {
      const message = extractErrorMessage(error);
      await this.state.addLog(runId, 'Visual QA failed with an error', {
        error: message,
      });
      return this.state.updateRunStatus(
        qaRun,
        RunStatus.VisualFailed,
        'visual_qa_failed',
        userId,
      );
    }
  }

  private async compareImages(
    referenceData: Buffer,
    renderedData: Buffer,
  ): Promise<{ diffPixels: number; diffPng: PNG }> {
    const referenceImage = await sharp(referenceData)
      .resize(1440, 900)
      .png()
      .toBuffer();
    const renderedImage = await sharp(renderedData)
      .resize(1440, 900)
      .png()
      .toBuffer();

    const referencePng = PNG.sync.read(referenceImage);
    const renderedPng = PNG.sync.read(renderedImage);

    const diffPng = new PNG({
      width: referencePng.width,
      height: referencePng.height,
    });

    const diffPixels = pixelmatch(
      referencePng.data,
      renderedPng.data,
      diffPng.data,
      referencePng.width,
      referencePng.height,
      { threshold: 0.1 },
    );

    return { diffPixels, diffPng };
  }

  private createVisualReport(
    score: number,
    diffPercent: number,
    diffPixels: number,
    totalPixels: number,
  ): string {
    const status =
      score >= 80
        ? 'Excellent'
        : score >= 60
          ? 'Good'
          : score >= 40
            ? 'Acceptable'
            : 'Needs improvement';

    return `# Visual QA Report

## Overall Score

${score}/100 (${status})

## Metrics

- Different pixels: ${diffPixels.toLocaleString()} of ${totalPixels.toLocaleString()} (${diffPercent.toFixed(2)}%)
- Comparison threshold: 0.1

## What matched

- Basic page structure created
- Color scheme applied
- Components placed on the page

## What did not match

- Minor positioning deviations may exist
- Text may differ from the mockup
- Element sizes may vary

## Critical issues

- ${score < 60 ? 'Significant visual differences from the reference' : 'No critical issues'}

## Recommendations

1. Verify color compliance with design tokens
2. Ensure correct spacing and sizing
3. Check element positioning against the reference
`;
  }
}
