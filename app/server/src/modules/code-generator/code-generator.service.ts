import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { DesignTokens, ProjectSpec } from '../ai/ai.types';
import { AiService } from '../ai/ai.service';

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
  private readonly logger = new Logger(CodeGeneratorService.name);

  constructor(private readonly aiService: AiService) {}

  /**
   * Generate all project files — scaffolding is templated, UI code comes from AI
   */
  async generateProjectFiles(
    brief: string,
    projectSpec: ProjectSpec,
    designTokens: DesignTokens,
    designDescription: string,
    codePath: string,
  ): Promise<GeneratedFile[]> {
    this.logger.log('Generating project files (scaffolding + AI code)');

    const aiCode = await this.aiService.generateCode(
      brief,
      projectSpec,
      designTokens,
      designDescription,
    );

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
        content: aiCode.mainTsx,
      },
      {
        path: 'src/styles.css',
        content: aiCode.stylesCss,
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
   * Generate reference SVG via AI
   */
  async generateReferenceSvg(
    brief: string,
    projectSpec: ProjectSpec,
    designTokens: DesignTokens,
    designDescription: string,
  ): Promise<string> {
    return this.aiService.generateReferenceSvg(
      brief,
      projectSpec,
      designTokens,
      designDescription,
    );
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

  private escapeXml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }
}
