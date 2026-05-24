import { Injectable, Logger } from '@nestjs/common';
import path from 'node:path';

import type { CodePlan, ProjectSpec } from '../ai/types';
import type { GeneratedFile } from './code-generator.service';

@Injectable()
export class CodeValidationService {
  private readonly logger = new Logger(CodeValidationService.name);

  normalizeGeneratedFiles(files: GeneratedFile[]): GeneratedFile[] {
    const allowedExtensions = new Set(['.ts', '.tsx', '.css']);
    const forbiddenPaths = new Set([
      'package.json',
      'next.config.mjs',
      'tsconfig.json',
      'tailwind.config.ts',
      'postcss.config.mjs',
      'next-env.d.ts',
      'README.md',
    ]);

    const normalizedFiles = files
      .filter((file) => {
        const normalizedPath = file.path.replaceAll('\\', '/');
        const canonicalPath = this.canonicalizeGeneratedPath(normalizedPath);
        const extension = path.extname(normalizedPath);

        return (
          normalizedPath &&
          !path.isAbsolute(normalizedPath) &&
          !normalizedPath.split('/').includes('..') &&
          !forbiddenPaths.has(canonicalPath) &&
          allowedExtensions.has(extension)
        );
      })
      .map((file) => ({
        path: this.canonicalizeGeneratedPath(file.path.replaceAll('\\', '/')),
        content: file.content,
      }));

    const duplicatePaths = this.findDuplicateGeneratedPaths(normalizedFiles);
    if (duplicatePaths.length > 0) {
      throw new Error(
        `AI returned duplicate files after path normalization: ${duplicatePaths.join(', ')}`,
      );
    }

    const emptyFiles = normalizedFiles
      .filter((file) => !file.content.trim())
      .map((file) => file.path);
    if (emptyFiles.length > 0) {
      throw new Error(`AI returned empty files: ${emptyFiles.join(', ')}`);
    }

    const requiredPaths = [
      'src/app/page.tsx',
      'src/app/layout.tsx',
      'src/app/globals.css',
      'src/components/landing/landing-page.tsx',
    ];
    const paths = new Set(normalizedFiles.map((file) => file.path));
    const missingPaths = requiredPaths.filter(
      (requiredPath) => !paths.has(requiredPath),
    );

    if (missingPaths.length > 0) {
      this.logger.warn(
        `AI returned files: ${normalizedFiles.map((file) => file.path).join(', ')}`,
      );
      throw new Error(
        `AI did not return required Next.js files: ${missingPaths.join(', ')}`,
      );
    }

    this.validateGeneratedFileReferences(normalizedFiles);

    return normalizedFiles;
  }

  normalizeCodePlan(codePlan: CodePlan, projectSpec: ProjectSpec): CodePlan {
    const plannedSections =
      codePlan.sections?.length > 0
        ? codePlan.sections
        : projectSpec.sections.map((section) => ({
            id: section.id,
            componentName: this.toPascalCase(`${section.id}-section`),
            filePath: `src/components/landing/${section.id}.tsx`,
            purpose: section.goal,
          }));

    return {
      architecture:
        codePlan.architecture || 'Next.js App Router landing page modules',
      files: codePlan.files ?? [],
      sections: plannedSections,
      sharedComponents: codePlan.sharedComponents ?? [],
    };
  }

  mergeGeneratedFiles(files: GeneratedFile[]): GeneratedFile[] {
    const byPath = new Map<string, GeneratedFile>();

    for (const file of files) {
      byPath.set(file.path.replaceAll('\\', '/'), {
        path: file.path.replaceAll('\\', '/'),
        content: file.content,
      });
    }

    return [...byPath.values()];
  }

  private toPascalCase(value: string): string {
    return value
      .split(/[^a-zа-я0-9]+/gi)
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join('');
  }

  private findDuplicateGeneratedPaths(files: GeneratedFile[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const file of files) {
      if (seen.has(file.path)) {
        duplicates.add(file.path);
      }
      seen.add(file.path);
    }

    return [...duplicates];
  }

  private canonicalizeGeneratedPath(filePath: string): string {
    const normalized = filePath.replace(/^\.\/+/, '');
    const lower = normalized.toLowerCase();

    const aliases: Record<string, string> = {
      'src/components/landing/landingpage.tsx':
        'src/components/landing/landing-page.tsx',
      'src/components/landing/landing-page/index.tsx':
        'src/components/landing/landing-page.tsx',
      'src/components/landing/index.tsx':
        'src/components/landing/landing-page.tsx',
      'src/components/landing/page.tsx':
        'src/components/landing/landing-page.tsx',
      'components/landing/landing-page.tsx':
        'src/components/landing/landing-page.tsx',
      'components/landing/landingpage.tsx':
        'src/components/landing/landing-page.tsx',
    };

    return aliases[lower] ?? normalized;
  }

  private validateGeneratedFileReferences(files: GeneratedFile[]): void {
    const paths = new Set(files.map((file) => file.path));
    const importPattern =
      /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

    for (const file of files) {
      if (!['.ts', '.tsx'].includes(path.posix.extname(file.path))) {
        continue;
      }

      const currentDir = path.posix.dirname(file.path);
      const missingImports = new Set<string>();
      let match: RegExpExecArray | null;

      while ((match = importPattern.exec(file.content)) !== null) {
        const specifier = match[1] ?? match[2];
        const resolvedPath = this.resolveGeneratedImportPath(
          specifier,
          currentDir,
        );

        if (specifier.startsWith('../')) {
          throw new Error(
            `AI returned ${file.path} with parent-directory import: ${specifier}`,
          );
        }

        if (!resolvedPath) {
          continue;
        }

        if (!this.hasGeneratedImportTarget(paths, resolvedPath)) {
          missingImports.add(specifier);
        }
      }

      if (missingImports.size > 0) {
        throw new Error(
          `AI returned ${file.path} with missing local imports: ${[
            ...missingImports,
          ].join(', ')}`,
        );
      }
    }
  }

  private resolveGeneratedImportPath(
    specifier: string,
    currentDir: string,
  ): string | null {
    if (specifier.startsWith('@/')) {
      return path.posix.normalize(`src/${specifier.slice(2)}`);
    }

    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      const resolvedPath = path.posix.normalize(
        path.posix.join(currentDir, specifier),
      );

      return resolvedPath.startsWith('src/') ? resolvedPath : null;
    }

    return null;
  }

  private hasGeneratedImportTarget(paths: Set<string>, importPath: string) {
    if (paths.has(importPath)) {
      return true;
    }

    const candidates = [
      `${importPath}.ts`,
      `${importPath}.tsx`,
      `${importPath}.css`,
      path.posix.join(importPath, 'index.ts'),
      path.posix.join(importPath, 'index.tsx'),
    ];

    return candidates.some((candidate) => paths.has(candidate));
  }
}
