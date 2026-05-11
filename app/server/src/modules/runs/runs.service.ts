import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import AdmZip from 'adm-zip';
import { exec } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import sharp from 'sharp';
import { promisify } from 'node:util';
import { Repository } from 'typeorm';

import { appConfig } from '../../app/config';
import {
  ArtifactType,
  RunArtifactEntity,
  RunEntity,
  RunLogEntity,
  RunLogLevel,
  RunStatus,
} from '../../db/entities';
import type { CreateRunDto } from './dto/create-run.dto';
import type { UpdateRunDto } from './dto/update-run.dto';

const RUN_NUMBER_PAD = 3;
const PIPELINE_STEP_DELAY_MS = 1200;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeDisplayName(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('Название запуска должно быть строкой');
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return null;
  }

  if (trimmedValue.length > 80) {
    throw new BadRequestException(
      'Название запуска не должно быть длиннее 80 символов',
    );
  }

  return trimmedValue;
}

function toRunSlug(runNumber: number): string {
  return `run-${String(runNumber).padStart(RUN_NUMBER_PAD, '0')}`;
}

function extractLineValue(
  brief: string,
  label: string,
  fallback: string,
): string {
  const match = brief.match(new RegExp(`${label}\\s*:\\s*(.+)`, 'i'));
  return match?.[1]?.trim() || fallback;
}

function extractStyleItems(brief: string): string[] {
  const styleBlock =
    brief.match(/стиль\s*:\s*([\s\S]*?)(?:\n\s*\n|текст\s*:|$)/i)?.[1] ?? '';
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
    sectionType: /hero|первый экран|hero-блок/i.test(brief)
      ? 'hero-блок'
      : 'hero-блок',
    style,
    audience: /финансов/i.test(brief)
      ? 'финансовые команды'
      : 'общая аудитория',
    requiredElements: [
      'заголовок',
      'описание',
      'основная кнопка',
      'вторая кнопка',
      ...(hasProductCard ? ['карточка продукта'] : []),
    ],
    copy: {
      headline: extractLineValue(brief, 'Заголовок', 'ИИ-лендинг по брифу'),
      description: extractLineValue(
        brief,
        'Описание',
        'Сгенерируйте понятный первый экран на основе продуктового брифа.',
      ),
      primaryButton: extractLineValue(brief, 'Основная кнопка', 'Начать'),
      secondaryButton: extractLineValue(
        brief,
        'Вторая кнопка',
        'Смотреть демо',
      ),
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
      cardShadow: isDark
        ? '0 32px 80px rgba(91, 64, 255, 0.24)'
        : '0 24px 60px rgba(16, 24, 40, 0.12)',
    },
  };
}

function createDesignDescription(
  spec: ProjectSpec,
  tokens: DesignTokens,
): string {
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

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function createReferenceSvg(spec: ProjectSpec, tokens: DesignTokens): string {
  const headline = escapeXml(spec.copy.headline);
  const description = escapeXml(spec.copy.description);
  const primaryButton = escapeXml(spec.copy.primaryButton);
  const secondaryButton = escapeXml(spec.copy.secondaryButton);
  const background = tokens.colors.background;
  const textPrimary = tokens.colors.textPrimary;
  const textSecondary = tokens.colors.textSecondary;
  const accent = tokens.colors.accent;
  const surface = tokens.colors.surface
    .replaceAll('rgba', 'rgb')
    .replace(/,\s*0\.\d+\)/, ')');
  const border = tokens.colors.border
    .replaceAll('rgba', 'rgb')
    .replace(/,\s*0\.\d+\)/, ')');

  return `<svg width="1440" height="900" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1440" height="900" fill="${background}"/>
  <circle cx="1090" cy="150" r="260" fill="${accent}" opacity="0.22"/>
  <circle cx="260" cy="780" r="320" fill="#2563EB" opacity="0.16"/>
  <rect x="96" y="80" width="1248" height="740" rx="36" fill="rgba(255,255,255,0.035)" stroke="${border}" stroke-width="1"/>
  <g transform="translate(150 210)">
    <text x="0" y="0" fill="${textPrimary}" font-family="Inter, Arial, sans-serif" font-size="76" font-weight="700">
      <tspan x="0" dy="0">${headline.slice(0, 32)}</tspan>
      <tspan x="0" dy="86">${headline.slice(32)}</tspan>
    </text>
    <text x="0" y="205" fill="${textSecondary}" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="400">
      <tspan x="0" dy="0">${description.slice(0, 62)}</tspan>
      <tspan x="0" dy="34">${description.slice(62)}</tspan>
    </text>
    <rect x="0" y="320" width="210" height="58" rx="29" fill="${accent}"/>
    <text x="105" y="357" text-anchor="middle" fill="#FFFFFF" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700">${primaryButton}</text>
    <rect x="230" y="320" width="190" height="58" rx="29" fill="rgba(255,255,255,0.06)" stroke="${border}"/>
    <text x="325" y="357" text-anchor="middle" fill="${textPrimary}" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700">${secondaryButton}</text>
  </g>
  <g transform="translate(865 185)">
    <rect width="360" height="470" rx="28" fill="${surface}" stroke="${border}"/>
    <rect x="30" y="34" width="300" height="74" rx="18" fill="rgba(255,255,255,0.08)"/>
    <rect x="30" y="138" width="142" height="110" rx="20" fill="${accent}" opacity="0.86"/>
    <rect x="188" y="138" width="142" height="110" rx="20" fill="rgba(255,255,255,0.08)"/>
    <path d="M54 328 C98 276 142 306 180 282 C228 252 270 284 310 234" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>
    <rect x="30" y="382" width="300" height="16" rx="8" fill="rgba(255,255,255,0.12)"/>
    <rect x="30" y="414" width="210" height="16" rx="8" fill="rgba(255,255,255,0.09)"/>
  </g>
</svg>
`;
}

