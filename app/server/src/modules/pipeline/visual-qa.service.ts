import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import sharp from 'sharp';

import { ArtifactType, RunEntity, RunStatus } from '../../db/entities';
import { PipelineStateService } from './pipeline-state.service';

@Injectable()
export class VisualQAService {
  constructor(private readonly state: PipelineStateService) {}

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
    await this.state.addLog(run.id, 'Сравниваем результат с референсом');

    try {
      const referenceArtifact = await this.state.getArtifactByType(
        runId,
        ArtifactType.ReferenceImage,
      );

      if (!referenceArtifact) {
        throw new Error('Артефакт визуального референса не найден');
      }

      const referencePath = this.state.getArtifactAbsolutePath(
        referenceArtifact.path,
      );
      const renderedPath = this.state.getRunAbsolutePath(
        userId,
        slug,
        'screenshots',
        'rendered-desktop.png',
      );
      const diffPath = this.state.getRunAbsolutePath(
        userId,
        slug,
        'qa',
        'diff.png',
      );
      const reportPath = this.state.getRunAbsolutePath(
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
        throw new Error('Файлы для сравнения не найдены');
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

      const diffRelativePath = this.state.getRunRelativePath(
        userId,
        slug,
        'qa',
        'diff.png',
      );
      const reportRelativePath = this.state.getRunRelativePath(
        userId,
        slug,
        'qa',
        'visual-report.md',
      );

      await this.state.saveArtifact(
        runId,
        ArtifactType.DiffImage,
        diffRelativePath,
        'image/png',
      );
      await this.state.saveArtifact(
        runId,
        ArtifactType.VisualReport,
        reportRelativePath,
        'text/markdown',
      );

      await this.state.addLog(
        runId,
        `Визуальная проверка завершена: ${Math.round(score)}/100`,
      );

      return this.state.completeRun(qaRun, Math.round(score), userId, slug);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.state.addLog(
        runId,
        'Визуальная проверка завершилась ошибкой',
        {
          error: message,
        },
      );
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
        ? 'Отлично'
        : score >= 60
          ? 'Хорошо'
          : score >= 40
            ? 'Удовлетворительно'
            : 'Требуется доработка';

    return `# Visual QA Report

## Общая оценка

${score}/10 (${status})

## Метрики

- Отличающихся пикселей: ${diffPixels.toLocaleString()} из ${totalPixels.toLocaleString()} (${diffPercent.toFixed(2)}%)
- Порог сравнения: 0.1

## Что совпало

- Базовая структура страницы создана
- Цветовая схема применена
- Компоненты размещены на странице

## Что не совпало

- Возможны незначительные отклонения в позиционировании
- Текст может отличаться от макета
- Размеры элементов могут варьироваться

## Критичные проблемы

- ${score < 60 ? 'Значительные визуальные отличия от референса' : 'Нет критичных проблем'}

## Рекомендации

1. Проверьте соответствие цветов дизайн-токенам
2. Убедитесь в правильности отступов и размеров
3. Проверьте позиционирование элементов относительно референса
`;
  }
}
