import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ReferenceContextSummary, StyleVariant } from '../ai/types';
import { ArtifactType, RunStatus } from '../../common/enums';
import { RunEntity } from '../../db/entities';
import { PIPELINE_STEP_DELAY_MS } from '../../common/constants/pipeline';
import { writeImageResultToFile, sleep } from '../../common/utils';
import { ImageGenerationService } from '../image-generation/image-generation.service';
import { StorageService } from '../storage/storage.service';
import { ArtifactService } from './artifact.service';
import { PipelineStateService } from './pipeline-state.service';

interface ReferenceSectionPlan {
  id: string;
  title: string;
  goal: string;
}

interface GeneratedReferenceBlock {
  section: ReferenceSectionPlan;
  relativePath: string;
  mimeType: string;
  model: string;
}

@Injectable()
export class ReferenceStepService {
  constructor(
    private readonly state: PipelineStateService,
    private readonly storageService: StorageService,
    private readonly artifactService: ArtifactService,
    private readonly imageGenerationService: ImageGenerationService,
  ) {}

  async prepareReferenceImage(
    run: RunEntity,
    selectedStyle: StyleVariant,
    userId: string,
  ): Promise<void> {
    const referenceRun = await this.state.updateRunStatus(
      run,
      RunStatus.Running,
      'prepare_reference_image',
      userId,
    );
    await this.state.addLog(
      run.id,
      `Preparing visual reference for style: ${selectedStyle.name}`,
    );
    await sleep(PIPELINE_STEP_DELAY_MS);

    const referenceBlocks = await this.generateReferenceBlockImages(
      referenceRun.brief,
      selectedStyle,
      userId,
      referenceRun.id,
    );

    for (const block of referenceBlocks) {
      await this.artifactService.saveArtifact(
        referenceRun.id,
        ArtifactType.ReferenceBlock,
        block.relativePath,
        block.mimeType,
      );
    }

    const primaryReference = referenceBlocks[0];

    if (primaryReference) {
      await this.artifactService.saveArtifact(
        referenceRun.id,
        ArtifactType.ReferenceImage,
        primaryReference.relativePath,
        primaryReference.mimeType,
      );
    }

    const referenceSummaryRelativePath = await this.saveReferenceContextSummary(
      referenceRun.id,
      userId,
      referenceRun.id,
      primaryReference?.relativePath ?? '',
      referenceBlocks,
      selectedStyle,
    );

    await this.state.addLog(referenceRun.id, 'Visual reference ready', {
      blocks: referenceBlocks.length,
      model: primaryReference?.model,
      path: primaryReference?.relativePath,
      summaryPath: referenceSummaryRelativePath,
    });

    await this.state.updateRunStatus(
      referenceRun,
      RunStatus.AwaitingReferenceApproval,
      'awaiting_reference_approval',
      userId,
    );
    await this.state.addLog(
      referenceRun.id,
      'Review the reference and approve the step',
    );
  }

  async regenerateReference(
    run: RunEntity,
    instruction: string,
    userId: string,
  ): Promise<void> {
    const selectedStyleArtifact = await this.artifactService.getArtifactByType(
      run.id,
      ArtifactType.SelectedStyle,
    );

    if (!selectedStyleArtifact) {
      await this.state.failRun(run, 'Selected style not found');
      return;
    }

    const styleContent = await this.storageService.readArtifactFile(
      selectedStyleArtifact.path,
    );
    const selectedStyle = JSON.parse(styleContent) as StyleVariant;

    const updatedStyle: StyleVariant = instruction
      ? {
          ...selectedStyle,
          description: `${selectedStyle.description}\n\nEdit: ${instruction}`,
        }
      : selectedStyle;

    await this.prepareReferenceImage(run, updatedStyle, userId);
  }

  private async generateReferenceBlockImages(
    brief: string,
    selectedStyle: StyleVariant,
    userId: string,
    runId: string,
  ): Promise<GeneratedReferenceBlock[]> {
    const outputDir = this.storageService.getRunAbsolutePath(
      userId,
      runId,
      'reference',
    );
    await fs.mkdir(outputDir, { recursive: true });

    const sections = this.buildReferenceSectionsFromBrief(brief);
    const stylePrompt = this.buildStylePrompt(selectedStyle);
    const blocks: GeneratedReferenceBlock[] = [];

    for (const [index, section] of sections.entries()) {
      await this.state.addLog(
        runId,
        `Generating reference block: ${section.title}`,
      );

      const prompt = this.buildReferenceBlockImagePrompt(
        brief,
        selectedStyle,
        stylePrompt,
        section,
        index,
        sections.length,
      );
      const result = await this.imageGenerationService.generateImage(prompt);
      const filename = `${String(index + 1).padStart(2, '0')}-${section.id}.png`;
      const absolutePath = path.join(outputDir, filename);
      await writeImageResultToFile(result.image, absolutePath);

      blocks.push({
        section,
        relativePath: this.storageService.getRunRelativePath(
          userId,
          runId,
          'reference',
          filename,
        ),
        mimeType: 'image/png',
        model: result.model || 'flux',
      });
    }

    return blocks;
  }

