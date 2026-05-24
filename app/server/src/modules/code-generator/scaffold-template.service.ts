import { Injectable, type OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { GeneratedFile, ProjectSpec } from '../ai/types';

const TEMPLATES_DIR = path.join(__dirname, 'templates');

@Injectable()
export class ScaffoldTemplateService implements OnModuleInit {
  private readonly cache = new Map<string, string>();

  onModuleInit(): void {
    this.preloadTemplates();
  }

  createScaffoldingFiles(projectSpec: ProjectSpec): GeneratedFile[] {
    const packageName =
      projectSpec.copy.headline
        .toLowerCase()
        .replace(/[^a-zа-я0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'generated-landing';

    return [
      {
        path: 'package.json',
        content: this.render('scaffold/package.json', {
          PACKAGE_NAME: packageName,
        }),
      },
      {
        path: 'next.config.mjs',
        content: this.load('scaffold/next.config.mjs'),
      },
      { path: 'tsconfig.json', content: this.load('scaffold/tsconfig.json') },
      {
        path: 'tailwind.config.ts',
        content: this.load('scaffold/tailwind.config.ts'),
      },
      {
        path: 'postcss.config.mjs',
        content: this.load('scaffold/postcss.config.mjs'),
      },
      { path: 'next-env.d.ts', content: this.load('scaffold/next-env.d.ts') },
      {
        path: 'README.md',
        content: this.render('scaffold/README.md', {
          HEADLINE: projectSpec.copy.headline,
        }),
      },
    ];
  }

  private load(relativePath: string): string {
    const cached = this.cache.get(relativePath);
    if (cached !== undefined) return cached;

    const content = readFileSync(
      path.join(TEMPLATES_DIR, relativePath),
      'utf8',
    );
    this.cache.set(relativePath, content);
    return content;
  }

  private render(relativePath: string, vars: Record<string, string>): string {
    let content = this.load(relativePath);
    for (const [key, value] of Object.entries(vars)) {
      content = content.replaceAll(`{{${key}}}`, value);
    }
    return content;
  }

  private preloadTemplates(): void {
    const templatePaths = [
      'scaffold/package.json',
      'scaffold/next.config.mjs',
      'scaffold/tsconfig.json',
      'scaffold/tailwind.config.ts',
      'scaffold/postcss.config.mjs',
      'scaffold/next-env.d.ts',
      'scaffold/README.md',
    ];

    for (const p of templatePaths) {
      this.load(p);
    }
  }
}
