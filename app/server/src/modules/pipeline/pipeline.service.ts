import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type {
  DesignTokens,
  ProjectSpec,
  ReferenceContextSummary,
  StyleVariant,
} from '../ai/ai.types';
import { ArtifactType, RunEntity, RunStatus } from '../../db/entities';
import { StorageService } from '../storage/storage.service';
import { AiService } from '../ai/ai.service';
import { loadImageAsDataUrl } from '../ai/image-attachment';
import type {
  CodegenArtifactKind,
  CodegenArtifactPayload,
} from '../code-generator/code-generator.service';
import { CodeGeneratorService } from '../code-generator/code-generator.service';
import { ImagesService } from '../images/images.service';
import { PipelineStateService } from './pipeline-state.service';
import { BuildService } from './build.service';
import { ScreenshotService } from './screenshot.service';
import { VisualQAService } from './visual-qa.service';

const PIPELINE_STEP_DELAY_MS = 1200;
const MAX_BUILD_REPAIR_ATTEMPTS = 3;

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
export class PipelineService {
  constructor(
    private readonly state: PipelineStateService,
    private readonly buildService: BuildService,
    private readonly screenshotService: ScreenshotService,
    private readonly visualQAService: VisualQAService,
    private readonly storageService: StorageService,
    private readonly aiService: AiService,
    private readonly codeGeneratorService: CodeGeneratorService,
    private readonly imagesService: ImagesService,
  ) {}

