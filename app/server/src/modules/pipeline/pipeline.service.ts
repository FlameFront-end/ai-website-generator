import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

import type {
  DesignContextSummary,
  DesignTokens,
  ProjectSpec,
  ProjectSpecSummary,
  ReferenceContextSummary,
} from '../ai/ai.types';
import { ArtifactType, RunEntity, RunStatus } from '../../db/entities';
import { StorageService } from '../storage/storage.service';
import { AiService } from '../ai/ai.service';
import { loadImageAsDataUrl } from '../ai/image-attachment';
import { buildCodegenContext } from '../ai/codegen-context';
import {
  buildDesignContextSummary,
  buildProjectSpecSummary,
  buildReferenceContextSummary,
} from '../ai/summary-builders';
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
      await this.prepareBrief(run, userId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Неизвестная ошибка пайплайна';
      await this.state.failRun(run, message);
    }
  }

  private async prepareBrief(run: RunEntity, userId: string): Promise<void> {
    const briefRun = await this.state.updateRunStatus(
      run,
      RunStatus.Running,
      'prepare_brief',
      userId,
    );
    await this.state.addLog(briefRun.id, 'Анализируем бриф');
    await this.state.sleep(PIPELINE_STEP_DELAY_MS);

    const projectSpec: ProjectSpec = await this.aiService.extractProjectSpec(
      briefRun.brief,
    );
    const specRelativePath = this.state.getRunRelativePath(
      userId,
      briefRun.id,
      'spec',
      'project-spec.json',
    );
    const specAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      briefRun.id,
      'spec',
      'project-spec.json',
    );
    await this.state.writeGeneratedFile(
      specAbsolutePath,
      JSON.stringify(projectSpec, null, 2),
    );

    await this.state.saveArtifact(
      briefRun.id,
      ArtifactType.ProjectSpec,
      specRelativePath,
      'application/json',
    );

    const specSummary = buildProjectSpecSummary(projectSpec);
    const specSummaryRelativePath = this.state.getRunRelativePath(
      userId,
      briefRun.id,
      'spec',
      'project-spec.summary.json',
    );
    const specSummaryAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      briefRun.id,
      'spec',
      'project-spec.summary.json',
    );
    await this.state.writeGeneratedFile(
      specSummaryAbsolutePath,
      JSON.stringify(specSummary, null, 2),
    );
    await this.state.saveArtifact(
      briefRun.id,
      ArtifactType.ProjectSpecSummary,
      specSummaryRelativePath,
      'application/json',
    );

    await this.state.addLog(briefRun.id, 'Спецификация готова', {
      path: specRelativePath,
      summaryPath: specSummaryRelativePath,
    });

    await this.state.updateRunStatus(
      briefRun,
      RunStatus.AwaitingSpecApproval,
      'awaiting_spec_approval',
      userId,
    );
    await this.state.addLog(
      briefRun.id,
      'Проверьте спецификацию и подтвердите шаг',
    );
  }

  private async prepareDesignArtifacts(
    run: RunEntity,
    projectSpec: ProjectSpec,
    userId: string,
  ): Promise<void> {
    const designRun = await this.state.updateRunStatus(
      run,
      RunStatus.Running,
      'prepare_design_artifacts',
      userId,
    );
    await this.state.addLog(run.id, 'Формируем описание дизайна');
    await this.state.sleep(PIPELINE_STEP_DELAY_MS);

    const tokens = await this.aiService.generateDesignTokens(
      run.brief,
      projectSpec,
    );
    const designDescription = await this.aiService.generateDesignDescription(
      run.brief,
      projectSpec,
      tokens,
    );
    const descRelativePath = this.state.getRunRelativePath(
      userId,
      designRun.id,
      'design',
      'design-description.md',
    );
    const descAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      designRun.id,
      'design',
      'design-description.md',
    );
    await this.state.writeGeneratedFile(
      descAbsolutePath,
      designDescription.markdown,
    );

    await this.state.saveArtifact(
      designRun.id,
      ArtifactType.DesignDescription,
      descRelativePath,
      'text/markdown',
    );
    await this.state.addLog(designRun.id, 'Описание дизайна готово', {
      path: descRelativePath,
    });

    await this.prepareDesignTokens(designRun, projectSpec, tokens, userId);
  }

  private async prepareDesignTokens(
    run: RunEntity,
    projectSpec: ProjectSpec,
    tokens: DesignTokens,
    userId: string,
  ): Promise<void> {
    const tokensRun = await this.state.updateRunStatus(
      run,
      RunStatus.Running,
      'prepare_design_tokens',
      userId,
    );
    await this.state.addLog(run.id, 'Подбираем дизайн-токены');
    await this.state.sleep(PIPELINE_STEP_DELAY_MS);

    const tokensRelativePath = this.state.getRunRelativePath(
      userId,
      tokensRun.id,
      'design',
      'design-tokens.json',
    );
    const tokensAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      tokensRun.id,
      'design',
      'design-tokens.json',
    );
    await this.state.writeGeneratedFile(
      tokensAbsolutePath,
      JSON.stringify(tokens, null, 2),
    );

    await this.state.saveArtifact(
      tokensRun.id,
      ArtifactType.DesignTokens,
      tokensRelativePath,
      'application/json',
    );

    const designSummary = buildDesignContextSummary(projectSpec, tokens);
    const designSummaryRelativePath = this.state.getRunRelativePath(
      userId,
      tokensRun.id,
      'design',
      'design-context.summary.json',
    );
    const designSummaryAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      tokensRun.id,
      'design',
      'design-context.summary.json',
    );
    await this.state.writeGeneratedFile(
      designSummaryAbsolutePath,
      JSON.stringify(designSummary, null, 2),
    );
    await this.state.saveArtifact(
      tokensRun.id,
      ArtifactType.DesignContextSummary,
      designSummaryRelativePath,
      'application/json',
    );

    await this.state.addLog(tokensRun.id, 'Дизайн-токены готовы', {
      path: tokensRelativePath,
      summaryPath: designSummaryRelativePath,
    });

    await this.state.updateRunStatus(
      tokensRun,
      RunStatus.AwaitingDesignApproval,
      'awaiting_design_approval',
      userId,
    );
    await this.state.addLog(tokensRun.id, 'Проверьте дизайн и подтвердите шаг');
  }

  private async prepareReferenceImage(
    run: RunEntity,
    projectSpec: ProjectSpec,
    tokens: DesignTokens,
    designDescription: string,
    userId: string,
  ): Promise<void> {
    const referenceRun = await this.state.updateRunStatus(
      run,
      RunStatus.Running,
      'prepare_reference_image',
      userId,
    );
    await this.state.addLog(run.id, 'Готовим визуальный референс');
    await this.state.sleep(PIPELINE_STEP_DELAY_MS);

    const referenceImage = await this.generateFluxReferenceImage(
      referenceRun.brief,
      projectSpec,
      tokens,
      designDescription,
      userId,
      referenceRun.id,
      referenceRun.id,
    );

    await this.state.saveArtifact(
      referenceRun.id,
      ArtifactType.ReferenceImage,
      referenceImage.relativePath,
      referenceImage.mimeType,
    );

    const referenceSummaryRelativePath = await this.saveReferenceContextSummary(
      referenceRun.id,
      userId,
      referenceRun.id,
      projectSpec,
      referenceImage.relativePath,
    );

    await this.state.addLog(referenceRun.id, 'Визуальный референс готов', {
      model: referenceImage.model,
      path: referenceImage.relativePath,
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

  private async prepareFrontendProject(
    run: RunEntity,
    projectSpec: ProjectSpec,
    tokens: DesignTokens,
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
    const codegenContext = await this.buildCodegenContextForRun(
      codeRun.id,
      designDescription,
    );
    const codegenImages = await this.buildCodegenImageContext(codeRun.id);
    await this.state.addLog(
      codeRun.id,
      `Codegen visual input: full-page=${codegenImages.fullPageImageDataUrl ? 'yes' : 'no'}, section blocks=${codegenImages.sectionImageMap.size}`,
    );
    await this.codeGeneratorService.generateProjectFiles(
      run.brief,
      projectSpec,
      tokens,
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
      projectSpec,
      tokens,
      codegenContext,
      codePath,
    );
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

  private async runBuildAndQAWithRepair(
    run: RunEntity,
    slug: string,
    userId: string,
    projectSpec: ProjectSpec,
    tokens: DesignTokens,
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
      await this.codeGeneratorService.repairProjectFilesAfterBuildFailure(
        run.brief,
        projectSpec,
        tokens,
        result.error,
        codegenContext,
        codePath,
      );
    }
  }

  async resumeRun(run: RunEntity, userId: string): Promise<void> {
    try {
      switch (run.status) {
        case RunStatus.AwaitingSpecApproval:
          await this.resumeFromSpec(run, userId);
          break;
        case RunStatus.AwaitingDesignApproval:
          await this.resumeFromDesign(run, userId);
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

  private async resumeFromSpec(run: RunEntity, userId: string): Promise<void> {
    const specArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.ProjectSpec,
    );
    if (!specArtifact) {
      await this.state.failRun(run, 'Спецификация не найдена');
      return;
    }

    const specContent = await this.state.readArtifactFile(specArtifact.path);
    const projectSpec = JSON.parse(specContent) as ProjectSpec;

    await this.prepareDesignArtifacts(run, projectSpec, userId);
  }

  private async resumeFromDesign(
    run: RunEntity,
    userId: string,
  ): Promise<void> {
    const specArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.ProjectSpec,
    );
    const tokensArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.DesignTokens,
    );
    const designArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.DesignDescription,
    );

    if (!specArtifact || !tokensArtifact || !designArtifact) {
      await this.state.failRun(run, 'Артефакты дизайна не найдены');
      return;
    }

    const specContent = await this.state.readArtifactFile(specArtifact.path);
    const tokensContent = await this.state.readArtifactFile(
      tokensArtifact.path,
    );
    const designDescription = await this.state.readArtifactFile(
      designArtifact.path,
    );
    const projectSpec = JSON.parse(specContent) as ProjectSpec;
    const tokens = JSON.parse(tokensContent) as DesignTokens;

    await this.prepareReferenceImage(
      run,
      projectSpec,
      tokens,
      designDescription,
      userId,
    );
  }

  private async resumeFromReference(
    run: RunEntity,
    userId: string,
  ): Promise<void> {
    const specArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.ProjectSpec,
    );
    const tokensArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.DesignTokens,
    );
    const designArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.DesignDescription,
    );

    if (!specArtifact || !tokensArtifact || !designArtifact) {
      await this.state.failRun(run, 'Артефакты не найдены');
      return;
    }

    const specContent = await this.state.readArtifactFile(specArtifact.path);
    const tokensContent = await this.state.readArtifactFile(
      tokensArtifact.path,
    );
    const designDescription = await this.state.readArtifactFile(
      designArtifact.path,
    );
    const projectSpec = JSON.parse(specContent) as ProjectSpec;
    const tokens = JSON.parse(tokensContent) as DesignTokens;

    await this.prepareFrontendProject(
      run,
      projectSpec,
      tokens,
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

    // Проверяем, что файл существует на диске
    const referencePath = this.state.getArtifactAbsolutePath(
      referenceArtifact.path,
    );

    const referenceExists = await this.state.fileExists(referencePath);
    if (!referenceExists) {
      // Если файл не существует, регенерируем reference image
      const specArtifact = await this.state.getArtifactByType(
        run.id,
        ArtifactType.ProjectSpec,
      );
      const tokensArtifact = await this.state.getArtifactByType(
        run.id,
        ArtifactType.DesignTokens,
      );

      if (!specArtifact || !tokensArtifact) {
        await this.state.failRun(
          run,
          'Артефакты для генерации reference не найдены',
        );
        return;
      }

      const specContent = await this.state.readArtifactFile(specArtifact.path);
      const tokensContent = await this.state.readArtifactFile(
        tokensArtifact.path,
      );
      const projectSpec = JSON.parse(specContent) as ProjectSpec;
      const tokens = JSON.parse(tokensContent) as DesignTokens;

      const designArtifact = await this.state.getArtifactByType(
        run.id,
        ArtifactType.DesignDescription,
      );
      if (!designArtifact) {
        await this.state.failRun(
          run,
          'Описание дизайна для генерации reference не найдено',
        );
        return;
      }
      const designDescription = await this.state.readArtifactFile(
        designArtifact.path,
      );

      await this.prepareReferenceImage(
        run,
        projectSpec,
        tokens,
        designDescription,
        userId,
      );
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

  async regenerateStep(
    run: RunEntity,
    step: 'spec' | 'design' | 'reference' | 'code' | 'final',
    instruction: string,
    userId: string,
  ): Promise<void> {
    try {
      switch (step) {
        case 'spec':
          await this.regenerateSpec(run, instruction, userId);
          break;
        case 'design':
          await this.regenerateDesign(run, instruction, userId);
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
   * Wipe the on-disk workspace and DB artifacts produced by a previous attempt
   * of the given step. Called at the start of every `regenerateXxx` flow so
   * restart / edit-request always start from a clean slate and no stale files
   * leak into the new attempt.
   */
  private async cleanStepWorkspace(
    userId: string,
    runId: string,
    step: 'spec' | 'design' | 'reference' | 'code',
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

  private getStepFolders(
    step: 'spec' | 'design' | 'reference' | 'code',
  ): string[] {
    switch (step) {
      case 'spec':
        return ['spec'];
      case 'design':
        return ['design'];
      case 'reference':
        return ['reference'];
      case 'code':
        // Code regeneration also re-runs build + screenshots + visual QA,
        // so clean those workspaces too to avoid mixing old with new output.
        return ['code', 'screenshots', 'qa'];
    }
  }

  private getStepArtifactTypes(
    step: 'spec' | 'design' | 'reference' | 'code',
  ): ArtifactType[] {
    switch (step) {
      case 'spec':
        return [ArtifactType.ProjectSpec, ArtifactType.ProjectSpecSummary];
      case 'design':
        return [
          ArtifactType.DesignDescription,
          ArtifactType.DesignTokens,
          ArtifactType.DesignContextSummary,
        ];
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

  async restartStep(
    run: RunEntity,
    step: 'spec' | 'design' | 'reference' | 'code',
    userId: string,
  ): Promise<void> {
    const stepTitleMap: Record<typeof step, string> = {
      spec: 'Спецификация',
      design: 'Дизайн',
      reference: 'Визуальный референс',
      code: 'Код сайта',
    };
    const runningStepMap: Record<typeof step, string> = {
      spec: 'prepare_brief',
      design: 'prepare_design_artifacts',
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
    step: 'spec' | 'design' | 'reference' | 'code',
    userId: string,
  ): Promise<void> {
    const awaitingStatusMap: Record<typeof step, RunStatus> = {
      spec: RunStatus.AwaitingSpecApproval,
      design: RunStatus.AwaitingDesignApproval,
      reference: RunStatus.AwaitingReferenceApproval,
      code: RunStatus.AwaitingCodeApproval,
    };

    try {
      switch (step) {
        case 'spec':
          await this.regenerateSpec(run, '', userId);
          break;
        case 'design':
          await this.regenerateDesign(run, '', userId);
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

  private async regenerateSpec(
    run: RunEntity,
    instruction: string,
    userId: string,
  ): Promise<void> {
    await this.cleanStepWorkspace(userId, run.id, 'spec');

    const updatedBrief = instruction
      ? `${run.brief}\n\nПравка: ${instruction}`
      : run.brief;
    await this.state.updateRun(run, { brief: updatedBrief });

    const projectSpec: ProjectSpec =
      await this.aiService.extractProjectSpec(updatedBrief);
    const specRelativePath = this.state.getRunRelativePath(
      userId,
      run.id,
      'spec',
      'project-spec.json',
    );
    const specAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      run.id,
      'spec',
      'project-spec.json',
    );
    await this.state.writeGeneratedFile(
      specAbsolutePath,
      JSON.stringify(projectSpec, null, 2),
    );

    await this.state.updateArtifact(
      run.id,
      ArtifactType.ProjectSpec,
      specRelativePath,
    );
    await this.state.addLog(run.id, 'Спецификация обновлена', {
      instruction,
    });
  }

  private async regenerateDesign(
    run: RunEntity,
    instruction: string,
    userId: string,
  ): Promise<void> {
    const specArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.ProjectSpec,
    );
    if (!specArtifact) {
      await this.state.failRun(run, 'Спецификация не найдена');
      return;
    }

    await this.cleanStepWorkspace(userId, run.id, 'design');

    const specContent = await this.state.readArtifactFile(specArtifact.path);
    const projectSpec = JSON.parse(specContent) as ProjectSpec;

    const tokens = await this.aiService.generateDesignTokens(
      run.brief,
      projectSpec,
    );
    const designDescription = await this.aiService.generateDesignDescription(
      run.brief,
      projectSpec,
      tokens,
    );

    const descRelativePath = this.state.getRunRelativePath(
      userId,
      run.id,
      'design',
      'design-description.md',
    );
    const descAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      run.id,
      'design',
      'design-description.md',
    );
    await this.state.writeGeneratedFile(
      descAbsolutePath,
      designDescription.markdown,
    );

    await this.state.updateArtifact(
      run.id,
      ArtifactType.DesignDescription,
      descRelativePath,
      'text/markdown',
    );

    const tokensRelativePath = this.state.getRunRelativePath(
      userId,
      run.id,
      'design',
      'design-tokens.json',
    );
    const tokensAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      run.id,
      'design',
      'design-tokens.json',
    );
    await this.state.writeGeneratedFile(
      tokensAbsolutePath,
      JSON.stringify(tokens, null, 2),
    );

    await this.state.updateArtifact(
      run.id,
      ArtifactType.DesignTokens,
      tokensRelativePath,
      'application/json',
    );
    await this.state.addLog(run.id, 'Дизайн обновлён', { instruction });
  }

  private async regenerateReference(
    run: RunEntity,
    instruction: string,
    userId: string,
  ): Promise<void> {
    const specArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.ProjectSpec,
    );
    const tokensArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.DesignTokens,
    );
    const designArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.DesignDescription,
    );

    if (!specArtifact || !tokensArtifact || !designArtifact) {
      await this.state.failRun(run, 'Артефакты не найдены');
      return;
    }

    await this.cleanStepWorkspace(userId, run.id, 'reference');

    const specContent = await this.state.readArtifactFile(specArtifact.path);
    const tokensContent = await this.state.readArtifactFile(
      tokensArtifact.path,
    );
    const designDescription = await this.state.readArtifactFile(
      designArtifact.path,
    );
    const projectSpec = JSON.parse(specContent) as ProjectSpec;
    const tokens = JSON.parse(tokensContent) as DesignTokens;

    const referenceImage = await this.generateFluxReferenceImage(
      run.brief,
      projectSpec,
      tokens,
      designDescription,
      userId,
      run.id,
      run.id,
    );

    await this.state.updateArtifact(
      run.id,
      ArtifactType.ReferenceImage,
      referenceImage.relativePath,
      referenceImage.mimeType,
    );
    await this.state.addLog(run.id, 'Визуальный референс обновлён', {
      instruction,
      model: referenceImage.model,
    });
    await this.state.updateRunStatus(
      run,
      RunStatus.AwaitingReferenceApproval,
      'awaiting_reference_approval',
      userId,
    );
  }

  private async generateFluxReferenceImage(
    brief: string,
    projectSpec: ProjectSpec,
    tokens: DesignTokens,
    designDescription: string,
    userId: string,
    slug: string,
    runId: string,
  ): Promise<{ relativePath: string; mimeType: string; model: string }> {
    const sections = this.normalizeReferenceSections(projectSpec);
    const generatedBlocks: Array<{
      sectionId: string;
      title: string;
      relativePath: string;
      absolutePath: string;
      mimeType: string;
      model: string;
    }> = [];

    // Clear previously-emitted progressive blocks from any prior failed/restarted attempt
    await this.state.deleteArtifactsByType(runId, ArtifactType.ReferenceBlock);

    // Also remove any stale block PNGs from disk so the folder reflects only the
    // current run's progress (otherwise leftover files mislead anyone inspecting
    // the filesystem).
    const blocksDir = this.state.getRunAbsolutePath(
      userId,
      slug,
      'reference',
      'blocks',
    );
    await fs.rm(blocksDir, { recursive: true, force: true });

    // Build the shared art-direction primer once. The same string is used for
    // every section so the model receives identical brand cues across chats,
    // which is what keeps separately-generated blocks visually consistent.
    const artDirection = this.buildArtDirectionSpec(projectSpec, tokens);

    for (const [index, section] of sections.entries()) {
      const prompt = this.buildSectionImagePrompt(
        projectSpec,
        tokens,
        section,
        artDirection,
      );

      await this.state.addLog(
        runId,
        `Генерация блока ${index + 1}/${sections.length}: ${section.title}`,
        { sectionId: section.id },
      );
      await this.state.touchRun(runId);

      const result = await this.imagesService.generateImage(prompt);
      const image = await this.downloadGeneratedImage(result.image);
      const extension = this.getImageExtension(image.mimeType);
      const fileName = `${String(index + 1).padStart(2, '0')}-${this.slugifySectionId(section.id)}.${extension}`;
      const relativePath = this.state.getRunRelativePath(
        userId,
        slug,
        'reference',
        'blocks',
        fileName,
      );
      const absolutePath = this.state.getRunAbsolutePath(
        userId,
        slug,
        'reference',
        'blocks',
        fileName,
      );

      await this.state.writeGeneratedFile(absolutePath, image.buffer);

      // Emit progressive artifact so the UI can show this block immediately,
      // without waiting for remaining sections or the full-page preview.
      await this.state.saveArtifact(
        runId,
        ArtifactType.ReferenceBlock,
        relativePath,
        image.mimeType,
      );
      await this.state.touchRun(runId);
      await this.state.addLog(
        runId,
        `Блок ${index + 1}/${sections.length} готов: ${section.title}`,
        { sectionId: section.id, path: relativePath },
      );

      generatedBlocks.push({
        sectionId: section.id,
        title: section.title,
        relativePath,
        absolutePath,
        mimeType: image.mimeType,
        model: result.model,
      });
    }

    const fullPage = await this.createFullPagePreview(generatedBlocks);
    const fullPageRelativePath = this.state.getRunRelativePath(
      userId,
      slug,
      'reference',
      'full-page-preview.png',
    );
    const fullPageAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      slug,
      'reference',
      'full-page-preview.png',
    );
    await this.state.writeGeneratedFile(fullPageAbsolutePath, fullPage);

    const manifestAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      slug,
      'reference',
      'blocks-manifest.json',
    );
    await this.state.writeGeneratedFile(
      manifestAbsolutePath,
      JSON.stringify(
        {
          workflow: 'one-section-one-image',
          fullPagePreview: fullPageRelativePath,
          blocks: generatedBlocks.map((block) => ({
            sectionId: block.sectionId,
            title: block.title,
            path: block.relativePath,
            mimeType: block.mimeType,
            model: block.model,
          })),
        },
        null,
        2,
      ),
    );

    return {
      relativePath: fullPageRelativePath,
      mimeType: 'image/png',
      model: generatedBlocks[0]?.model ?? 'unknown',
    };
  }

  private normalizeReferenceSections(projectSpec: ProjectSpec) {
    if (projectSpec.sections?.length) {
      return projectSpec.sections;
    }

    return [
      {
        id: '01-hero',
        type: 'hero' as const,
        title: 'Hero',
        goal: 'Первый экран и основной CTA',
        contentNotes: [projectSpec.copy.headline, projectSpec.copy.description],
        visualNotes: projectSpec.visualPreferences ?? [],
        requiredElements: projectSpec.requiredElements ?? [
          'navigation',
          'headline',
          'description',
          'primary CTA',
        ],
      },
    ];
  }

  private async downloadGeneratedImage(
    imageUrl: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(
        `Не удалось скачать reference image: ${response.status} ${response.statusText}`,
      );
    }

    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      mimeType: this.normalizeImageMimeType(
        response.headers.get('content-type'),
      ),
    };
  }

  private async createFullPagePreview(
    blocks: Array<{ absolutePath: string }>,
  ): Promise<Buffer> {
    const normalizedBlocks = await Promise.all(
      blocks.map(async (block) => {
        const { data, info } = await sharp(block.absolutePath)
          .resize({
            width: 1440,
            withoutEnlargement: false,
          })
          .png()
          .toBuffer({ resolveWithObject: true });

        return {
          buffer: data,
          height: info.height,
        };
      }),
    );
    const totalHeight = normalizedBlocks.reduce(
      (sum, block) => sum + block.height,
      0,
    );

    return sharp({
      create: {
        width: 1440,
        height: totalHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite(
        normalizedBlocks.map((block, index) => ({
          input: block.buffer,
          left: 0,
          top: normalizedBlocks
            .slice(0, index)
            .reduce((sum, previous) => sum + previous.height, 0),
        })),
      )
      .png()
      .toBuffer();
  }

  /**
   * Compact, deterministic art direction kit shared by every section of the
   * same site. Keeping this short and identical across calls is what makes
   * the generated blocks feel like a single coherent product, even when each
   * is generated in its own ChatGPT chat.
   */
  private buildArtDirectionSpec(
    projectSpec: ProjectSpec,
    tokens: DesignTokens,
  ): string {
    const c = tokens.colors;
    const t = tokens.typography;
    const cmp = tokens.components;

    const palette = [
      `background ${c.background}`,
      c.backgroundGradient ? `bg-gradient ${c.backgroundGradient}` : null,
      `accent ${c.accent}`,
      c.accentSecondary ? `accent-2 ${c.accentSecondary}` : null,
      `text ${c.textPrimary}`,
      `text-secondary ${c.textSecondary}`,
      `surface ${c.surface}`,
      `border ${c.border}`,
    ]
      .filter(Boolean)
      .join(', ');

    const fontFamily =
      t.fontFamily?.replace(/['"]/g, '').split(',')[0]?.trim() ||
      'modern sans-serif';

    const mood =
      (projectSpec.stylePreference ?? []).slice(0, 4).join(', ') ||
      'modern, clean';
    const visualPrefs = (projectSpec.visualPreferences ?? [])
      .slice(0, 4)
      .join('; ');
    const avoid = (tokens.assets?.avoid ?? []).join(', ');

    return [
      `SITE: ${projectSpec.productName} — ${projectSpec.productDescription}`,
      `INDUSTRY: ${projectSpec.industry ?? 'general'} | AUDIENCE: ${projectSpec.audience}`,
      `MOOD: ${mood}`,
      visualPrefs ? `VISUAL PREFERENCES: ${visualPrefs}` : '',
      `PALETTE: ${palette}`,
      `TYPOGRAPHY: headline ${t.headlineSize}/${t.headlineWeight} ${fontFamily}, body ${t.bodySize}, line-height ${t.lineHeight}`,
      `COMPONENTS: button radius ${cmp.buttonRadius}${cmp.buttonHeight ? ` (h ${cmp.buttonHeight})` : ''}, card radius ${cmp.cardRadius} with shadow ${cmp.cardShadow}; dark surfaces with thin borders; subtle glow accents`,
      avoid ? `AVOID: ${avoid}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Build a focused image-generation prompt for a single section.
   * Each section is rendered in its own fresh ChatGPT chat, so the prompt
   * must be self-contained but as small as possible.
   */
  private buildSectionImagePrompt(
    projectSpec: ProjectSpec,
    tokens: DesignTokens,
    section: ProjectSpec['sections'][number],
    artDirection: string,
  ): string {
    const sectionTokens = tokens.sections?.[section.id];
    const isHero = section.type === 'hero';
    const nav = projectSpec.navigation;

    const navLine =
      isHero && nav
        ? `NAV (top of section): logo "${nav.logo}", menu [${(nav.menuItems ?? []).join(' | ')}]${nav.ctaButton ? `, CTA "${nav.ctaButton}"` : ''}.`
        : 'Do NOT draw a navigation bar in this section — navigation appears only on the hero block.';

    const heroCopyLines: string[] = [];
    if (isHero) {
      const copy = projectSpec.copy;
      if (copy?.headline) heroCopyLines.push(`H1: "${copy.headline}"`);
      if (copy?.headlineAccent)
        heroCopyLines.push(`H1 accent: "${copy.headlineAccent}"`);
      if (copy?.description)
        heroCopyLines.push(`Lead paragraph: "${copy.description}"`);
      if (copy?.primaryButton)
        heroCopyLines.push(`Primary CTA: "${copy.primaryButton}"`);
      if (copy?.secondaryButton)
        heroCopyLines.push(`Secondary CTA: "${copy.secondaryButton}"`);
      if (copy?.trustLine)
        heroCopyLines.push(`Trust line: "${copy.trustLine}"`);
    }

    const sectionMeta = [
      sectionTokens?.background
        ? `Section background: ${sectionTokens.background}`
        : '',
      sectionTokens?.layout ? `Section layout: ${sectionTokens.layout}` : '',
      sectionTokens?.spacing ? `Section spacing: ${sectionTokens.spacing}` : '',
      sectionTokens?.visualRole
        ? `Visual role: ${sectionTokens.visualRole}`
        : '',
    ].filter(Boolean);

    return [
      'Render ONE section of a desktop landing page as a clean 1440px-wide website screenshot.',
      'No browser chrome, no device mockups, no annotations, no editor UI, no unrelated text.',
      'Strong typography, clear hierarchy, generous spacing, readable text, frontend-implementable layout.',
      '',
      '=== SHARED ART DIRECTION (must match every section of this site) ===',
      artDirection,
      '',
      `=== THIS SECTION (${section.id}) ===`,
      `Type: ${section.type} — section title (in copy): "${section.title}"`,
      `Goal: ${section.goal}`,
      `Required elements: ${(section.requiredElements ?? []).join(', ') || '(use sensible defaults for this section type)'}`,
      `Content to convey:\n  - ${(section.contentNotes ?? ['(use section title and goal)']).join('\n  - ')}`,
      section.visualNotes && section.visualNotes.length > 0
        ? `Visual hints:\n  - ${section.visualNotes.join('\n  - ')}`
        : '',
      ...sectionMeta,
      heroCopyLines.length > 0
        ? `Exact copy to include verbatim:\n  - ${heroCopyLines.join('\n  - ')}`
        : '',
      '',
      navLine,
      '',
      `LANGUAGE: All visible UI text MUST be in "${projectSpec.language}" (e.g., "ru" → Russian).`,
      'CRITICAL: Do NOT invent a different style. Use the exact palette, typography, button and card shapes from the SHARED ART DIRECTION above. Other sections of this site will be generated with the same tokens and must stack into one coherent product.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private slugifySectionId(sectionId: string): string {
    const slug = sectionId
      .toLowerCase()
      .replace(/[^a-z0-9а-яё-]+/gi, '-')
      .replace(/^-+|-+$/g, '');

    return slug || 'section';
  }

  private normalizeImageMimeType(contentType: string | null): string {
    const mimeType = contentType?.split(';')[0]?.trim().toLowerCase();

    if (
      mimeType === 'image/png' ||
      mimeType === 'image/jpeg' ||
      mimeType === 'image/webp'
    ) {
      return mimeType;
    }

    return 'image/png';
  }

  private getImageExtension(mimeType: string): 'png' | 'jpg' | 'webp' {
    if (mimeType === 'image/jpeg') return 'jpg';
    if (mimeType === 'image/webp') return 'webp';
    return 'png';
  }

  private async buildCodegenContextForRun(
    runId: string,
    designDescription: string,
  ): Promise<string> {
    const [projectSpecSummary, designContextSummary, referenceContextSummary] =
      await Promise.all([
        this.readJsonArtifact<ProjectSpecSummary>(
          runId,
          ArtifactType.ProjectSpecSummary,
        ),
        this.readJsonArtifact<DesignContextSummary>(
          runId,
          ArtifactType.DesignContextSummary,
        ),
        this.readJsonArtifact<ReferenceContextSummary>(
          runId,
          ArtifactType.ReferenceContextSummary,
        ),
      ]);

    return buildCodegenContext({
      projectSpecSummary,
      designContextSummary,
      referenceContextSummary,
      designDescription,
      visualReferenceContext: await this.buildVisualReferenceContext(runId),
    });
  }

  private async readJsonArtifact<T>(
    runId: string,
    type: ArtifactType,
  ): Promise<T | undefined> {
    const artifact = await this.state.getArtifactByType(runId, type);

    if (!artifact) {
      return undefined;
    }

    try {
      return JSON.parse(await this.state.readArtifactFile(artifact.path)) as T;
    } catch {
      return undefined;
    }
  }

  private async buildVisualReferenceContext(runId: string): Promise<string> {
    const summaryArtifact = await this.state.getArtifactByType(
      runId,
      ArtifactType.ReferenceContextSummary,
    );

    if (summaryArtifact) {
      try {
        const summary = await this.state.readArtifactFile(summaryArtifact.path);
        return [
          'Approved visual reference summary (use as primary visual source):',
          summary,
          'Match layout, spacing, hierarchy and palette to the approved blocks. Do not redesign sections; do not rasterize whole sections in code.',
        ].join('\n');
      } catch {
        // fall through to manifest/full-page handling
      }
    }

    const referenceArtifact = await this.state.getArtifactByType(
      runId,
      ArtifactType.ReferenceImage,
    );

    if (!referenceArtifact) {
      return 'Visual references: not generated yet.';
    }

    const manifestPath = referenceArtifact.path.replace(
      /reference\/full-page-preview\.(png|svg)$/,
      'reference/blocks-manifest.json',
    );

    try {
      const manifest = await this.state.readArtifactFile(manifestPath);

      return [
        'Approved visual references:',
        `Full-page preview: ${referenceArtifact.path}`,
        `Blocks manifest:\n${manifest}`,
        'Use these block references as the primary visual source. Match them with real HTML/CSS; do not rasterize whole sections.',
      ].join('\n');
    } catch {
      return [
        'Approved visual references:',
        `Full-page preview: ${referenceArtifact.path}`,
        'Blocks manifest is unavailable. Use the full-page preview path as the approved reference and keep code aligned with the design description.',
      ].join('\n');
    }
  }

  private async saveReferenceContextSummary(
    runId: string,
    userId: string,
    slug: string,
    projectSpec: ProjectSpec,
    fullPageReferencePath: string,
  ): Promise<string> {
    const manifestRelativePath = fullPageReferencePath.replace(
      /reference\/full-page-preview\.(png|svg)$/,
      'reference/blocks-manifest.json',
    );

    let manifest: {
      workflow?: string;
      fullPagePreview?: string;
      blocks?: Array<{
        sectionId: string;
        title?: string;
        path: string;
        mimeType?: string;
      }>;
    } = {};

    try {
      const manifestRaw =
        await this.state.readArtifactFile(manifestRelativePath);
      manifest = JSON.parse(manifestRaw) as typeof manifest;
    } catch {
      manifest = {};
    }

    const summary = buildReferenceContextSummary(
      projectSpec,
      manifest,
      fullPageReferencePath,
    );

    const summaryRelativePath = this.state.getRunRelativePath(
      userId,
      slug,
      'reference',
      'reference-context.summary.json',
    );
    const summaryAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      slug,
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

  /**
   * Load the approved reference images for a run as data URLs ready to pass
   * to the multimodal code-generation prompts:
   *   - `fullPageImageDataUrl`: the stitched full-page preview, used to anchor
   *     the layout call.
   *   - `sectionImageMap`: section.id → data URL of the per-section block,
   *     used as the visual source of truth for each section codegen call.
   *
   * If a file is missing or unreadable we silently skip it — the prompt builder
   * accepts `null` and falls back to a text-only prompt for that step.
   */
  private async buildCodegenImageContext(runId: string): Promise<{
    fullPageImageDataUrl: string | null;
    sectionImageMap: Map<string, string>;
  }> {
    const sectionImageMap = new Map<string, string>();
    let fullPageImageDataUrl: string | null = null;

    try {
      const blockArtifacts = await this.state.getArtifactsByType(
        runId,
        ArtifactType.ReferenceBlock,
      );
      for (const block of blockArtifacts) {
        const sectionId = this.parseSectionIdFromBlockPath(block.path);
        if (!sectionId) continue;
        try {
          const absolutePath = this.state.getArtifactAbsolutePath(block.path);
          const dataUrl = await loadImageAsDataUrl(absolutePath);
          sectionImageMap.set(sectionId, dataUrl);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          await this.state.addLog(
            runId,
            `Не удалось загрузить картинку блока для codegen: ${block.path}`,
            { error: message },
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.state.addLog(
        runId,
        'Не удалось получить артефакты блоков-референсов для codegen',
        { error: message },
      );
    }

    try {
      const referenceArtifact = await this.state.getArtifactByType(
        runId,
        ArtifactType.ReferenceImage,
      );
      if (
        referenceArtifact &&
        (referenceArtifact.mimeType ?? '').startsWith('image/') &&
        !referenceArtifact.path.endsWith('.svg')
      ) {
        const absolutePath = this.state.getArtifactAbsolutePath(
          referenceArtifact.path,
        );
        fullPageImageDataUrl = await loadImageAsDataUrl(absolutePath);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.state.addLog(
        runId,
        'Не удалось загрузить full-page-preview для codegen',
        { error: message },
      );
    }

    return { fullPageImageDataUrl, sectionImageMap };
  }

  /**
   * Reverse the filename convention used in `generateFluxReferenceImage`:
   *   `<index>-<slugified-section-id>.<ext>` (e.g. `01-01-hero.png`).
   * Strip the leading order prefix once so we get back the original section.id.
   */
  private parseSectionIdFromBlockPath(relativePath: string): string | null {
    const fileName = relativePath.split('/').pop();
    if (!fileName) return null;
    const stem = fileName.replace(/\.[^.]+$/, '');
    const withoutOrder = stem.replace(/^\d+-/, '');
    return withoutOrder || null;
  }

  private async saveCodegenArtifact(
    runId: string,
    userId: string,
    slug: string,
    kind: CodegenArtifactKind,
    data: unknown,
  ): Promise<void> {
    const config: Record<
      CodegenArtifactKind,
      { type: ArtifactType; fileName: string }
    > = {
      'code-plan': {
        type: ArtifactType.CodePlan,
        fileName: 'code-plan.json',
      },
      'content-module': {
        type: ArtifactType.CodeContentModule,
        fileName: 'content-module.json',
      },
      'layout-module': {
        type: ArtifactType.CodeLayoutModule,
        fileName: 'layout-module.json',
      },
      'sections-module': {
        type: ArtifactType.CodeSectionsModule,
        fileName: 'sections-module.json',
      },
    };
    const item = config[kind];
    const relativePath = this.state.getRunRelativePath(
      userId,
      slug,
      'codegen',
      item.fileName,
    );
    const absolutePath = this.state.getRunAbsolutePath(
      userId,
      slug,
      'codegen',
      item.fileName,
    );

    await this.state.writeGeneratedFile(
      absolutePath,
      JSON.stringify(data, null, 2),
    );
    await this.state.saveArtifact(
      runId,
      item.type,
      relativePath,
      'application/json',
    );
  }

  private async regenerateCode(
    run: RunEntity,
    instruction: string,
    userId: string,
  ): Promise<void> {
    const specArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.ProjectSpec,
    );
    const tokensArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.DesignTokens,
    );
    const designArtifact = await this.state.getArtifactByType(
      run.id,
      ArtifactType.DesignDescription,
    );

    if (!specArtifact || !tokensArtifact || !designArtifact) {
      await this.state.failRun(run, 'Артефакты не найдены');
      return;
    }

    await this.cleanStepWorkspace(userId, run.id, 'code');

    const specContent = await this.state.readArtifactFile(specArtifact.path);
    const tokensContent = await this.state.readArtifactFile(
      tokensArtifact.path,
    );
    const designDescription = await this.state.readArtifactFile(
      designArtifact.path,
    );
    const projectSpec = JSON.parse(specContent) as unknown as ProjectSpec;
    const tokens = JSON.parse(tokensContent) as unknown as DesignTokens;

    const codePath = path.join(
      this.storageService.getRunPath(userId, run.id),
      'code',
    );
    const codegenContext = await this.buildCodegenContextForRun(
      run.id,
      designDescription,
    );
    const codegenImages = await this.buildCodegenImageContext(run.id);
    await this.state.addLog(
      run.id,
      `Codegen visual input: full-page=${codegenImages.fullPageImageDataUrl ? 'yes' : 'no'}, section blocks=${codegenImages.sectionImageMap.size}`,
    );
    await this.codeGeneratorService.generateProjectFiles(
      run.brief,
      projectSpec,
      tokens,
      codegenContext,
      codePath,
      {
        onCodegenArtifact: (payload: CodegenArtifactPayload) =>
          this.saveCodegenArtifact(
            run.id,
            userId,
            run.id,
            payload.kind,
            payload.data,
          ),
        fullPageImageDataUrl: codegenImages.fullPageImageDataUrl,
        sectionImageMap: codegenImages.sectionImageMap,
      },
    );

    await this.state.addLog(run.id, 'Код сайта перегенерирован', {
      instruction,
    });

    await this.runBuildAndQAWithRepair(
      run,
      run.id,
      userId,
      projectSpec,
      tokens,
      codegenContext,
      codePath,
    );
  }
}
