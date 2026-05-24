import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { getAppConfig } from '../../config/config.module';
import type { RunEntity } from '../../db/entities';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly generatedRoot: string;

  constructor(configService: ConfigService) {
    this.generatedRoot = getAppConfig(configService).storage.generatedRoot;
  }

  getGeneratedRootPath(): string {
    return path.resolve(process.cwd(), '..', '..', this.generatedRoot);
  }

  getRunPath(userId: string, slug: string): string {
    return path.join(this.getGeneratedRootPath(), userId, 'runs', slug);
  }

  getRunAbsolutePath(
    userId: string,
    slug: string,
    ...segments: string[]
  ): string {
    return path.join(this.getRunPath(userId, slug), ...segments);
  }

  getRunRelativePath(
    userId: string,
    slug: string,
    ...segments: string[]
  ): string {
    return path.join(userId, 'runs', slug, ...segments).replaceAll('\\', '/');
  }

  getArtifactAbsolutePath(relativePath: string): string {
    return path.resolve(this.getGeneratedRootPath(), relativePath);
  }

  resolveArtifactPath(artifactPath: string): string {
    const prefix = this.generatedRoot + '/';

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

    await fs.mkdir(runPath, { recursive: true });
    await Promise.all(
      folders.map((folder) =>
        fs.mkdir(path.join(runPath, folder), { recursive: true }),
      ),
    );
    this.logger.debug(`Run folders created: ${slug}`);
  }

  async writeGeneratedFile(
    absolutePath: string,
    content: string | Buffer,
  ): Promise<void> {
    const dir = path.dirname(absolutePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(absolutePath, content);
    this.logger.debug(
      `File written: ${absolutePath} (${Buffer.byteLength(content)} bytes)`,
    );
  }

  async readArtifactFile(relativePath: string): Promise<string> {
    const absolutePath = this.getArtifactAbsolutePath(relativePath);
    return fs.readFile(absolutePath, 'utf8');
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
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
