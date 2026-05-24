import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { StyleVariant } from '../ai/types';
import { ArtifactType, RunStatus } from '../../common/enums';
import { RunEntity } from '../../db/entities';
import { PIPELINE_STEP_DELAY_MS } from '../../common/constants/pipeline';
import { writeImageResultToFile } from '../../common/utils';
import { sleep } from '../../common/utils';
import { DesignAiService } from '../ai/design-ai.service';
import { ImageGenerationService } from '../image-generation/image-generation.service';
import { StorageService } from '../storage/storage.service';
import { ArtifactService } from './artifact.service';
import { PipelineStateService } from './pipeline-state.service';

@Injectable()
export class StyleStepService {
  constructor(
    private readonly state: PipelineStateService,
    private readonly storageService: StorageService,
    private readonly artifactService: ArtifactService,
    private readonly designAiService: DesignAiService,
    private readonly imageGenerationService: ImageGenerationService,
  ) {}

  async generateStyleVariantsStep(
    run: RunEntity,
    userId: string,
  ): Promise<void> {
    const styleRun = await this.state.updateRunStatus(
      run,
      RunStatus.Running,
      'generate_style_variants',
      userId,
    );
    await this.state.addLog(styleRun.id, 'Generating style variants');
    await sleep(PIPELINE_STEP_DELAY_MS);

    const styleVariants = await this.designAiService.generateStyleVariants(
      styleRun.brief,
    );

    const variantsRelativePath = this.storageService.getRunRelativePath(
      userId,
      styleRun.id,
      'style',
      'style-variants.json',
    );
    const variantsAbsolutePath = this.storageService.getRunAbsolutePath(
      userId,
      styleRun.id,
      'style',
      'style-variants.json',
    );

    await this.storageService.writeGeneratedFile(
      variantsAbsolutePath,
      JSON.stringify(styleVariants, null, 2),
    );

    await this.artifactService.saveArtifact(
      styleRun.id,
      ArtifactType.StyleVariants,
      variantsRelativePath,
      'application/json',
    );

    const generatedImages = await this.generateStyleVariantImages(
      styleRun.brief,
      styleVariants.variants,
      userId,
      styleRun.id,
    );

    await this.state.addLog(styleRun.id, 'Style variants ready', {
      path: variantsRelativePath,
      count: styleVariants.variants.length,
      images: generatedImages.length,
    });

    await this.state.updateRunStatus(
      styleRun,
      RunStatus.AwaitingStyleSelection,
      'awaiting_style_selection',
      userId,
    );
    await this.state.addLog(styleRun.id, 'Select a style to continue');
  }

  async regenerateStyle(
    run: RunEntity,
    instruction: string,
    userId: string,
  ): Promise<void> {
    const updatedBrief = instruction
      ? `${run.brief}\n\nEdit: ${instruction}`
      : run.brief;
    await this.state.updateRun(run, { brief: updatedBrief });

    const styleVariants =
      await this.designAiService.generateStyleVariants(updatedBrief);

    const variantsRelativePath = this.storageService.getRunRelativePath(
      userId,
      run.id,
      'style',
      'style-variants.json',
    );
    const variantsAbsolutePath = this.storageService.getRunAbsolutePath(
      userId,
      run.id,
      'style',
      'style-variants.json',
    );

    await this.storageService.writeGeneratedFile(
      variantsAbsolutePath,
      JSON.stringify(styleVariants, null, 2),
    );

    await this.artifactService.updateArtifact(
      run.id,
      ArtifactType.StyleVariants,
      variantsRelativePath,
    );

    await this.state.addLog(run.id, 'Style variants updated', {
      instruction,
      count: styleVariants.variants.length,
    });
  }

  private async generateStyleVariantImages(
    brief: string,
    variants: StyleVariant[],
    userId: string,
    runId: string,
  ): Promise<string[]> {
    const savedPaths: string[] = [];
    const outputDir = this.storageService.getRunAbsolutePath(
      userId,
      runId,
      'style',
    );
    await fs.mkdir(outputDir, { recursive: true });

    for (const variant of variants) {
      await this.state.addLog(
        runId,
        `Generating style preview: ${variant.name}`,
      );

      const prompt = this.buildStyleVariantImagePrompt(brief, variant);
      const result = await this.imageGenerationService.generateImage(prompt);
      const filename = `${variant.id}.png`;
      const absolutePath = path.join(outputDir, filename);

      await writeImageResultToFile(result.image, absolutePath);

      const relativePath = this.storageService.getRunRelativePath(
        userId,
        runId,
        'style',
        filename,
      );

      await this.artifactService.saveArtifact(
        runId,
        ArtifactType.StyleVariantImage,
        relativePath,
        'image/png',
      );

      savedPaths.push(relativePath);
    }

    return savedPaths;
  }

  private buildStyleVariantImagePrompt(
    brief: string,
    variant: StyleVariant,
  ): string {
    return [
      'Create a high-fidelity landing page hero section screenshot preview.',
      'Generate exactly one hero block, not a full website.',
      'Use a consistent 16:9 widescreen composition for every style variant.',
      'The final image must be landscape, 1024x576 or equivalent 16:9 aspect ratio.',
      'Keep the whole hero section fully visible inside the frame with safe margins.',
      'Do not crop any part of the website preview at the edges.',
      'No browser chrome, no mockup frame, no annotations, no explanatory text.',
      `User brief: ${brief}`,
      `Style variant name: ${variant.name}`,
      `Description: ${variant.description}`,
      `Visual style: ${variant.visualStyle}`,
      `Color palette: ${variant.colorPalette.join(', ')}`,
      `Typography: ${variant.typographyStyle}`,
      `Layout: ${variant.layoutStyle}`,
      `Mood keywords: ${variant.moodKeywords.join(', ')}`,
      'The image must clearly communicate this distinct website style direction.',
      'Use polished modern UI, realistic spacing, production-quality composition.',
    ].join('\n');
  }
}
