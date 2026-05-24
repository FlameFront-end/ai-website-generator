import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ArtifactType } from '../../common/enums';
import { RunArtifactEntity } from '../../db/entities';

@Injectable()
export class ArtifactService {
  constructor(
    @InjectRepository(RunArtifactEntity)
    private readonly artifactsRepository: Repository<RunArtifactEntity>,
  ) {}

  async saveArtifact(
    runId: string,
    type: ArtifactType,
    relativePath: string,
    mimeType: string,
  ): Promise<void> {
    await this.artifactsRepository.save({
      runId,
      type,
      path: relativePath,
      mimeType,
    });
  }

  async deleteArtifactsByType(
    runId: string,
    type: ArtifactType,
  ): Promise<void> {
    await this.artifactsRepository.delete({ runId, type });
  }

  async getArtifactByType(
    runId: string,
    type: ArtifactType,
  ): Promise<RunArtifactEntity | null> {
    return this.artifactsRepository.findOne({
      where: { runId, type },
    });
  }

  async getArtifactsByType(
    runId: string,
    type: ArtifactType,
  ): Promise<RunArtifactEntity[]> {
    return this.artifactsRepository.find({
      where: { runId, type },
      order: { path: 'ASC' },
    });
  }

  async updateArtifact(
    runId: string,
    type: ArtifactType,
    relativePath: string,
    mimeType?: string,
  ): Promise<void> {
    const result = await this.artifactsRepository.update(
      { runId, type },
      { path: relativePath, ...(mimeType ? { mimeType } : {}) },
    );

    if (!result.affected) {
      await this.saveArtifact(
        runId,
        type,
        relativePath,
        mimeType ?? 'application/octet-stream',
      );
    }
  }
}
