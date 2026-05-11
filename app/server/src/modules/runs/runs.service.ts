import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Repository } from 'typeorm';

import { appConfig } from '../../app/config';
import { ArtifactType, RunArtifactEntity, RunEntity, RunLogEntity, RunLogLevel, RunStatus } from '../../db/entities';
import type { CreateRunDto } from './dto/create-run.dto';

const RUN_NUMBER_PAD = 3;

type ProjectSpec = {
  siteType: string;
  sectionType: string;
  style: string[];
  audience: string;
  requiredElements: string[];
  copy: {
    headline: string;
    description: string;
    primaryButton: string;
    secondaryButton: string;
  };
  visualPreferences: string[];
};

type DesignTokens = {
  colors: {
    background: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    surface: string;
    border: string;
  };
  layout: {
    containerWidth: string;
    sectionPaddingY: string;
    sectionPaddingX: string;
    columns: number;
  };
  typography: {
    headlineSize: string;
    headlineWeight: number;
    bodySize: string;
    lineHeight: string;
  };
  components: {
    buttonRadius: string;
    cardRadius: string;
    cardShadow: string;
  };
};

function normalizeBrief(brief: unknown): string {
  if (typeof brief !== 'string') {
    throw new BadRequestException('Бриф должен быть строкой');
  }

  const trimmedBrief = brief.trim();

  if (trimmedBrief.length < 10) {
    throw new BadRequestException('Бриф должен содержать минимум 10 символов');
  }

  return trimmedBrief;
}

function toRunSlug(runNumber: number): string {
  return `run-${String(runNumber).padStart(RUN_NUMBER_PAD, '0')}`;
}

function extractLineValue(brief: string, label: string, fallback: string): string {
  const match = brief.match(new RegExp(`${label}\\s*:\\s*(.+)`, 'i'));
  return match?.[1]?.trim() || fallback;
}

function extractStyleItems(brief: string): string[] {
  const styleBlock = brief.match(/стиль\s*:\s*([\s\S]*?)(?:\n\s*\n|текст\s*:|$)/i)?.[1] ?? '';
  const items = styleBlock
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);

  return items.length > 0 ? items : ['современный'];
}

function createProjectSpec(brief: string): ProjectSpec {
  const style = extractStyleItems(brief);
  const hasProductCard = /карточк[аи]\s+продукт|product\s+card/i.test(brief);

  return {
    siteType: /лендинг|landing/i.test(brief) ? 'лендинг' : 'сайт',
    sectionType: /hero|первый экран|hero-блок/i.test(brief) ? 'hero-блок' : 'hero-блок',
    style,
    audience: /финансов/i.test(brief) ? 'финансовые команды' : 'общая аудитория',
    requiredElements: [
      'заголовок',
      'описание',
      'основная кнопка',
      'вторая кнопка',
      ...(hasProductCard ? ['карточка продукта'] : []),
    ],
    copy: {
      headline: extractLineValue(brief, 'Заголовок', 'ИИ-лендинг по брифу'),
      description: extractLineValue(brief, 'Описание', 'Сгенерируйте понятный первый экран на основе продуктового брифа.'),
      primaryButton: extractLineValue(brief, 'Основная кнопка', 'Начать'),
      secondaryButton: extractLineValue(brief, 'Вторая кнопка', 'Смотреть демо'),
    },
    visualPreferences: style,
  };
}

function hasStyle(spec: ProjectSpec, pattern: RegExp): boolean {
  return spec.style.some((item) => pattern.test(item));
}

function createDesignTokens(spec: ProjectSpec): DesignTokens {
  const isDark = hasStyle(spec, /темн|dark/i);
  const isPremium = hasStyle(spec, /дорог|преми|premium/i);

  return {
    colors: {
      background: isDark ? '#050816' : '#F7F8FB',
      textPrimary: isDark ? '#FFFFFF' : '#101828',
      textSecondary: isDark ? '#A7B0C0' : '#667085',
      accent: '#7C3AED',
      surface: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
      border: isDark ? 'rgba(255,255,255,0.14)' : '#E4E7EC',
    },
    layout: {
      containerWidth: '1200px',
      sectionPaddingY: '96px',
      sectionPaddingX: '32px',
      columns: spec.requiredElements.includes('карточка продукта') ? 2 : 1,
    },
    typography: {
      headlineSize: isPremium ? '72px' : '64px',
      headlineWeight: 700,
      bodySize: '18px',
      lineHeight: '1.08',
    },
    components: {
      buttonRadius: '999px',
      cardRadius: '24px',
      cardShadow: isDark ? '0 32px 80px rgba(91, 64, 255, 0.24)' : '0 24px 60px rgba(16, 24, 40, 0.12)',
    },
  };
}

