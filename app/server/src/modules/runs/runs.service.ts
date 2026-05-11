import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Repository } from 'typeorm';

import { appConfig } from '../../app/config';
import { ArtifactType, RunArtifactEntity, RunEntity, RunLogEntity, RunLogLevel, RunStatus } from '../../db/entities';
import type { CreateRunDto } from './dto/create-run.dto';

const RUN_NUMBER_PAD = 3;

type ProjectSpec = {
  siteType: string;
  sectionType: string;
  style: string[];
  audience: string;
  requiredElements: string[];
  copy: {
    headline: string;
    description: string;
    primaryButton: string;
    secondaryButton: string;
  };
  visualPreferences: string[];
};

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

function extractLineValue(brief: string, label: string, fallback: string): string {
  const match = brief.match(new RegExp(`${label}\\s*:\\s*(.+)`, 'i'));
  return match?.[1]?.trim() || fallback;
}

function extractStyleItems(brief: string): string[] {
  const styleBlock = brief.match(/стиль\s*:\s*([\s\S]*?)(?:\n\s*\n|текст\s*:|$)/i)?.[1] ?? '';
  const items = styleBlock
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);

  return items.length > 0 ? items : ['modern'];
}

function createProjectSpec(brief: string): ProjectSpec {
  const style = extractStyleItems(brief);
  const hasProductCard = /карточк[аи]\s+продукт|product\s+card/i.test(brief);

  return {
    siteType: /лендинг|landing/i.test(brief) ? 'landing' : 'website',
    sectionType: /hero|первый экран|hero-блок/i.test(brief) ? 'hero' : 'hero',
    style,
    audience: /финансов/i.test(brief) ? 'finance teams' : 'general audience',
    requiredElements: [
      'headline',
      'description',
      'primaryButton',
      'secondaryButton',
      ...(hasProductCard ? ['productCard'] : []),
    ],
    copy: {
      headline: extractLineValue(brief, 'Заголовок', 'AI-powered landing page'),
      description: extractLineValue(brief, 'Описание', 'Generate a clear hero section from a product brief.'),
      primaryButton: extractLineValue(brief, 'Основная кнопка', 'Get started'),
      secondaryButton: extractLineValue(brief, 'Вторая кнопка', 'View demo'),
    },
    visualPreferences: style,
  };
}

@Injectable()
export class RunsService {
  constructor(
    @InjectRepository(RunEntity)
    private readonly runsRepository: Repository<RunEntity>,
    @InjectRepository(RunArtifactEntity)
    private readonly artifactsRepository: Repository<RunArtifactEntity>,
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
    await this.addLog(run.id, 'Run was queued', { slug });

    const completedRun = await this.prepareBrief(run);

    return {
      id: completedRun.id,
      slug: completedRun.slug,
      status: completedRun.status,
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

  async getArtifactContent(runId: string, artifactId: string) {
    const artifact = await this.artifactsRepository.findOne({
      where: {
        id: artifactId,
        runId,
      },
      relations: {
        run: true,
      },
    });

    if (!artifact) {
      throw new NotFoundException('Artifact not found');
    }

    if (!artifact.mimeType?.includes('json') && !artifact.mimeType?.startsWith('text/')) {
      throw new BadRequestException('Artifact is not a text artifact');
    }

    const runPath = this.getRunPath(artifact.run.slug);
    const absolutePath = path.resolve(process.cwd(), '..', '..', artifact.path);

    if (!absolutePath.startsWith(runPath)) {
      throw new BadRequestException('Artifact path is outside of the run directory');
    }

    const content = await fs.readFile(absolutePath, 'utf8');

    return {
      artifactId: artifact.id,
      type: artifact.type,
      path: artifact.path,
      mimeType: artifact.mimeType,
      content,
    };
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

  private async prepareBrief(run: RunEntity): Promise<RunEntity> {
    const runningRun = await this.updateRunStatus(run, RunStatus.Running, 'prepare_brief');
    await this.addLog(run.id, 'Brief parsing started');

    const projectSpec = createProjectSpec(run.brief);
    const relativePath = path.join(appConfig.storage.generatedRoot, run.slug, 'project-spec.json').replaceAll('\\', '/');
    const absolutePath = path.join(this.getRunPath(run.slug), 'project-spec.json');

    await fs.writeFile(absolutePath, `${JSON.stringify(projectSpec, null, 2)}\n`, 'utf8');
    await this.artifactsRepository.save({
      runId: run.id,
      type: ArtifactType.ProjectSpec,
      path: relativePath,
      mimeType: 'application/json',
    });
    await this.addLog(run.id, 'Project spec saved', { path: relativePath });

    return this.updateRunStatus(runningRun, RunStatus.Completed, 'project_spec_ready');
  }

  private async updateRunStatus(run: RunEntity, status: RunStatus, currentStep: string): Promise<RunEntity> {
    const updatedRun = await this.runsRepository.save({
      ...run,
      status,
      currentStep,
    });

    await this.writeStatusFile(run.slug, updatedRun);
    return updatedRun;
  }

  private async addLog(runId: string, message: string, metadata: Record<string, unknown> | null = null): Promise<void> {
    await this.logsRepository.save({
      runId,
      level: RunLogLevel.Info,
      message,
      metadata,
    });
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