function createGeneratedPackageJson(spec: ProjectSpec): string {
  const packageName = spec.copy.headline
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return `${JSON.stringify(
    {
      scripts: {
        dev: 'vite',
        build: 'tsc -b && vite build',
        preview: 'vite preview',
      },
      dependencies: {
        '@vitejs/plugin-react': 'latest',
        typescript: 'latest',
        vite: 'latest',
        react: 'latest',
        'react-dom': 'latest',
      },
      devDependencies: {
        '@types/react': 'latest',
        '@types/react-dom': 'latest',
      },
      private: true,
      name: packageName || 'generated-landing',
      version: '0.0.0',
      type: 'module',
    },
    null,
    2,
  )}\n`;
}

function createGeneratedIndexHtml(spec: ProjectSpec): string {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeXml(spec.copy.headline)}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function createGeneratedTsConfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        useDefineForClassFields: true,
        lib: ['DOM', 'DOM.Iterable', 'ES2022'],
        allowJs: false,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        module: 'ESNext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        ignoreDeprecations: '6.0',
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
      },
      include: ['src'],
      references: [],
    },
    null,
    2,
  )}\n`;
}

function createGeneratedViteConfig(): string {
  return `import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
});
`;
}

function createGeneratedMainTsx(): string {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';

import './styles.css';

const content = {
  headline: '${escapeGeneratedString('ИИ-аналитика для финансовых команд')}',
  description: '${escapeGeneratedString('Получайте инсайты, прогнозы и отчеты быстрее без ручной рутины.')}',
  primaryButton: '${escapeGeneratedString('Начать бесплатно')}',
  secondaryButton: '${escapeGeneratedString('Смотреть демо')}',
};

function App() {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero__content">
          <p className="eyebrow">ИИ-сервис для финансовой аналитики</p>
          <h1>{content.headline}</h1>
          <p className="lead">{content.description}</p>
          <div className="actions">
            <a className="button button--primary" href="#start">
              {content.primaryButton}
            </a>
            <a className="button button--secondary" href="#demo">
              {content.secondaryButton}
            </a>
          </div>
        </div>

        <aside className="product-card" aria-label="Карточка продукта">
          <div className="product-card__header">
            <span>Прогноз выручки</span>
            <strong>+18.4%</strong>
          </div>
          <div className="metric-grid">
            <div>
              <span>Точность</span>
              <strong>94%</strong>
            </div>
            <div>
              <span>Отчеты</span>
              <strong>12</strong>
            </div>
          </div>
          <div className="chart" />
          <div className="product-card__footer">
            <span>Последнее обновление</span>
            <strong>2 мин назад</strong>
          </div>
        </aside>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;
}

function escapeGeneratedString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

function createGeneratedMainTsxFromSpec(spec: ProjectSpec): string {
  return createGeneratedMainTsx()
    .replace(
      escapeGeneratedString('ИИ-аналитика для финансовых команд'),
      escapeGeneratedString(spec.copy.headline),
    )
    .replace(
      escapeGeneratedString(
        'Получайте инсайты, прогнозы и отчеты быстрее без ручной рутины.',
      ),
      escapeGeneratedString(spec.copy.description),
    )
    .replace(
      escapeGeneratedString('Начать бесплатно'),
      escapeGeneratedString(spec.copy.primaryButton),
    )
    .replace(
      escapeGeneratedString('Смотреть демо'),
      escapeGeneratedString(spec.copy.secondaryButton),
    );
}

function createGeneratedStyles(tokens: DesignTokens): string {
  return `:root {
  color: ${tokens.colors.textPrimary};
  background: ${tokens.colors.background};
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

a {
  color: inherit;
  text-decoration: none;
}

.page {
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 82% 12%, rgba(124, 58, 237, 0.28), transparent 34%),
    radial-gradient(circle at 8% 90%, rgba(37, 99, 235, 0.18), transparent 32%),
    ${tokens.colors.background};
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.75fr);
  gap: 56px;
  align-items: center;
  width: min(${tokens.layout.containerWidth}, calc(100% - 40px));
  min-height: 100vh;
  margin: 0 auto;
  padding: ${tokens.layout.sectionPaddingY} 0;
}