  private buildReferenceSectionsFromBrief(
    brief: string,
  ): ReferenceSectionPlan[] {
    const knownSections: Array<[RegExp, ReferenceSectionPlan]> = [
      [
        /hero|главн|перв(ый|ого)\s+экран/i,
        {
          id: 'hero',
          title: 'Hero',
          goal: 'Capture attention and communicate the core value proposition',
        },
      ],
      [
        /benefits|преимуществ/i,
        {
          id: 'benefits',
          title: 'Benefits',
          goal: 'Explain the main user benefits',
        },
      ],
      [
        /features|фич|возможност/i,
        {
          id: 'features',
          title: 'Features',
          goal: 'Show key product or service features',
        },
      ],
      [
        /pricing|тариф|цен/i,
        {
          id: 'pricing',
          title: 'Pricing',
          goal: 'Present plans, pricing, or offer packages',
        },
      ],
      [
        /testimonial|review|отзыв|кейс/i,
        {
          id: 'testimonials',
          title: 'Testimonials',
          goal: 'Build trust with social proof',
        },
      ],
      [
        /faq|вопрос|часто/i,
        {
          id: 'faq',
          title: 'FAQ',
          goal: 'Answer objections and common questions',
        },
      ],
      [
        /cta|заявк|контакт|форма|запис/i,
        {
          id: 'final-cta',
          title: 'Final CTA',
          goal: 'Motivate the visitor to take the primary action',
        },
      ],
    ];

    const sections = knownSections
      .filter(([pattern]) => pattern.test(brief))
      .map(([, section]) => section);

    if (sections.length > 0) {
      return sections.slice(0, 8);
    }

    return [
      {
        id: 'hero',
        title: 'Hero',
        goal: 'Capture attention and communicate the core value proposition',
      },
      {
        id: 'benefits',
        title: 'Benefits',
        goal: 'Explain why the offer is valuable for the target audience',
      },
      {
        id: 'features',
        title: 'Features',
        goal: 'Show the most important capabilities, services, or details',
      },
      {
        id: 'final-cta',
        title: 'Final CTA',
        goal: 'Drive the visitor to the primary action',
      },
    ];
  }

  private buildReferenceBlockImagePrompt(
    brief: string,
    selectedStyle: StyleVariant,
    stylePrompt: string,
    section: ReferenceSectionPlan,
    index: number,
    totalSections: number,
  ): string {
    return [
      'Create a high-fidelity website section screenshot preview.',
      'Generate exactly one section/block, not a full page.',
      `This is section ${index + 1} of ${totalSections}.`,
      `Section title: ${section.title}`,
      `Section goal: ${section.goal}`,
      'Use a consistent 16:9 widescreen composition.',
      'Keep the whole section fully visible inside the frame with safe margins.',
      'No browser chrome, no mockup frame, no annotations, no explanatory text.',
      `User brief: ${brief}`,
      `Selected style name: ${selectedStyle.name}`,
      `Selected style description: ${selectedStyle.description}`,
      `Visual style: ${stylePrompt}`,
      'All generated reference blocks must feel like parts of the same website.',
      'Use the same palette, typography, spacing system, visual effects, and component language across sections.',
    ].join('\n');
  }

  private async saveReferenceContextSummary(
    runId: string,
    userId: string,
    slug: string,
    referenceImagePath: string,
    referenceBlocks: GeneratedReferenceBlock[],
    selectedStyle: StyleVariant,
  ): Promise<string> {
    const summary: ReferenceContextSummary = {
      workflow: 'style-based-reference',
      fullPagePreview: referenceImagePath,
      sections: referenceBlocks.map((block) => ({
        sectionId: block.section.id,
        title: block.section.title,
        goal: block.section.goal,
        path: block.relativePath,
        mimeType: block.mimeType,
      })),
      notes: [
        `Selected style: ${selectedStyle.name}`,
        `Visual direction: ${selectedStyle.visualStyle}`,
        `Color palette: ${selectedStyle.colorPalette.join(', ')}`,
        `Typography: ${selectedStyle.typographyStyle}`,
        `Layout: ${selectedStyle.layoutStyle}`,
        'Use this reference as the primary visual source for code generation.',
      ],
    };

    const summaryRelativePath = this.storageService.getRunRelativePath(
      userId,
      runId,
      'reference',
      'reference-context.summary.json',
    );
    const summaryAbsolutePath = this.storageService.getRunAbsolutePath(
      userId,
      runId,
      'reference',
      'reference-context.summary.json',
    );

    await this.storageService.writeGeneratedFile(
      summaryAbsolutePath,
      JSON.stringify(summary, null, 2),
    );

    await this.artifactService.saveArtifact(
      runId,
      ArtifactType.ReferenceContextSummary,
      summaryRelativePath,
      'application/json',
    );

    return summaryRelativePath;
  }

  private buildStylePrompt(selectedStyle: StyleVariant): string {
    return [
      selectedStyle.visualStyle,
      `Colors: ${selectedStyle.colorPalette.join(', ')}`,
      `Typography: ${selectedStyle.typographyStyle}`,
      `Layout: ${selectedStyle.layoutStyle}`,
      `Mood: ${selectedStyle.moodKeywords.join(', ')}`,
    ].join('. ');
  }
}
