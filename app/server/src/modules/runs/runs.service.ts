import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Repository } from 'typeorm';

import { appConfig } from '../../app/config';
import { RunEntity, RunLogEntity, RunLogLevel, RunStatus } from '../../db/entities';
import type { CreateRunDto } from './dto/create-run.dto';

const RUN_NUMBER_PAD = 3;

function normalizeBrief(brief: unknown): string {
  if (typeof brief !== 'string') {
    throw new BadRequestException('brief must be a string');
  }

  const trimmedBrief = brief.trim();

  if (trimmedBrief.length < 10) {
    throw new BadRequestException('brief must contain at least 10 characters');
  }

  return trimmedBrief;
}

function toRunSlug(runNumber: number): string {
  return `run-${String(runNumber).padStart(RUN_NUMBER_PAD, '0')}`;
}

@Injectable()
export class RunsService {
  constructor(
    @InjectRepository(RunEntity)
    private readonly runsRepository: Repository<RunEntity>,
    @InjectRepository(RunLogEntity)
    private readonly logsRepository: Repository<RunLogEntity>,
  ) {}

  async createRun(dto: CreateRunDto) {
    const brief = normalizeBrief(dto?.brief);
    const runNumber = await this.getNextRunNumber();
    const slug = toRunSlug(runNumber);

    const run = await this.runsRepository.save({
      runNumber,
      slug,
      brief,
      status: RunStatus.Queued,
      currentStep: 'queued',
    });

    await this.createRunFolders(slug);
    await this.writeStatusFile(slug, run);
    await this.logsRepository.save({
      runId: run.id,
      level: RunLogLevel.Info,
      message: 'Run was queued',
      metadata: { slug },
    });

    return {
      id: run.id,
      slug: run.slug,
      status: run.status,
    };
  }

  getRuns(): Promise<RunEntity[]> {
    return this.runsRepository.find({
      relations: {
        artifacts: true,
        logs: true,
      },
      order: {
        createdAt: 'DESC',
        logs: {
          createdAt: 'DESC',
        },
      },
      take: 25,
    });
  }

  getRun(id: string): Promise<RunEntity | null> {
    return this.runsRepository.findOne({
      where: { id },
      relations: {
        artifacts: true,
        logs: true,
      },
      order: {
        logs: {
          createdAt: 'DESC',
        },
      },
    });
  }

  private async getNextRunNumber(): Promise<number> {
    const lastRun = await this.runsRepository.findOne({
      where: {},
      order: {
        runNumber: 'DESC',
      },
    });

    return (lastRun?.runNumber ?? 0) + 1;
  }

  private async createRunFolders(slug: string): Promise<void> {
    const runPath = this.getRunPath(slug);
    const folders = ['reference', 'design', 'code', 'screenshots', 'qa'];

    await fs.mkdir(runPath, { recursive: true });
    await Promise.all(folders.map((folder) => fs.mkdir(path.join(runPath, folder), { recursive: true })));
  }

  private async writeStatusFile(slug: string, run: RunEntity): Promise<void> {
    const statusPath = path.join(this.getRunPath(slug), 'status.json');
    const payload = {
      id: run.id,
      slug: run.slug,
      status: run.status,
      currentStep: run.currentStep,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    };

    await fs.writeFile(statusPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }

  private getRunPath(slug: string): string {
    return path.resolve(process.cwd(), '..', '..', appConfig.storage.generatedRoot, slug);
  }
}