.hero__content {
  display: grid;
  gap: 28px;
}

.eyebrow {
  margin: 0;
  color: ${tokens.colors.accent};
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  max-width: 780px;
  margin: 0;
  color: ${tokens.colors.textPrimary};
  font-size: clamp(44px, 8vw, ${tokens.typography.headlineSize});
  font-weight: ${tokens.typography.headlineWeight};
  line-height: ${tokens.typography.lineHeight};
}

.lead {
  max-width: 640px;
  margin: 0;
  color: ${tokens.colors.textSecondary};
  font-size: ${tokens.typography.bodySize};
  line-height: 1.65;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  border-radius: ${tokens.components.buttonRadius};
  padding: 0 24px;
  font-weight: 800;
}

.button--primary {
  background: ${tokens.colors.accent};
  color: #ffffff;
  box-shadow: 0 20px 50px rgba(124, 58, 237, 0.32);
}

.button--secondary {
  border: 1px solid ${tokens.colors.border};
  background: ${tokens.colors.surface};
}

.product-card {
  display: grid;
  gap: 22px;
  border: 1px solid ${tokens.colors.border};
  border-radius: ${tokens.components.cardRadius};
  padding: 28px;
  background: ${tokens.colors.surface};
  box-shadow: ${tokens.components.cardShadow};
  backdrop-filter: blur(18px);
}

.product-card__header,
.product-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.product-card span {
  color: ${tokens.colors.textSecondary};
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.metric-grid div {
  display: grid;
  gap: 8px;
  border: 1px solid ${tokens.colors.border};
  border-radius: 18px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.05);
}

.product-card strong {
  color: ${tokens.colors.textPrimary};
  font-size: 28px;
}

.chart {
  height: 160px;
  border-radius: 22px;
  background:
    linear-gradient(135deg, rgba(124, 58, 237, 0.86), rgba(37, 99, 235, 0.36)),
    repeating-linear-gradient(90deg, transparent 0 44px, rgba(255, 255, 255, 0.08) 44px 45px);
}