function createDesignDescription(spec: ProjectSpec, tokens: DesignTokens): string {
  const productCardText = spec.requiredElements.includes('карточка продукта')
    ? 'Справа располагается крупная карточка продукта с полупрозрачной поверхностью, мягкой обводкой и свечением.'
    : 'Композиция строится вокруг текстового блока без отдельной продуктовой карточки.';

  return `# Описание дизайна

## Фон

Основной фон: \`${tokens.colors.background}\`.
Визуальный стиль: ${spec.style.join(', ')}.
Акцентный цвет: \`${tokens.colors.accent}\`.
Для глубины используются мягкие радиальные подсветки и темные/нейтральные переходы, которые можно реализовать через CSS.

## Сетка

Тип блока: ${spec.sectionType}.
Максимальная ширина контейнера: \`${tokens.layout.containerWidth}\`.
Количество колонок: ${tokens.layout.columns}.
Текстовый блок расположен слева. ${productCardText}
Вертикальные отступы секции: \`${tokens.layout.sectionPaddingY}\`, горизонтальные: \`${tokens.layout.sectionPaddingX}\`.

## Типографика

Заголовок: \`${tokens.typography.headlineSize}\`, насыщенность ${tokens.typography.headlineWeight}, плотная высота строки \`${tokens.typography.lineHeight}\`.
Основной цвет текста: \`${tokens.colors.textPrimary}\`.
Вторичный текст: \`${tokens.colors.textSecondary}\`, размер \`${tokens.typography.bodySize}\`.

## Кнопки

Основная кнопка использует акцентный цвет \`${tokens.colors.accent}\`, белый текст и радиус \`${tokens.components.buttonRadius}\`.
Вторая кнопка выглядит спокойнее: прозрачная или поверхностная заливка, тонкая обводка и тот же радиус.

## Карточки

Поверхность карточек: \`${tokens.colors.surface}\`.
Обводка: \`${tokens.colors.border}\`.
Радиус карточек: \`${tokens.components.cardRadius}\`.
Тень: \`${tokens.components.cardShadow}\`.

## Адаптив

На мобильном экране блок становится одноколоночным: сначала текст, затем карточка или визуальный блок.
Заголовок уменьшается, кнопки остаются крупными и удобными для касания.
`;
}

@Injectable()
export class RunsService {
  constructor(
    @InjectRepository(RunEntity)
    private readonly runsRepository: Repository<RunEntity>,
    @InjectRepository(RunArtifactEntity)
    private readonly artifactsRepository: Repository<RunArtifactEntity>,
    @InjectRepository(RunLogEntity)
    private readonly logsRepository: Repository<RunLogEntity>,
  ) {}

  async createRun(dto: CreateRunDto) {
    const brief = normalizeBrief(dto?.brief);
    const runNumber = await this.getNextRunNumber();
    const slug = toRunSlug(runNumber);

    const run = await this.runsRepository.save({
      runNumber,
      slug,
      brief,
      status: RunStatus.Queued,
      currentStep: 'queued',
    });

    await this.createRunFolders(slug);
    await this.writeStatusFile(slug, run);
    await this.addLog(run.id, 'Запуск поставлен в очередь', { slug });

    const completedRun = await this.prepareBrief(run);

    return {
      id: completedRun.id,
      slug: completedRun.slug,
      status: completedRun.status,
    };
  }

  getRuns(): Promise<RunEntity[]> {
    return this.runsRepository.find({
      relations: {
        artifacts: true,
        logs: true,
      },
      order: {
        createdAt: 'DESC',
        logs: {
          createdAt: 'DESC',
        },
      },
      take: 25,
    });
  }

  getRun(id: string): Promise<RunEntity | null> {
    return this.runsRepository.findOne({
      where: { id },
      relations: {
        artifacts: true,
        logs: true,
      },
      order: {
        logs: {
          createdAt: 'DESC',
        },
      },
    });
  }

  async getArtifactContent(runId: string, artifactId: string) {
    const artifact = await this.artifactsRepository.findOne({
      where: {
        id: artifactId,
        runId,
      },
      relations: {
        run: true,
      },
    });

    if (!artifact) {
      throw new NotFoundException('Артефакт не найден');
    }

    if (!artifact.mimeType?.includes('json') && !artifact.mimeType?.startsWith('text/')) {
      throw new BadRequestException('Артефакт не является текстовым файлом');
    }

    const runPath = this.getRunPath(artifact.run.slug);
    const absolutePath = path.resolve(process.cwd(), '..', '..', artifact.path);

    if (!absolutePath.startsWith(runPath)) {
      throw new BadRequestException('Путь артефакта находится вне папки запуска');
    }

    const content = await fs.readFile(absolutePath, 'utf8');

    return {
      artifactId: artifact.id,
      type: artifact.type,
      path: artifact.path,
      mimeType: artifact.mimeType,
      content,
    };
  }

