import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { StyleVariant } from '../ai/types';
import { ArtifactType, RunEntity, RunStatus } from '../../db/entities';
import { AiService } from '../ai/ai.service';
import { ImagesService } from '../images/images.service';
import { PipelineStateService } from './pipeline-state.service';

const PIPELINE_STEP_DELAY_MS = 1200;

@Injectable()
export class StyleStepService {
  constructor(
    private readonly state: PipelineStateService,
    private readonly aiService: AiService,
    private readonly imagesService: ImagesService,
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
    await this.state.sleep(PIPELINE_STEP_DELAY_MS);

    const styleVariants = await this.aiService.generateStyleVariants(
      styleRun.brief,
    );

    const variantsRelativePath = this.state.getRunRelativePath(
      userId,
      styleRun.id,
      'style',
      'style-variants.json',
    );
    const variantsAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      styleRun.id,
      'style',
      'style-variants.json',
    );

    await this.state.writeGeneratedFile(
      variantsAbsolutePath,
      JSON.stringify(styleVariants, null, 2),
    );

    await this.state.saveArtifact(
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
      await this.aiService.generateStyleVariants(updatedBrief);

    const variantsRelativePath = this.state.getRunRelativePath(
      userId,
      run.id,
      'style',
      'style-variants.json',
    );
    const variantsAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      run.id,
      'style',
      'style-variants.json',
    );

    await this.state.writeGeneratedFile(
      variantsAbsolutePath,
      JSON.stringify(styleVariants, null, 2),
    );

    await this.state.updateArtifact(
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
    const outputDir = this.state.getRunAbsolutePath(userId, runId, 'style');
    await fs.mkdir(outputDir, { recursive: true });

    for (const variant of variants) {
      await this.state.addLog(
        runId,
        `Generating style preview: ${variant.name}`,
      );

      const prompt = this.buildStyleVariantImagePrompt(brief, variant);
      const result = await this.imagesService.generateImage(prompt);
      const filename = `${variant.id}.png`;
      const absolutePath = path.join(outputDir, filename);

      await this.writeImageResultToFile(result.image, absolutePath);

      const relativePath = this.state.getRunRelativePath(
        userId,
        runId,
        'style',
        filename,
      );

      await this.state.saveArtifact(
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

  async writeImageResultToFile(
    image: string,
    absolutePath: string,
  ): Promise<void> {
    if (image.startsWith('data:image/')) {
      const base64 = image.replace(/^data:image\/\w+;base64,/, '');
      await fs.writeFile(absolutePath, Buffer.from(base64, 'base64'));
      return;
    }

    if (/^[A-Za-z0-9+/=]+$/.test(image)) {
      await fs.writeFile(absolutePath, Buffer.from(image, 'base64'));
      return;
    }

    const response = await fetch(image);
    if (!response.ok) {
      throw new Error(`Failed to download generated image: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(absolutePath, buffer);
  }
}