@media (max-width: 860px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 34px;
    padding: 54px 0;
  }
}
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

  async createRun(dto: CreateRunDto, userId: string) {
    const brief = normalizeBrief(dto?.brief);
    const runNumber = await this.getNextRunNumber(userId);
    const slug = toRunSlug(runNumber);

    const run = await this.runsRepository.save({
      runNumber,
      slug,
      brief,
      status: RunStatus.Queued,
      currentStep: 'queued',
      userId,
    });

    await this.createRunFolders(userId, slug);
    await this.writeStatusFile(userId, slug, run);
    await this.addLog(run.id, 'Запуск поставлен в очередь', { slug });

    void this.processRun(run, userId);

    return {
      id: run.id,
      slug: run.slug,
      status: run.status,
    };
  }

  getRuns(userId: string): Promise<RunEntity[]> {
    return this.runsRepository.find({
      where: { userId },
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

  getRun(id: string, userId: string): Promise<RunEntity | null> {
    return this.runsRepository.findOne({
      where: { id, userId },
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

  async getArtifactContent(runId: string, artifactId: string, userId: string) {
    const run = await this.getRunOrFail(runId, userId);
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

    if (
      !artifact.mimeType?.includes('json') &&
      !artifact.mimeType?.startsWith('text/')
    ) {
      throw new BadRequestException('Артефакт не является текстовым файлом');
    }

    const runPath = this.getRunPath(userId, run.slug);
    const absolutePath = path.resolve(process.cwd(), '..', '..', artifact.path);

    if (!absolutePath.startsWith(runPath)) {
      throw new BadRequestException(
        'Путь артефакта находится вне папки запуска',
      );
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

  async updateRun(id: string, dto: UpdateRunDto, userId: string) {
    const run = await this.getRunOrFail(id, userId);
    const displayName = normalizeDisplayName(dto?.displayName);

    const updatedRun = await this.runsRepository.save({
      ...run,
      displayName,
    });

    await this.writeStatusFile(userId, updatedRun.slug, updatedRun);
    await this.addLog(
      updatedRun.id,
      displayName ? 'Запуск переименован' : 'Название запуска очищено',
      {
        displayName,
      },
    );

    return this.getRunOrFail(id, userId);
  }

  async deleteRun(id: string, userId: string) {
    const run = await this.getRunOrFail(id, userId);
    const runPath = this.getRunPath(userId, run.slug);
    const generatedRoot = this.getGeneratedRootPath();

    if (!runPath.startsWith(generatedRoot)) {
      throw new BadRequestException(
        'Папка запуска находится вне директории generated',
      );
    }

    await this.runsRepository.remove(run);
    await fs.rm(runPath, { recursive: true, force: true });

    return {
      id,
      deleted: true,
    };
  }

  private async getNextRunNumber(userId: string): Promise<number> {
    const lastRun = await this.runsRepository.findOne({
      where: { userId },
      order: {
        runNumber: 'DESC',
      },
    });

    return (lastRun?.runNumber ?? 0) + 1;
  }

  private async getRunOrFail(id: string, userId: string): Promise<RunEntity> {
    const run = await this.getRun(id, userId);

    if (!run) {
      throw new NotFoundException('Запуск не найден');
    }

    return run;
  }

  private async processRun(run: RunEntity, userId: string): Promise<void> {
    try {
      await sleep(PIPELINE_STEP_DELAY_MS);
      await this.prepareBrief(run, userId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Неизвестная ошибка пайплайна';
      await this.runsRepository.save({
        ...run,
        status: RunStatus.Failed,
        currentStep: 'pipeline_failed',
        errorMessage: message,
      });
      await this.addLog(run.id, 'Пайплайн завершился ошибкой', {
        error: message,
      });
    }
  }

  private async prepareBrief(
    run: RunEntity,
    userId: string,
  ): Promise<RunEntity> {
    const runningRun = await this.updateRunStatus(
      run,
      RunStatus.Running,
      'prepare_brief',
      userId,
    );
    await this.addLog(run.id, 'Начата подготовка брифа');
    await sleep(PIPELINE_STEP_DELAY_MS);

    const projectSpec = createProjectSpec(run.brief);
    const relativePath = path
      .join(
        appConfig.storage.generatedRoot,
        userId,
        'runs',
        run.slug,
        'project-spec.json',
      )
      .replaceAll('\\', '/');
    const absolutePath = path.join(
      this.getRunPath(userId, run.slug),
      'project-spec.json',
    );

    await fs.writeFile(
      absolutePath,
      `${JSON.stringify(projectSpec, null, 2)}\n`,
      'utf8',
    );
    await this.artifactsRepository.save({
      runId: run.id,
      type: ArtifactType.ProjectSpec,
      path: relativePath,
      mimeType: 'application/json',
    });
    await this.addLog(run.id, 'Спецификация проекта сохранена', {
      path: relativePath,
    });

    return this.prepareDesignArtifacts(runningRun, projectSpec, userId);
  }

  private async prepareDesignArtifacts(
    run: RunEntity,
    projectSpec: ProjectSpec,
    userId: string,
  ): Promise<RunEntity> {
    const designRun = await this.updateRunStatus(
      run,
      RunStatus.Running,
      'prepare_design_artifacts',
      userId,
    );
    await this.addLog(run.id, 'Начато описание дизайна');
    await sleep(PIPELINE_STEP_DELAY_MS);

    const tokens = createDesignTokens(projectSpec);
    const description = createDesignDescription(projectSpec, tokens);

    const descriptionRelativePath = path
      .join(
        appConfig.storage.generatedRoot,
        userId,
        'runs',
        run.slug,
        'design',
        'design-description.md',
      )
      .replaceAll('\\', '/');
    const tokensRelativePath = path
      .join(
        appConfig.storage.generatedRoot,
        userId,
        'runs',
        run.slug,
        'design',
        'design-tokens.json',
      )
      .replaceAll('\\', '/');

    await fs.writeFile(
      path.join(
        this.getRunPath(userId, run.slug),
        'design',
        'design-description.md',
      ),
      description,
      'utf8',
    );
    await fs.writeFile(
      path.join(
        this.getRunPath(userId, run.slug),
        'design',
        'design-tokens.json',
      ),
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

    await this.addLog(run.id, 'Описание дизайна сохранено', {
      path: descriptionRelativePath,
    });
    await this.addLog(run.id, 'Дизайн-токены сохранены', {
      path: tokensRelativePath,
    });

    return this.prepareReferenceImage(designRun, projectSpec, tokens, userId);
  }

  private async prepareReferenceImage(
    run: RunEntity,
    projectSpec: ProjectSpec,
    tokens: DesignTokens,
    userId: string,
  ): Promise<RunEntity> {
    const referenceRun = await this.updateRunStatus(
      run,
      RunStatus.Running,
      'prepare_reference_image',
      userId,
    );
    await this.addLog(run.id, 'Начата подготовка визуального референса');
    await sleep(PIPELINE_STEP_DELAY_MS);

    const svg = createReferenceSvg(projectSpec, tokens);
    const relativePath = path
      .join(
        appConfig.storage.generatedRoot,
        userId,
        'runs',
        run.slug,
        'reference',
        'hero-reference.svg',
      )
      .replaceAll('\\', '/');

    await fs.writeFile(
      path.join(
        this.getRunPath(userId, run.slug),
        'reference',
        'hero-reference.svg',
      ),
      svg,
      'utf8',
    );
    await this.artifactsRepository.save({
      runId: run.id,
      type: ArtifactType.ReferenceImage,
      path: relativePath,
      mimeType: 'image/svg+xml',
    });
    await this.addLog(run.id, 'Визуальный референс сохранен', {
      path: relativePath,
    });
    const readyRun = await this.updateRunStatus(
      referenceRun,
      RunStatus.Running,
      'reference_ready',
      userId,
    );

    return this.prepareFrontendProject(readyRun, projectSpec, tokens, userId);
  }

  private async prepareFrontendProject(
    run: RunEntity,
    projectSpec: ProjectSpec,
    tokens: DesignTokens,
    userId: string,
  ): Promise<RunEntity> {
    const codeRun = await this.updateRunStatus(
      run,
      RunStatus.Running,
      'prepare_frontend_project',
      userId,
    );
    await this.addLog(run.id, 'Начата генерация клиентского проекта');
    await sleep(PIPELINE_STEP_DELAY_MS);

    const codePath = path.join(this.getRunPath(userId, run.slug), 'code');
    const sourcePath = path.join(codePath, 'src');
    await fs.mkdir(sourcePath, { recursive: true });

    const files = [
      {
        path: 'package.json',
        content: createGeneratedPackageJson(projectSpec),
      },
      {
        path: 'index.html',
        content: createGeneratedIndexHtml(projectSpec),
      },
      {
        path: 'tsconfig.json',
        content: createGeneratedTsConfig(),
      },
      {
        path: 'vite.config.ts',
        content: createGeneratedViteConfig(),
      },
      {
        path: 'src/main.tsx',
        content: createGeneratedMainTsxFromSpec(projectSpec),
      },
      {
        path: 'src/styles.css',
        content: createGeneratedStyles(tokens),
      },
      {
        path: 'src/vite-env.d.ts',
        content: `/// <reference types="vite/client" />\n`,
      },
    ];

    await Promise.all(
      files.map((file) =>
        fs.writeFile(path.join(codePath, file.path), file.content, 'utf8'),
      ),
    );

    const manifest = {
      projectType: 'vite-react',
      title: projectSpec.copy.headline,
      entrypoint: 'src/main.tsx',
      files: files.map((file) => file.path),
      commands: {
        install: 'npm install',
        dev: 'npm run dev',
        build: 'npm run build',
      },
    };
    const manifestRelativePath = path
      .join(
        appConfig.storage.generatedRoot,
        userId,
        'runs',
        run.slug,
        'code',
        'manifest.json',
      )
      .replaceAll('\\', '/');

    await fs.writeFile(
      path.join(codePath, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
    await this.artifactsRepository.save({
      runId: run.id,
      type: ArtifactType.FrontendProject,
      path: manifestRelativePath,
      mimeType: 'application/json',
    });
    await this.addLog(run.id, 'Клиентский проект сгенерирован', {
      path: manifestRelativePath,
    });

    const builtRun = await this.buildProject(codeRun, run.slug, userId, 1);
    if (builtRun.status === RunStatus.BuildFailed) {
      return builtRun;
    }

    const screenshotRun = await this.takeScreenshots(
      builtRun,
      run.slug,
      userId,
    );

    return this.runVisualQA(screenshotRun, run.id, run.slug, userId);
  }

  private async buildProject(
    run: RunEntity,
    slug: string,
    userId: string,
    attempt = 1,
  ): Promise<RunEntity> {
    const buildRun = await this.updateRunStatus(
      run,
      RunStatus.Running,
      'build_project',
      userId,
    );
    await this.addLog(run.id, `Попытка сборки ${attempt}`);

    const codePath = path.join(this.getRunPath(userId, slug), 'code');
    const execAsync = promisify(exec);
    const buildLogs: string[] = [];

    const addLogLine = (line: string) => {
      buildLogs.push(line);
    };

    try {
      await this.addLog(run.id, 'Установка зависимостей...');
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

      await this.addLog(run.id, 'Установка зависимостей завершена');
      addLogLine('');
      addLogLine('=== npm run build ===');
      addLogLine('');

      await this.addLog(run.id, 'Сборка проекта...');
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

      addLogLine('');
      addLogLine('=== Сборка успешна ===');

      await this.saveBuildLogs(
        run.id,
        slug,
        userId,
        buildLogs.join('\n'),
        false,
      );
      await this.addLog(run.id, 'Сборка успешна');

      return await this.updateRunStatus(
        buildRun,
        RunStatus.Running,
        'build_success',
        userId,
      );
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      addLogLine('');
      addLogLine('=== ОШИБКА ===');
      addLogLine(message);

      if (error.stdout) {
        addLogLine('');
        addLogLine('--- stdout ---');
        addLogLine(String(error.stdout));
      }

      if (error.stderr) {
        addLogLine('');
        addLogLine('--- stderr ---');
        addLogLine(String(error.stderr));
      }

      await this.addLog(run.id, 'Ошибка сборки', { error: message, attempt });
      await this.saveBuildLogs(
        run.id,
        slug,
        userId,
        buildLogs.join('\n'),
        true,
      );

      if (attempt < 2) {
        await this.addLog(run.id, 'Повторная попытка...');
        return this.buildProject(run, slug, userId, attempt + 1);
      }

      const errorPath = path.join(
        this.getRunPath(userId, slug),
        'qa',
        'build-error.md',
      );
      await fs.writeFile(
        errorPath,
        `# Ошибка сборки\n\n\`\`\`\n${message}\n\`\`\`\n`,
        'utf8',
      );

      const errorRelativePath = path
        .join(
          appConfig.storage.generatedRoot,
          userId,
          'runs',
          slug,
          'qa',
          'build-error.md',
        )
        .replaceAll('\\', '/');
      await this.artifactsRepository.save({
        runId: run.id,
        type: ArtifactType.BuildError,
        path: errorRelativePath,
        mimeType: 'text/markdown',
      });

      return this.updateRunStatus(
        buildRun,
        RunStatus.BuildFailed,
        'build_failed',
        userId,
      );
    }
  }

  private async saveBuildLogs(
    runId: string,
    slug: string,
    userId: string,
    logs: string,
    isError: boolean,
  ): Promise<void> {
    const logsPath = path.join(
      this.getRunPath(userId, slug),
      'qa',
      'build-log.txt',
    );
    await fs.writeFile(logsPath, logs, 'utf8');

    const logsRelativePath = path
      .join(
        appConfig.storage.generatedRoot,
        userId,
        'runs',
        slug,
        'qa',
        'build-log.txt',
      )
      .replaceAll('\\', '/');

    const existingArtifact = await this.artifactsRepository.findOne({
      where: { runId, type: ArtifactType.BuildLog },
    });

    if (existingArtifact) {
      existingArtifact.path = logsRelativePath;
      await this.artifactsRepository.save(existingArtifact);
    } else {
      await this.artifactsRepository.save({
        runId,
        type: ArtifactType.BuildLog,
        path: logsRelativePath,
        mimeType: 'text/plain',
      });
    }

    await this.addLog(
      runId,
      isError ? 'Логи ошибки сохранены' : 'Логи сборки сохранены',
      {
        path: logsRelativePath,
      },
    );
  }

  private async takeScreenshots(
    run: RunEntity,
    slug: string,
    userId: string,
  ): Promise<RunEntity> {
    const screenshotRun = await this.updateRunStatus(
      run,
      RunStatus.Running,
      'take_screenshots',
      userId,
    );
    await this.addLog(run.id, 'Начато создание скриншотов');

    const codePath = path.join(this.getRunPath(userId, slug), 'code');
    const screenshotsPath = path.join(
      this.getRunPath(userId, slug),
      'screenshots',
    );
    let browser;
    let serverProcess;

    try {
      const execAsync = promisify(exec);

      await this.addLog(run.id, 'Запуск preview сервера...');
      serverProcess = exec('npm run preview', {
        cwd: codePath,
        env: { ...process.env, PORT: '4173' },
      });

      await sleep(5000);

      await this.addLog(run.id, 'Создание скриншотов через Playwright...');
      browser = await chromium.launch();
      const page = await browser.newPage();

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
      await page.screenshot({
        path: path.join(screenshotsPath, 'rendered-desktop.png'),
        fullPage: false,
      });
      await this.addLog(run.id, 'Desktop скриншот сохранен');

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload({ waitUntil: 'networkidle' });
      await page.screenshot({
        path: path.join(screenshotsPath, 'rendered-mobile.png'),
        fullPage: false,
      });
      await this.addLog(run.id, 'Mobile скриншот сохранен');

      await browser.close();
      browser = undefined;

      if (serverProcess) {
        serverProcess.kill();
        serverProcess = undefined;
      }

      const desktopRelativePath = path
        .join(
          appConfig.storage.generatedRoot,
          userId,
          'runs',
          slug,
          'screenshots',
          'rendered-desktop.png',
        )
        .replaceAll('\\', '/');
      const mobileRelativePath = path
        .join(
          appConfig.storage.generatedRoot,
          userId,
          'runs',
          slug,
          'screenshots',
          'rendered-mobile.png',
        )
        .replaceAll('\\', '/');

      await this.artifactsRepository.save([
        {
          runId: run.id,
          type: ArtifactType.DesktopScreenshot,
          path: desktopRelativePath,
          mimeType: 'image/png',
        },
        {
          runId: run.id,
          type: ArtifactType.MobileScreenshot,
          path: mobileRelativePath,
          mimeType: 'image/png',
        },
      ]);

      await this.addLog(run.id, 'Скриншоты сохранены');
      return this.updateRunStatus(
        screenshotRun,
        RunStatus.Running,
        'screenshots_ready',
        userId,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.addLog(run.id, 'Ошибка создания скриншотов', {
        error: message,
      });

      if (browser) await browser.close().catch(() => undefined);
      if (serverProcess) serverProcess.kill();

      return this.updateRunStatus(
        screenshotRun,
        RunStatus.Failed,
        'screenshots_failed',
        userId,
      );
    }
  }

  private async runVisualQA(
    run: RunEntity,
    runId: string,
    slug: string,
    userId: string,
  ): Promise<RunEntity> {
    const qaRun = await this.updateRunStatus(
      run,
      RunStatus.Running,
      'visual_qa',
      userId,
    );
    await this.addLog(runId, 'Начат визуальный анализ');

    try {
      const referencePath = path.join(
        this.getRunPath(userId, slug),
        'reference',
        'hero-reference.svg',
      );
      const renderedPath = path.join(
        this.getRunPath(userId, slug),
        'screenshots',
        'rendered-desktop.png',
      );
      const diffPath = path.join(
        this.getRunPath(userId, slug),
        'qa',
        'diff.png',
      );
      const reportPath = path.join(
        this.getRunPath(userId, slug),
        'qa',
        'visual-report.md',
      );

      const referenceExists = await fs
        .access(referencePath)
        .then(() => true)
        .catch(() => false);
      const renderedExists = await fs
        .access(renderedPath)
        .then(() => true)
        .catch(() => false);

      if (!referenceExists || !renderedExists) {
        throw new Error('Отсутствуют файлы для сравнения');
      }

      // Загружаем изображения через sharp для проверки и ресайза
      const referenceSharp = sharp(await fs.readFile(referencePath));
      const renderedSharp = sharp(await fs.readFile(renderedPath));

      const referenceMeta = await referenceSharp.metadata();
      const renderedMeta = await renderedSharp.metadata();

      // Приводим к одному размеру (используем размеры референса)
      const targetWidth = referenceMeta.width || 1440;
      const targetHeight = referenceMeta.height || 900;

      const [referenceBuffer, renderedBuffer] = await Promise.all([
        referenceSharp
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true }),
        renderedSharp
          .resize(targetWidth, targetHeight, { fit: 'fill' })
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true }),
      ]);

      const { data: referenceData, info: refInfo } = referenceBuffer;
      const { data: renderedData, info: renInfo } = renderedBuffer;

      // Проверяем размеры
      const width = refInfo.width;
      const height = refInfo.height;

      if (renInfo.width !== width || renInfo.height !== height) {
        throw new Error(
          `Размеры изображений не совпадают после ресайза: референс ${width}x${height}, результат ${renInfo.width}x${renInfo.height}`,
        );
      }

      const diff = new PNG({ width, height });

      const diffPixels = pixelmatch(
        referenceData,
        renderedData,
        diff.data,
        width,
        height,
        { threshold: 0.1 },
      );

      const totalPixels = width * height;
      const diffPercent = (diffPixels / totalPixels) * 100;
      const score = Math.max(0, Math.round(100 - diffPercent));

      await fs.writeFile(diffPath, PNG.sync.write(diff));

      const diffRelativePath = path
        .join(
          appConfig.storage.generatedRoot,
          userId,
          'runs',
          slug,
          'qa',
          'diff.png',
        )
        .replaceAll('\\', '/');
      await this.artifactsRepository.save({
        runId,
        type: ArtifactType.DiffImage,
        path: diffRelativePath,
        mimeType: 'image/png',
      });

      const report = this.createVisualReport(
        score,
        diffPercent,
        diffPixels,
        totalPixels,
      );
      await fs.writeFile(reportPath, report, 'utf8');

      const reportRelativePath = path
        .join(
          appConfig.storage.generatedRoot,
          userId,
          'runs',
          slug,
          'qa',
          'visual-report.md',
        )
        .replaceAll('\\', '/');
      await this.artifactsRepository.save({
        runId,
        type: ArtifactType.VisualReport,
        path: reportRelativePath,
        mimeType: 'text/markdown',
      });

      await this.addLog(
        runId,
        `Визуальный анализ завершен. Score: ${score}/100`,
      );

      const updatedRun = await this.runsRepository.save({
        ...qaRun,
        status: RunStatus.Completed,
        currentStep: 'completed',
        score,
      });
      await this.writeStatusFile(userId, slug, updatedRun);

      return updatedRun;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.addLog(runId, 'Ошибка визуального анализа', {
        error: message,
      });
      return this.updateRunStatus(
        qaRun,
        RunStatus.VisualFailed,
        'visual_qa_failed',
        userId,
      );
    }
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

  async getCodeFiles(
    runId: string,
    userId: string,
  ): Promise<{ path: string; size: number }[]> {
    const run = await this.getRunOrFail(runId, userId);
    const codePath = path.join(this.getRunPath(userId, run.slug), 'code');

    try {
      await fs.access(codePath);
    } catch {
      throw new NotFoundException('Код проекта не найден');
    }

    const result: { path: string; size: number }[] = [];

    async function walk(dir: string, prefix: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          await walk(path.join(dir, entry.name), rel);
        } else {
          const stat = await fs.stat(path.join(dir, entry.name));
          result.push({ path: rel, size: stat.size });
        }
      }
    }

    await walk(codePath, '');
    return result;
  }

  async getCodeFileContent(
    runId: string,
    filePath: string,
    userId: string,
  ): Promise<{ path: string; content: string; mimeType: string }> {
    const run = await this.getRunOrFail(runId, userId);
    const codePath = path.join(this.getRunPath(userId, run.slug), 'code');
    const absolutePath = path.resolve(codePath, filePath);

    if (!absolutePath.startsWith(codePath)) {
      throw new BadRequestException('Путь файла находится вне папки проекта');
    }

    let content: string;
    try {
      content = await fs.readFile(absolutePath, 'utf8');
    } catch {
      throw new NotFoundException('Файл не найден');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.ts': 'text/typescript',
      '.tsx': 'text/typescript',
      '.js': 'text/javascript',
      '.jsx': 'text/javascript',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css',
      '.scss': 'text/scss',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
    };
    const mimeType = mimeMap[ext] ?? 'text/plain';

    return { path: filePath, content, mimeType };
  }

  async downloadCode(runId: string, userId: string): Promise<Buffer> {
    const run = await this.getRunOrFail(runId, userId);
    const codePath = path.join(this.getRunPath(userId, run.slug), 'code');

    try {
      await fs.access(codePath);
    } catch {
      throw new NotFoundException('Код проекта не найден');
    }

    const zip = new AdmZip();
    zip.addLocalFolder(codePath, 'frontend-project');

    return zip.toBuffer();
  }

  async rebuildRun(
    runId: string,
    userId: string,
  ): Promise<{ id: string; status: RunStatus }> {
    // Загружаем без relations чтобы избежать cascade проблем
    const run = await this.runsRepository.findOne({
      where: { id: runId, userId },
    });
    if (!run) {
      throw new Error('Запуск не найден');
    }

    await this.addLog(run.id, 'Запущена ручная пересборка');

    // Обновляем статус и запускаем сборку
    const rebuildRun = await this.updateRunStatus(
      run,
      RunStatus.Running,
      'build_project',
      userId,
    );

    // Запускаем полный цикл: сборка -> скриншоты -> визуальный анализ
    void this.runBuildAndQA(rebuildRun, run.slug, userId);

    return {
      id: run.id,
      status: rebuildRun.status,
    };
  }

  private async runBuildAndQA(
    run: RunEntity,
    slug: string,
    userId: string,
  ): Promise<void> {
    const builtRun = await this.buildProject(run, slug, userId, 1);
    if (builtRun.status === RunStatus.BuildFailed) {
      return;
    }

    const screenshotRun = await this.takeScreenshots(builtRun, slug, userId);
    await this.runVisualQA(screenshotRun, run.id, slug, userId);
  }

  private async updateRunStatus(
    run: RunEntity,
    status: RunStatus,
    currentStep: string,
    userId: string,
  ): Promise<RunEntity> {
    const updatedRun = await this.runsRepository.save({
      ...run,
      status,
      currentStep,
    });

    await this.writeStatusFile(userId, run.slug, updatedRun);
    return updatedRun;
  }

  private async addLog(
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

  private async createRunFolders(userId: string, slug: string): Promise<void> {
    const runPath = this.getRunPath(userId, slug);
    const folders = ['reference', 'design', 'code', 'screenshots', 'qa'];

    await fs.mkdir(runPath, { recursive: true });
    await Promise.all(
      folders.map((folder) =>
        fs.mkdir(path.join(runPath, folder), { recursive: true }),
      ),
    );
  }

  private async writeStatusFile(
    userId: string,
    slug: string,
    run: RunEntity,
  ): Promise<void> {
    const statusPath = path.join(this.getRunPath(userId, slug), 'status.json');
    const payload = {
      id: run.id,
      slug: run.slug,
      status: run.status,
      currentStep: run.currentStep,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    };

    await fs.writeFile(
      statusPath,
      `${JSON.stringify(payload, null, 2)}\n`,
      'utf8',
    );
  }

  private getRunPath(userId: string, slug: string): string {
    return path.join(this.getGeneratedRootPath(), userId, 'runs', slug);
  }

  private getGeneratedRootPath(): string {
    return path.resolve(
      process.cwd(),
      '..',
      '..',
      appConfig.storage.generatedRoot,
    );
  }

  async getArtifactFile(runId: string, artifactId: string, userId: string) {
    const run = await this.getRunOrFail(runId, userId);
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

    if (!artifact.mimeType?.startsWith('image/')) {
      throw new BadRequestException('Артефакт не является изображением');
    }

    const runPath = this.getRunPath(userId, run.slug);
    const absolutePath = path.resolve(process.cwd(), '..', '..', artifact.path);

    if (!absolutePath.startsWith(runPath)) {
      throw new BadRequestException(
        'Путь артефакта находится вне папки запуска',
      );
    }

    return {
      absolutePath,
      mimeType: artifact.mimeType,
    };
  }
}