  async processRun(run: RunEntity, userId: string): Promise<void> {
    try {
      await this.state.sleep(PIPELINE_STEP_DELAY_MS);
      await this.generateStyleVariantsStep(run, userId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Неизвестная ошибка пайплайна';
      await this.state.failRun(run, message);
    }
  }

  /**
   * Step 1: Generate style variants based on brief
   * User will select one style to proceed
   */
  private async generateStyleVariantsStep(
    run: RunEntity,
    userId: string,
  ): Promise<void> {
    const styleRun = await this.state.updateRunStatus(
      run,
      RunStatus.Running,
      'generate_style_variants',
      userId,
    );
    await this.state.addLog(styleRun.id, 'Генерируем варианты стилистик');
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

    await this.state.addLog(styleRun.id, 'Варианты стилистик готовы', {
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
    await this.state.addLog(styleRun.id, 'Выберите стилистику для продолжения');
  }

  /**
   * Step 2: Generate full reference image based on selected style
   */
  private async prepareReferenceImage(
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
      `Готовим визуальный референс по стилистике: ${selectedStyle.name}`,
    );
    await this.state.sleep(PIPELINE_STEP_DELAY_MS);

    const referenceBlocks = await this.generateReferenceBlockImages(
      referenceRun.brief,
      selectedStyle,
      userId,
      referenceRun.id,
    );

    for (const block of referenceBlocks) {
      await this.state.saveArtifact(
        referenceRun.id,
        ArtifactType.ReferenceBlock,
        block.relativePath,
        block.mimeType,
      );
    }

    const primaryReference = referenceBlocks[0];

    if (primaryReference) {
      await this.state.saveArtifact(
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

    await this.state.addLog(referenceRun.id, 'Визуальный референс готов', {
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
      'Проверьте референс и подтвердите шаг',
    );
  }

  /**
   * Step 3: Generate code based on selected style and reference
   */
  private async prepareFrontendProject(
    run: RunEntity,
    selectedStyle: StyleVariant,
    designDescription: string,
    userId: string,
  ): Promise<void> {
    const codeRun = await this.state.updateRunStatus(
      run,
      RunStatus.Running,
      'prepare_frontend_project',
      userId,
    );
    await this.state.addLog(run.id, 'Генерируем код сайта');
    await this.state.sleep(PIPELINE_STEP_DELAY_MS);

    const codePath = path.join(
      this.storageService.getRunPath(userId, codeRun.id),
      'code',
    );

    // Build context from selected style
    const codegenContext = this.buildStyleCodegenContext(selectedStyle);

    const codegenImages = await this.buildCodegenImageContext(codeRun.id);
    await this.state.addLog(
      codeRun.id,
      `Codegen visual input: full-page=${codegenImages.fullPageImageDataUrl ? 'yes' : 'no'}, section blocks=${codegenImages.sectionImageMap.size}`,
    );

    // Generate project files using style-based approach
    // Create compatible ProjectSpec and DesignTokens from selectedStyle
    const projectSpec = this.buildProjectSpecFromStyle(
      run.brief,
      selectedStyle,
    );
    const designTokens = this.buildDesignTokensFromStyle(selectedStyle);

    await this.codeGeneratorService.generateProjectFiles(
      run.brief,
      projectSpec,
      designTokens,
      codegenContext,
      codePath,
      {
        onCodegenArtifact: (payload: CodegenArtifactPayload) =>
          this.saveCodegenArtifact(
            codeRun.id,
            userId,
            codeRun.id,
            payload.kind,
            payload.data,
          ),
        fullPageImageDataUrl: codegenImages.fullPageImageDataUrl,
        sectionImageMap: codegenImages.sectionImageMap,
      },
    );

    await this.state.addLog(codeRun.id, 'Код сайта готов');

    await this.runBuildAndQAWithRepair(
      codeRun,
      codeRun.id,
      userId,
      selectedStyle,
      codegenContext,
      codePath,
    );
  }

  private async runBuildAndQAWithRepair(
    run: RunEntity,
    slug: string,
    userId: string,
    selectedStyle: StyleVariant,
    codegenContext: string,
    codePath: string,
  ): Promise<void> {
    let currentRun = run;

    for (
      let attempt = 1;
      attempt <= MAX_BUILD_REPAIR_ATTEMPTS + 1;
      attempt += 1
    ) {
      const result = await this.buildService.buildProjectOnce(
        currentRun,
        slug,
        userId,
        attempt,
      );
      currentRun = result.run;

      if (currentRun.status !== RunStatus.BuildFailed) {
        const screenshotRun = await this.screenshotService.takeScreenshots(
          currentRun,
          slug,
          userId,
        );
        await this.visualQAService.runVisualQA(
          screenshotRun,
          run.id,
          slug,
          userId,
        );

        await this.state.updateRunStatus(
          screenshotRun,
          RunStatus.AwaitingFinalApproval,
          'awaiting_final_approval',
          userId,
        );
        await this.state.addLog(
          screenshotRun.id,
          'Проверьте результат и завершите проект',
        );
        return;
      }

      if (attempt > MAX_BUILD_REPAIR_ATTEMPTS || !result.error) {
        return;
      }

      await this.state.addLog(
        run.id,
        `Скармливаем ошибку сборки AI для исправления кода (${attempt}/${MAX_BUILD_REPAIR_ATTEMPTS})`,
        { error: result.error },
      );
      const projectSpec = this.buildProjectSpecFromStyle(
        run.brief,
        selectedStyle,
      );
      const designTokens = this.buildDesignTokensFromStyle(selectedStyle);

      await this.codeGeneratorService.repairProjectFilesAfterBuildFailure(
        run.brief,
        projectSpec,
        designTokens,
        result.error,
        codegenContext,
        codePath,
      );
    }
  }

  async rebuildRun(run: RunEntity, userId: string): Promise<void> {
    const rebuildRun = await this.state.updateRunStatus(
      run,
      RunStatus.Running,
      'build_project',
      userId,
    );
    void this.runBuildAndQA(rebuildRun, rebuildRun.id, userId);
  }

  private async runBuildAndQA(
    run: RunEntity,
    slug: string,
    userId: string,
  ): Promise<void> {
    const builtRun = await this.buildService.buildProject(run, slug, userId, 1);
    if (builtRun.status === RunStatus.BuildFailed) {
      return;
    }

    const screenshotRun = await this.screenshotService.takeScreenshots(
      builtRun,
      slug,
      userId,
    );
    await this.visualQAService.runVisualQA(screenshotRun, run.id, slug, userId);

    await this.state.updateRunStatus(
      screenshotRun,
      RunStatus.AwaitingFinalApproval,
      'awaiting_final_approval',
      userId,
    );
    await this.state.addLog(
      screenshotRun.id,
      'Проверьте результат и завершите проект',
    );
  }

  /**
   * Resume run from current status
   */
  async resumeRun(run: RunEntity, userId: string): Promise<void> {
    try {
      switch (run.status) {
        case RunStatus.AwaitingStyleSelection:
          await this.state.addLog(
            run.id,
            'Ожидание выбора стилистики пользователем',
          );
          break;
        case RunStatus.AwaitingReferenceApproval:
          await this.resumeFromReference(run, userId);
          break;
        case RunStatus.AwaitingCodeApproval:
          await this.resumeFromCode(run, userId);
          break;
        case RunStatus.AwaitingFinalApproval:
          await this.resumeFromFinal(run, userId);
          break;
        default:
          await this.state.addLog(
            run.id,
            'Невозможно продолжить с текущего статуса',
          );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Ошибка при продолжении пайплайна';
      await this.state.failRun(run, message);
    }
  }

  /**
   * Select style without continuing the pipeline.
   */
  async selectStyle(
    run: RunEntity,
    selectedStyleId: string,
    userId: string,
  ): Promise<void> {
    const variantsArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.StyleVariants,
    );
    if (!variantsArtifact) {
      await this.state.failRun(run, 'Варианты стилистик не найдены');
      return;
    }

    const variantsContent = await this.state.readArtifactFile(
      variantsArtifact.path,
    );
    const variants = JSON.parse(variantsContent) as {
      variants: StyleVariant[];
    };

    const selectedStyle = variants.variants.find(
      (v) => v.id === selectedStyleId,
    );
    if (!selectedStyle) {
      await this.state.failRun(run, `Стилистика ${selectedStyleId} не найдена`);
      return;
    }

    // Save selected style as artifact
    const selectedStylePath = this.state.getRunRelativePath(
      userId,
      run.id,
      'style',
      'selected-style.json',
    );
    const selectedStyleAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      run.id,
      'style',
      'selected-style.json',
    );

    await this.state.writeGeneratedFile(
      selectedStyleAbsolutePath,
      JSON.stringify(selectedStyle, null, 2),
    );

    await this.state.updateArtifact(
      run.id,
      ArtifactType.SelectedStyle,
      selectedStylePath,
      'application/json',
    );

    await this.state.addLog(
      run.id,
      `Выбрана стилистика: ${selectedStyle.name}`,
    );

    await this.state.updateRunStatus(
      run,
      RunStatus.AwaitingStyleSelection,
      'awaiting_style_selection',
      userId,
    );
  }

  async startReferenceFromSelectedStyle(
    run: RunEntity,
    userId: string,
  ): Promise<void> {
    const selectedStyleArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.SelectedStyle,
    );

    if (!selectedStyleArtifact) {
      await this.state.failRun(run, 'Сначала выберите визуальный стиль');
      return;
    }

    const selectedStyle = JSON.parse(
      await this.state.readArtifactFile(selectedStyleArtifact.path),
    ) as StyleVariant;

    await this.prepareReferenceImage(run, selectedStyle, userId);
  }

  private async resumeFromReference(
    run: RunEntity,
    userId: string,
  ): Promise<void> {
    const selectedStyleArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.SelectedStyle,
    );

    if (!selectedStyleArtifact) {
      await this.state.failRun(run, 'Выбранная стилистика не найдена');
      return;
    }

    const styleContent = await this.state.readArtifactFile(
      selectedStyleArtifact.path,
    );
    const selectedStyle = JSON.parse(styleContent) as StyleVariant;

    // Build design description from style
    const designDescription =
      this.buildDesignDescriptionFromStyle(selectedStyle);

    await this.prepareFrontendProject(
      run,
      selectedStyle,
      designDescription,
      userId,
    );
  }

  private async resumeFromCode(run: RunEntity, userId: string): Promise<void> {
    const referenceArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.ReferenceImage,
    );

    if (!referenceArtifact) {
      await this.state.failRun(run, 'Reference image artifact не найден');
      return;
    }

    const selectedStyleArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.SelectedStyle,
    );

    if (!selectedStyleArtifact) {
      await this.state.failRun(run, 'Выбранная стилистика не найдена');
      return;
    }

    const builtRun = await this.buildService.buildProject(
      run,
      run.id,
      userId,
      1,
    );
    if (builtRun.status === RunStatus.BuildFailed) {
      return;
    }

    const screenshotRun = await this.state.getRun(run.id);
    if (screenshotRun) {
      await this.screenshotService.takeScreenshots(
        screenshotRun,
        run.id,
        userId,
      );
      const qaRun = await this.state.getRun(run.id);
      if (qaRun) {
        await this.visualQAService.runVisualQA(qaRun, run.id, run.id, userId);
      }
    }
  }

