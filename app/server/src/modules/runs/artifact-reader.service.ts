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

import { RunArtifactEntity } from '../../db/entities';
import { inferMimeType } from '../../common/utils';
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
    await this.crud.getRunOrFail(runId, userId);
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

  async getArtifactFile(runId: string, artifactId: string, userId: string) {
    await this.crud.getRunOrFail(runId, userId);
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
    const run = await this.crud.getRunOrFail(runId, userId);
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
    const run = await this.crud.getRunOrFail(runId, userId);
    const codePath = path.join(
      this.storageService.getRunPath(userId, run.id),
      'code',
    );
    const absolutePath = path.resolve(codePath, filePath);

    if (!absolutePath.startsWith(codePath)) {
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
    const run = await this.crud.getRunOrFail(runId, userId);
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
      relations: { run: true },
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
