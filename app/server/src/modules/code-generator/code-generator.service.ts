import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { DesignTokens, ProjectSpec } from '../ai/ai.types';

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface ProjectManifest {
  projectType: string;
  title: string;
  entrypoint: string;
  files: string[];
  commands: {
    install: string;
    dev: string;
    build: string;
  };
}

@Injectable()
export class CodeGeneratorService {
  /**
   * Generate all project files based on spec and tokens
   */
  async generateProjectFiles(
    projectSpec: ProjectSpec,
    designTokens: DesignTokens,
    codePath: string,
  ): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [
      {
        path: 'package.json',
        content: this.createPackageJson(projectSpec),
      },
      {
        path: 'index.html',
        content: this.createIndexHtml(projectSpec),
      },
      {
        path: 'tsconfig.json',
        content: this.createTsConfig(),
      },
      {
        path: 'vite.config.ts',
        content: this.createViteConfig(),
      },
      {
        path: 'src/main.tsx',
        content: this.createMainTsx(projectSpec),
      },
      {
        path: 'src/styles.css',
        content: this.createStyles(designTokens),
      },
      {
        path: 'src/vite-env.d.ts',
        content: '/// <reference types="vite/client" />\n',
      },
    ];

    await this.writeFiles(files, codePath);

    return files;
  }

  /**
   * Generate project manifest
   */
  generateManifest(
    projectSpec: ProjectSpec,
    files: GeneratedFile[],
  ): ProjectManifest {
    return {
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
  }

  /**
   * Generate reference SVG
   */
  generateReferenceSvg(
    projectSpec: ProjectSpec,
    designTokens: DesignTokens,
  ): string {
    const headline = this.escapeXml(projectSpec.copy.headline);
    const description = this.escapeXml(projectSpec.copy.description);
    const primaryButton = this.escapeXml(projectSpec.copy.primaryButton);
    const secondaryButton = this.escapeXml(projectSpec.copy.secondaryButton);
    const background = designTokens.colors.background;
    const textPrimary = designTokens.colors.textPrimary;
    const textSecondary = designTokens.colors.textSecondary;
    const accent = designTokens.colors.accent;
    const surface = designTokens.colors.surface
      .replaceAll('rgba', 'rgb')
      .replace(/,\s*0\.\d+\)/, ')');
    const border = designTokens.colors.border
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

  private async writeFiles(
    files: GeneratedFile[],
    basePath: string,
  ): Promise<void> {
    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(basePath, file.path);
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, file.content, 'utf8');
      }),
    );
  }

  private createPackageJson(projectSpec: ProjectSpec): string {
    const packageName = projectSpec.copy.headline
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

  private createIndexHtml(projectSpec: ProjectSpec): string {
    return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${this.escapeXml(projectSpec.copy.headline)}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
  }

  private createTsConfig(): string {
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

  private createViteConfig(): string {
    return `import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
});
`;
  }

  private createMainTsx(projectSpec: ProjectSpec): string {
    return `import React from 'react';
import ReactDOM from 'react-dom/client';

import './styles.css';

const content = {
  headline: '${this.escapeGeneratedString(projectSpec.copy.headline)}',
  description: '${this.escapeGeneratedString(projectSpec.copy.description)}',
  primaryButton: '${this.escapeGeneratedString(projectSpec.copy.primaryButton)}',
  secondaryButton: '${this.escapeGeneratedString(projectSpec.copy.secondaryButton)}',
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

  private createStyles(designTokens: DesignTokens): string {
    return `:root {
  color: ${designTokens.colors.textPrimary};
  background: ${designTokens.colors.background};
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
    ${designTokens.colors.background};
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.75fr);
  gap: 56px;
  align-items: center;
  width: min(${designTokens.layout.containerWidth}, calc(100% - 40px));
  min-height: 100vh;
  margin: 0 auto;
  padding: ${designTokens.layout.sectionPaddingY} 0;
}

.hero__content {
  display: grid;
  gap: 28px;
}

.eyebrow {
  margin: 0;
  color: ${designTokens.colors.accent};
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  max-width: 780px;
  margin: 0;
  color: ${designTokens.colors.textPrimary};
  font-size: clamp(44px, 8vw, ${designTokens.typography.headlineSize});
  font-weight: ${designTokens.typography.headlineWeight};
  line-height: ${designTokens.typography.lineHeight};
}

.lead {
  max-width: 640px;
  margin: 0;
  color: ${designTokens.colors.textSecondary};
  font-size: ${designTokens.typography.bodySize};
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
  border-radius: ${designTokens.components.buttonRadius};
  padding: 0 24px;
  font-weight: 800;
}

.button--primary {
  background: ${designTokens.colors.accent};
  color: #ffffff;
  box-shadow: 0 20px 50px rgba(124, 58, 237, 0.32);
}

.button--secondary {
  border: 1px solid ${designTokens.colors.border};
  background: ${designTokens.colors.surface};
}

.product-card {
  display: grid;
  gap: 22px;
  border: 1px solid ${designTokens.colors.border};
  border-radius: ${designTokens.components.cardRadius};
  padding: 28px;
  background: ${designTokens.colors.surface};
  box-shadow: ${designTokens.components.cardShadow};
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
  color: ${designTokens.colors.textSecondary};
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.metric-grid div {
  display: grid;
  gap: 8px;
  border: 1px solid ${designTokens.colors.border};
  border-radius: 18px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.05);
}

.product-card strong {
  color: ${designTokens.colors.textPrimary};
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

  private escapeXml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }

  private escapeGeneratedString(value: string): string {
    return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
  }
}
