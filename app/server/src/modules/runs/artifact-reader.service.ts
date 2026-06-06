import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import AdmZip from 'adm-zip';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Repository } from 'typeorm';

import { ArtifactType } from '../../common/enums';
import { RunArtifactEntity } from '../../db/entities';
import { inferMimeType, isPathInsideDirectory } from '../../common/utils';
import type { StyleVariant, StyleVariantsResult } from '../ai/types';
import { StorageService } from '../storage/storage.service';
import { RunsCrudService } from './runs-crud.service';

@Injectable()
export class ArtifactReaderService {
  constructor(
    @InjectRepository(RunArtifactEntity)
    private readonly artifactsRepository: Repository<RunArtifactEntity>,
    private readonly storageService: StorageService,
    private readonly crud: RunsCrudService,
  ) {}

  async getArtifactContent(runId: string, artifactId: string, userId: string) {
    await this.crud.getRunLightOrFail(runId, userId);
    const artifact = await this.getArtifactOrFail(artifactId, runId);

    let effectiveMimeType = artifact.mimeType;
    if (!effectiveMimeType) {
      effectiveMimeType = inferMimeType(artifact.path);
    }

    if (
      !effectiveMimeType?.includes('json') &&
      !effectiveMimeType?.startsWith('text/')
    ) {
      throw new BadRequestException('Artifact is not a text file');
    }

    const absolutePath = this.resolveArtifactPath(artifact.path);

    try {
      await fs.access(absolutePath);
    } catch {
      throw new NotFoundException('Artifact file not found on disk');
    }

    const content = await fs.readFile(absolutePath, 'utf8');

    return {
      artifactId: artifact.id,
      type: artifact.type,
      path: artifact.path,
      mimeType: effectiveMimeType,
      content,
    };
  }

  async getStyleVariantsContent(
    runId: string,
    userId: string,
  ): Promise<StyleVariantsResult> {
    await this.crud.getRunLightOrFail(runId, userId);
    const artifact = await this.artifactsRepository.findOne({
      where: { runId, type: ArtifactType.StyleVariants },
    });

    if (!artifact) {
      throw new NotFoundException('Style variants artifact not found');
    }

    const { content } = await this.getArtifactContent(
      runId,
      artifact.id,
      userId,
    );
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BadRequestException(
        'Style variants artifact contains invalid JSON',
      );
    }

    if (!isStyleVariantsResult(parsed)) {
      throw new BadRequestException(
        'Style variants artifact has invalid structure',
      );
    }

    return parsed;
  }

  async getArtifactFile(runId: string, artifactId: string, userId: string) {
    await this.crud.getRunLightOrFail(runId, userId);
    const artifact = await this.getArtifactOrFail(artifactId, runId);

    if (!artifact.mimeType?.startsWith('image/')) {
      throw new BadRequestException('Artifact is not an image');
    }

    const absolutePath = this.resolveArtifactPath(artifact.path);

    try {
      await fs.access(absolutePath);
    } catch {
      throw new NotFoundException('Artifact file not found on disk');
    }

    return {
      absolutePath,
      mimeType: artifact.mimeType,
    };
  }

  async getCodeFiles(
    runId: string,
    userId: string,
  ): Promise<{ path: string; size: number }[]> {
    const run = await this.crud.getRunLightOrFail(runId, userId);
    const codePath = path.join(
      this.storageService.getRunPath(userId, run.id),
      'code',
    );

    try {
      await fs.access(codePath);
    } catch {
      throw new NotFoundException('Project code not found');
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
    const run = await this.crud.getRunLightOrFail(runId, userId);
    const codePath = path.join(
      this.storageService.getRunPath(userId, run.id),
      'code',
    );
    const absolutePath = path.resolve(codePath, filePath);

    if (!isPathInsideDirectory(codePath, absolutePath)) {
      throw new BadRequestException(
        'File path is outside the project directory',
      );
    }

    let content: string;
    try {
      content = await fs.readFile(absolutePath, 'utf8');
    } catch {
      throw new NotFoundException('File not found');
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
    const run = await this.crud.getRunLightOrFail(runId, userId);
    const codePath = path.join(
      this.storageService.getRunPath(userId, run.id),
      'code',
    );

    try {
      await fs.access(codePath);
    } catch {
      throw new NotFoundException('Project code not found');
    }

    const zip = new AdmZip();
    zip.addLocalFolder(codePath, 'frontend-project');

    return zip.toBuffer();
  }

  // ===================== Private helpers =====================

  private async getArtifactOrFail(
    artifactId: string,
    runId: string,
  ): Promise<RunArtifactEntity> {
    const artifact = await this.artifactsRepository.findOne({
      where: { id: artifactId, runId },
    });

    if (!artifact) {
      throw new NotFoundException('Artifact not found');
    }

    return artifact;
  }

  private resolveArtifactPath(artifactPath: string): string {
    return path.join(this.storageService.getGeneratedRootPath(), artifactPath);
  }
}

function isStyleVariantsResult(value: unknown): value is StyleVariantsResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const variants = (value as { variants?: unknown }).variants;
  return Array.isArray(variants) && variants.every(isStyleVariant);
}

function isStyleVariant(value: unknown): value is StyleVariant {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const variant = value as Partial<Record<keyof StyleVariant, unknown>>;
  return (
    typeof variant.id === 'string' &&
    typeof variant.name === 'string' &&
    typeof variant.description === 'string' &&
    typeof variant.visualStyle === 'string' &&
    Array.isArray(variant.colorPalette) &&
    variant.colorPalette.every((color) => typeof color === 'string') &&
    typeof variant.typographyStyle === 'string' &&
    typeof variant.layoutStyle === 'string' &&
    Array.isArray(variant.moodKeywords) &&
    variant.moodKeywords.every((keyword) => typeof keyword === 'string')
  );
}