  private async resumeFromFinal(run: RunEntity, userId: string): Promise<void> {
    await this.state.updateRunStatus(
      run,
      RunStatus.Completed,
      'completed',
      userId,
    );
    await this.state.addLog(run.id, 'Проект завершён');
  }

  /**
   * Regenerate a specific step
   */
  async regenerateStep(
    run: RunEntity,
    step: 'style' | 'reference' | 'code' | 'final',
    instruction: string,
    userId: string,
  ): Promise<void> {
    try {
      switch (step) {
        case 'style':
          await this.regenerateStyle(run, instruction, userId);
          break;
        case 'reference':
          await this.regenerateReference(run, instruction, userId);
          break;
        case 'code':
          await this.regenerateCode(run, instruction, userId);
          break;
        case 'final':
          await this.state.addLog(
            run.id,
            'Финальный шаг нельзя перегенерировать',
          );
          break;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Ошибка при перегенерации шага';
      await this.state.failRun(run, message);
    }
  }

  /**
   * Restart a specific step
   */
  async restartStep(
    run: RunEntity,
    step: 'style' | 'reference' | 'code',
    userId: string,
  ): Promise<void> {
    const stepTitleMap: Record<typeof step, string> = {
      style: 'Стилистика',
      reference: 'Визуальный референс',
      code: 'Код сайта',
    };
    const runningStepMap: Record<typeof step, string> = {
      style: 'generate_style_variants',
      reference: 'prepare_reference_image',
      code: 'prepare_frontend_project',
    };

    await this.state.updateRunStatus(
      run,
      RunStatus.Running,
      runningStepMap[step],
      userId,
    );
    await this.state.addLog(run.id, `Перезапускаем шаг: ${stepTitleMap[step]}`);

    void this.finishRestartStep(run, step, userId);
  }

  private async finishRestartStep(
    run: RunEntity,
    step: 'style' | 'reference' | 'code',
    userId: string,
  ): Promise<void> {
    const awaitingStatusMap: Record<typeof step, RunStatus> = {
      style: RunStatus.AwaitingStyleSelection,
      reference: RunStatus.AwaitingReferenceApproval,
      code: RunStatus.AwaitingCodeApproval,
    };

    try {
      switch (step) {
        case 'style':
          await this.regenerateStyle(run, '', userId);
          break;
        case 'reference':
          await this.regenerateReference(run, '', userId);
          break;
        case 'code':
          await this.regenerateCode(run, '', userId);
          return;
      }

      await this.state.updateRunStatus(
        run,
        awaitingStatusMap[step],
        `awaiting_${step}_approval`,
        userId,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Ошибка при перезапуске шага';
      await this.state.failRun(run, message);
    }
  }

  private async cleanStepWorkspace(
    userId: string,
    runId: string,
    step: 'style' | 'reference' | 'code',
  ): Promise<void> {
    const folders = this.getStepFolders(step);
    const types = this.getStepArtifactTypes(step);

    for (const folder of folders) {
      const dir = this.state.getRunAbsolutePath(userId, runId, folder);
      await fs.rm(dir, { recursive: true, force: true });
    }

    for (const type of types) {
      await this.state.deleteArtifactsByType(runId, type);
    }
  }

  private getStepFolders(step: 'style' | 'reference' | 'code'): string[] {
    switch (step) {
      case 'style':
        return ['style'];
      case 'reference':
        return ['reference'];
      case 'code':
        return ['code', 'screenshots', 'qa'];
    }
  }

  private getStepArtifactTypes(
    step: 'style' | 'reference' | 'code',
  ): ArtifactType[] {
    switch (step) {
      case 'style':
        return [ArtifactType.StyleVariants, ArtifactType.SelectedStyle];
      case 'reference':
        return [
          ArtifactType.ReferenceImage,
          ArtifactType.ReferenceBlock,
          ArtifactType.ReferenceContextSummary,
          ArtifactType.ReferenceValidation,
        ];
      case 'code':
        return [
          ArtifactType.CodePlan,
          ArtifactType.CodeContentModule,
          ArtifactType.CodeLayoutModule,
          ArtifactType.CodeSectionsModule,
          ArtifactType.FrontendProject,
          ArtifactType.BuildLog,
          ArtifactType.BuildError,
          ArtifactType.DesktopScreenshot,
          ArtifactType.MobileScreenshot,
          ArtifactType.DiffImage,
          ArtifactType.VisualReport,
        ];
    }
  }

  private async regenerateStyle(
    run: RunEntity,
    instruction: string,
    userId: string,
  ): Promise<void> {
    await this.cleanStepWorkspace(userId, run.id, 'style');

    const updatedBrief = instruction
      ? `${run.brief}\n\nПравка: ${instruction}`
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

    await this.state.addLog(run.id, 'Варианты стилистик обновлены', {
      instruction,
      count: styleVariants.variants.length,
    });
  }

  private async regenerateReference(
    run: RunEntity,
    instruction: string,
    userId: string,
  ): Promise<void> {
    const selectedStyleArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.SelectedStyle,
    );

    if (!selectedStyleArtifact) {
      await this.state.failRun(run, 'Выбранная стилистика не найдена');
      return;
    }

    const styleContent = await this.state.readArtifactFile(
      selectedStyleArtifact.path,
    );
    const selectedStyle = JSON.parse(styleContent) as StyleVariant;

    await this.cleanStepWorkspace(userId, run.id, 'reference');

    const updatedStyle: StyleVariant = instruction
      ? {
          ...selectedStyle,
          description: `${selectedStyle.description}\n\nПравка: ${instruction}`,
        }
      : selectedStyle;

    await this.prepareReferenceImage(run, updatedStyle, userId);
  }

  private async regenerateCode(
    run: RunEntity,
    instruction: string,
    userId: string,
  ): Promise<void> {
    const selectedStyleArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.SelectedStyle,
    );

    if (!selectedStyleArtifact) {
      await this.state.failRun(run, 'Выбранная стилистика не найдена');
      return;
    }

    const styleContent = await this.state.readArtifactFile(
      selectedStyleArtifact.path,
    );
    const selectedStyle = JSON.parse(styleContent) as StyleVariant;

    await this.cleanStepWorkspace(userId, run.id, 'code');

    const updatedBrief = instruction
      ? `${run.brief}\n\nПравка кода: ${instruction}`
      : run.brief;
    await this.state.updateRun(run, { brief: updatedBrief });

    const designDescription =
      this.buildDesignDescriptionFromStyle(selectedStyle);
    await this.prepareFrontendProject(
      run,
      selectedStyle,
      designDescription,
      userId,
    );
  }

