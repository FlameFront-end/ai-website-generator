import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { appConfig } from '../../app/config';
import type { RunEntity } from '../../db/entities';

@Injectable()
export class StorageService {
  getGeneratedRootPath(): string {
    return path.resolve(
      process.cwd(),
      '..',
      '..',
      appConfig.storage.generatedRoot,
    );
  }

  getRunPath(userId: string, slug: string): string {
    return path.join(this.getGeneratedRootPath(), userId, 'runs', slug);
  }

  getRunRelativePath(
    userId: string,
    slug: string,
    ...segments: string[]
  ): string {
    return path.join(userId, 'runs', slug, ...segments).replaceAll('\\', '/');
  }

  resolveArtifactPath(artifactPath: string): string {
    const prefix = appConfig.storage.generatedRoot + '/';

    if (!artifactPath.startsWith(prefix)) {
      throw new Error(
        `Artifact path "${artifactPath}" does not start with "${prefix}"`,
      );
    }

    const relativePath = artifactPath.slice(prefix.length);

    return path.join(this.getGeneratedRootPath(), relativePath);
  }

  async createRunFolders(userId: string, slug: string): Promise<void> {
    const runPath = this.getRunPath(userId, slug);
    const folders = [
      'reference',
      'design',
      'code',
      'screenshots',
      'qa',
    ] as const;

    console.log(`[Storage] Creating run folders at: ${runPath}`);
    await fs.mkdir(runPath, { recursive: true });
    await Promise.all(
      folders.map((folder) => {
        const folderPath = path.join(runPath, folder);
        console.log(`[Storage] Creating folder: ${folderPath}`);
        return fs.mkdir(folderPath, { recursive: true });
      }),
    );
    console.log(`[Storage] ✅ All folders created for run ${slug}`);
  }

  async writeStatusFile(
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
}
