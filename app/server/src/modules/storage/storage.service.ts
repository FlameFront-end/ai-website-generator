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

  getRunRelativePath(userId: string, slug: string, ...segments: string[]): string {
    return path
      .join(appConfig.storage.generatedRoot, userId, 'runs', slug, ...segments)
      .replaceAll('\\', '/');
  }

  async createRunFolders(userId: string, slug: string): Promise<void> {
    const runPath = this.getRunPath(userId, slug);
    const folders = ['reference', 'design', 'code', 'screenshots', 'qa'];

    await fs.mkdir(runPath, { recursive: true });
    await Promise.all(
      folders.map((folder) =>
        fs.mkdir(path.join(runPath, folder), { recursive: true }),
      ),
    );
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