  // ===================== Helper methods =====================

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
        `Генерируем превью стилистики: ${variant.name}`,
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

  private async writeImageResultToFile(
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

  private async generateReferenceBlockImages(
    brief: string,
    selectedStyle: StyleVariant,
    userId: string,
    runId: string,
  ): Promise<GeneratedReferenceBlock[]> {
    const outputDir = this.state.getRunAbsolutePath(userId, runId, 'reference');
    await fs.mkdir(outputDir, { recursive: true });

    const sections = this.buildReferenceSectionsFromBrief(brief);
    const stylePrompt = this.buildStylePrompt(selectedStyle);
    const blocks: GeneratedReferenceBlock[] = [];

    for (const [index, section] of sections.entries()) {
      await this.state.addLog(
        runId,
        `Генерируем референс блока: ${section.title}`,
      );

      const prompt = this.buildReferenceBlockImagePrompt(
        brief,
        selectedStyle,
        stylePrompt,
        section,
        index,
        sections.length,
      );
      const result = await this.imagesService.generateImage(prompt);
      const filename = `${String(index + 1).padStart(2, '0')}-${section.id}.png`;
      const absolutePath = path.join(outputDir, filename);
      await this.writeImageResultToFile(result.image, absolutePath);

      blocks.push({
        section,
        relativePath: this.state.getRunRelativePath(
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

    const summaryRelativePath = this.state.getRunRelativePath(
      userId,
      runId,
      'reference',
      'reference-context.summary.json',
    );
    const summaryAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      runId,
      'reference',
      'reference-context.summary.json',
    );

    await this.state.writeGeneratedFile(
      summaryAbsolutePath,
      JSON.stringify(summary, null, 2),
    );

    await this.state.saveArtifact(
      runId,
      ArtifactType.ReferenceContextSummary,
      summaryRelativePath,
      'application/json',
    );

    return summaryRelativePath;
  }

  private async saveCodegenArtifact(
    runId: string,
    userId: string,
    slug: string,
    kind: CodegenArtifactKind,
    data: unknown,
  ): Promise<void> {
    const artifactTypeMap: Record<CodegenArtifactKind, ArtifactType> = {
      'code-plan': ArtifactType.CodePlan,
      'content-module': ArtifactType.CodeContentModule,
      'layout-module': ArtifactType.CodeLayoutModule,
      'sections-module': ArtifactType.CodeSectionsModule,
    };

    const filenameMap: Record<CodegenArtifactKind, string> = {
      'code-plan': 'code-plan.json',
      'content-module': 'content-module.json',
      'layout-module': 'layout-module.json',
      'sections-module': 'sections-module.json',
    };

    const relativePath = this.state.getRunRelativePath(
      userId,
      runId,
      'codegen',
      filenameMap[kind],
    );
    const absolutePath = this.state.getRunAbsolutePath(
      userId,
      runId,
      'codegen',
      filenameMap[kind],
    );

    await this.state.writeGeneratedFile(
      absolutePath,
      JSON.stringify(data, null, 2),
    );

    await this.state.saveArtifact(
      runId,
      artifactTypeMap[kind],
      relativePath,
      'application/json',
    );
  }

  private async buildCodegenImageContext(runId: string): Promise<{
    fullPageImageDataUrl: string | null;
    sectionImageMap: Map<string, string>;
  }> {
    const referenceArtifact = await this.state.getArtifactByType(
      runId,
      ArtifactType.ReferenceImage,
    );
    const referenceBlocks = await this.state.getArtifactsByType(
      runId,
      ArtifactType.ReferenceBlock,
    );

    if (!referenceArtifact) {
      const sectionImageMap = await this.buildSectionImageMap(referenceBlocks);
      return { fullPageImageDataUrl: null, sectionImageMap };
    }

    const fullPagePath = this.state.getArtifactAbsolutePath(
      referenceArtifact.path,
    );
    const fullPageImageDataUrl = await loadImageAsDataUrl(fullPagePath);

    return {
      fullPageImageDataUrl,
      sectionImageMap: await this.buildSectionImageMap(referenceBlocks),
    };
  }

  private async buildSectionImageMap(
    referenceBlocks: Array<{ path: string }>,
  ): Promise<Map<string, string>> {
    const sectionImageMap = new Map<string, string>();

    for (const block of referenceBlocks) {
      const fileName = path.basename(block.path).replace(/\.[^.]+$/, '');
      const sectionId = fileName.replace(/^\d+-/, '');
      const absolutePath = this.state.getArtifactAbsolutePath(block.path);
      sectionImageMap.set(sectionId, await loadImageAsDataUrl(absolutePath));
    }

    return sectionImageMap;
  }

  private buildStyleCodegenContext(selectedStyle: StyleVariant): string {
    return [
      'Project Context:',
      `- Style name: ${selectedStyle.name}`,
      `- Visual style: ${selectedStyle.visualStyle}`,
      `- Color palette: ${selectedStyle.colorPalette.join(', ')}`,
      `- Typography: ${selectedStyle.typographyStyle}`,
      `- Layout: ${selectedStyle.layoutStyle}`,
      `- Mood: ${selectedStyle.moodKeywords.join(', ')}`,
      '',
      `Description: ${selectedStyle.description}`,
    ].join('\n');
  }

  private buildProjectSpecFromStyle(
    brief: string,
    selectedStyle: StyleVariant,
  ): ProjectSpec {
    return {
      projectType: 'landing-page',
      idea: brief,
      goal: 'Generate a modern landing page from the user brief and selected visual style',
      language: brief.includes('Target site language: English')
        ? 'English'
        : 'Russian',
      stylePreference: [
        selectedStyle.name,
        selectedStyle.visualStyle,
        selectedStyle.layoutStyle,
      ],
      productName: selectedStyle.name,
      productDescription: brief,
      audience: 'Target audience from the user brief',
      requiredElements: [
        'clear headline',
        'value proposition',
        'primary call to action',
        'trust signals',
      ],
      contentNotes: [brief],
      visualNotes: [
        selectedStyle.description,
        selectedStyle.visualStyle,
        selectedStyle.layoutStyle,
      ],
      assumptions: [
        'Infer missing product, audience and conversion details from the brief',
      ],
      sections: [
        {
          id: 'hero',
          type: 'hero',
          title: 'Hero',
          goal: 'Explain the offer and drive the main action',
          contentNotes: [brief],
          visualNotes: [selectedStyle.visualStyle],
          requiredElements: ['headline', 'description', 'primary CTA'],
        },
        {
          id: 'benefits',
          type: 'benefits',
          title: 'Benefits',
          goal: 'Show the key reasons to choose the offer',
          contentNotes: ['Infer 3-4 strongest benefits from the brief'],
          visualNotes: [selectedStyle.visualStyle],
          requiredElements: ['benefit cards', 'short explanations'],
        },
        {
          id: 'features',
          type: 'features',
          title: 'Features',
          goal: 'Explain what the product or service includes',
          contentNotes: ['Infer key features from the brief'],
          visualNotes: [selectedStyle.visualStyle],
          requiredElements: ['feature list', 'supporting visual structure'],
        },
        {
          id: 'final-cta',
          type: 'final-cta-footer',
          title: 'Final CTA',
          goal: 'Convert the visitor',
          contentNotes: ['Create a concise closing call to action'],
          visualNotes: [selectedStyle.visualStyle],
          requiredElements: ['CTA button', 'footer'],
        },
      ],
      copy: {
        headline: 'Generated landing page headline',
        description: brief,
        primaryButton: 'Начать',
        secondaryButton: 'Подробнее',
      },
      navigation: {
        logo: selectedStyle.name,
        menuItems: ['Преимущества', 'Возможности', 'Контакты'],
        ctaButton: 'Начать',
      },
      visualPreferences: [
        selectedStyle.visualStyle,
        selectedStyle.typographyStyle,
        selectedStyle.layoutStyle,
      ],
      colorHints: {
        background: selectedStyle.colorPalette[0],
        accent: selectedStyle.colorPalette.slice(1, 3),
        text: selectedStyle.colorPalette.at(-1),
      },
    };
  }

  private buildDesignTokensFromStyle(
    selectedStyle: StyleVariant,
  ): DesignTokens {
    const [background, accent, accentSecondary, surface, textPrimary, border] =
      [
        selectedStyle.colorPalette[0] ?? '#0F172A',
        selectedStyle.colorPalette[1] ?? '#3B82F6',
        selectedStyle.colorPalette[2] ?? '#8B5CF6',
        selectedStyle.colorPalette[3] ?? '#FFFFFF',
        selectedStyle.colorPalette[4] ?? '#111827',
        selectedStyle.colorPalette[5] ?? '#E5E7EB',
      ];

    return {
      colors: {
        background,
        textPrimary,
        textSecondary: '#64748B',
        accent,
        accentSecondary,
        surface,
        border,
      },
      layout: {
        containerWidth: '1200px',
        sectionPaddingY: '96px',
        sectionPaddingX: '24px',
        columns: selectedStyle.layoutStyle.toLowerCase().includes('split')
          ? 2
          : 1,
        gridGap: '24px',
        heroMinHeight: '720px',
      },
      typography: {
        headlineSize: 'clamp(48px, 7vw, 92px)',
        headlineMobileSize: '44px',
        headlineWeight: 800,
        bodySize: '18px',
        lineHeight: '1.55',
        fontFamily: selectedStyle.typographyStyle,
      },
      components: {
        buttonRadius: '999px',
        buttonHeight: '52px',
        cardRadius: '28px',
        cardShadow: '0 24px 80px rgba(15, 23, 42, 0.14)',
      },
      sections: {
        hero: {
          layout: selectedStyle.layoutStyle,
          visualRole: selectedStyle.visualStyle,
        },
      },
      assets: {
        imageStyle: selectedStyle.visualStyle,
        illustrationStyle: selectedStyle.visualStyle,
        avoid: ['generic stock-photo look', 'unstyled default UI'],
      },
      responsive: {
        desktopBreakpoint: '1024px',
        tabletBreakpoint: '768px',
        mobileBreakpoint: '640px',
        mobileLayout: 'single-column responsive layout',
      },
    };
  }

  private buildDesignDescriptionFromStyle(selectedStyle: StyleVariant): string {
    return [
      `# ${selectedStyle.name}`,
      '',
      selectedStyle.description,
      '',
      '## Visual Direction',
      selectedStyle.visualStyle,
      '',
      '## Color Palette',
      ...selectedStyle.colorPalette.map((c) => `- ${c}`),
      '',
      '## Typography',
      selectedStyle.typographyStyle,
      '',
      '## Layout Approach',
      selectedStyle.layoutStyle,
      '',
      '## Mood',
      selectedStyle.moodKeywords.join(', '),
    ].join('\n');
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