  private async getNextRunNumber(): Promise<number> {
    const lastRun = await this.runsRepository.findOne({
      where: {},
      order: {
        runNumber: 'DESC',
      },
    });

    return (lastRun?.runNumber ?? 0) + 1;
  }

  private async prepareBrief(run: RunEntity): Promise<RunEntity> {
    const runningRun = await this.updateRunStatus(run, RunStatus.Running, 'prepare_brief');
    await this.addLog(run.id, 'Начата подготовка брифа');

    const projectSpec = createProjectSpec(run.brief);
    const relativePath = path.join(appConfig.storage.generatedRoot, run.slug, 'project-spec.json').replaceAll('\\', '/');
    const absolutePath = path.join(this.getRunPath(run.slug), 'project-spec.json');

    await fs.writeFile(absolutePath, `${JSON.stringify(projectSpec, null, 2)}\n`, 'utf8');
    await this.artifactsRepository.save({
      runId: run.id,
      type: ArtifactType.ProjectSpec,
      path: relativePath,
      mimeType: 'application/json',
    });
    await this.addLog(run.id, 'Спецификация проекта сохранена', { path: relativePath });

    return this.prepareDesignArtifacts(runningRun, projectSpec);
  }

  private async prepareDesignArtifacts(run: RunEntity, projectSpec: ProjectSpec): Promise<RunEntity> {
    const designRun = await this.updateRunStatus(run, RunStatus.Running, 'prepare_design_artifacts');
    await this.addLog(run.id, 'Начато описание дизайна');

    const tokens = createDesignTokens(projectSpec);
    const description = createDesignDescription(projectSpec, tokens);

    const descriptionRelativePath = path
      .join(appConfig.storage.generatedRoot, run.slug, 'design', 'design-description.md')
      .replaceAll('\\', '/');
    const tokensRelativePath = path
      .join(appConfig.storage.generatedRoot, run.slug, 'design', 'design-tokens.json')
      .replaceAll('\\', '/');

    await fs.writeFile(path.join(this.getRunPath(run.slug), 'design', 'design-description.md'), description, 'utf8');
    await fs.writeFile(
      path.join(this.getRunPath(run.slug), 'design', 'design-tokens.json'),
      `${JSON.stringify(tokens, null, 2)}\n`,
      'utf8',
    );

    await this.artifactsRepository.save([
      {
        runId: run.id,
        type: ArtifactType.DesignDescription,
        path: descriptionRelativePath,
        mimeType: 'text/markdown',
      },
      {
        runId: run.id,
        type: ArtifactType.DesignTokens,
        path: tokensRelativePath,
        mimeType: 'application/json',
      },
    ]);

    await this.addLog(run.id, 'Описание дизайна сохранено', { path: descriptionRelativePath });
    await this.addLog(run.id, 'Дизайн-токены сохранены', { path: tokensRelativePath });

    return this.updateRunStatus(designRun, RunStatus.Completed, 'design_artifacts_ready');
  }

  private async updateRunStatus(run: RunEntity, status: RunStatus, currentStep: string): Promise<RunEntity> {
    const updatedRun = await this.runsRepository.save({
      ...run,
      status,
      currentStep,
    });

    await this.writeStatusFile(run.slug, updatedRun);
    return updatedRun;
  }

  private async addLog(runId: string, message: string, metadata: Record<string, unknown> | null = null): Promise<void> {
    await this.logsRepository.save({
      runId,
      level: RunLogLevel.Info,
      message,
      metadata,
    });
  }

  private async createRunFolders(slug: string): Promise<void> {
    const runPath = this.getRunPath(slug);
    const folders = ['reference', 'design', 'code', 'screenshots', 'qa'];

    await fs.mkdir(runPath, { recursive: true });
    await Promise.all(folders.map((folder) => fs.mkdir(path.join(runPath, folder), { recursive: true })));
  }

  private async writeStatusFile(slug: string, run: RunEntity): Promise<void> {
    const statusPath = path.join(this.getRunPath(slug), 'status.json');
    const payload = {
      id: run.id,
      slug: run.slug,
      status: run.status,
      currentStep: run.currentStep,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    };

    await fs.writeFile(statusPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }

  private getRunPath(slug: string): string {
    return path.resolve(process.cwd(), '..', '..', appConfig.storage.generatedRoot, slug);
  }
}
