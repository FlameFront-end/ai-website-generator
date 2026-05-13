import { Injectable } from '@nestjs/common';
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
import { buildCodegenContext } from '../ai/codegen-context';
import {
  buildDesignContextSummary,
  buildProjectSpecSummary,
  buildReferenceContextSummary,
} from '../ai/summary-builders';
import { CodeGeneratorService } from '../code-generator/code-generator.service';
import { ImagesService } from '../images/images.service';
import { PipelineStateService } from './pipeline-state.service';
import { BuildService } from './build.service';
import { ScreenshotService } from './screenshot.service';
import { VisualQAService } from './visual-qa.service';

const PIPELINE_STEP_DELAY_MS = 1200;

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
      briefRun.slug,
      'spec',
      'project-spec.json',
    );
    const specAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      briefRun.slug,
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
      briefRun.slug,
      'spec',
      'project-spec.summary.json',
    );
    const specSummaryAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      briefRun.slug,
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
      designRun.slug,
      'design',
      'design-description.md',
    );
    const descAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      designRun.slug,
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
      tokensRun.slug,
      'design',
      'design-tokens.json',
    );
    const tokensAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      tokensRun.slug,
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
      tokensRun.slug,
      'design',
      'design-context.summary.json',
    );
    const designSummaryAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      tokensRun.slug,
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

    const referenceImage = await this.generateReferenceImageWithFallback(
      referenceRun.brief,
      projectSpec,
      tokens,
      designDescription,
      userId,
      referenceRun.slug,
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
      referenceRun.slug,
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
      this.storageService.getRunPath(userId, codeRun.slug),
      'code',
    );
    const codegenContext = await this.buildCodegenContextForRun(
      codeRun.id,
      designDescription,
    );
    await this.codeGeneratorService.generateProjectFiles(
      run.brief,
      projectSpec,
      tokens,
      codegenContext,
      codePath,
    );

    await this.state.addLog(codeRun.id, 'Код сайта готов');

    await this.state.updateRunStatus(
      codeRun,
      RunStatus.AwaitingCodeApproval,
      'awaiting_code_approval',
      userId,
    );
    await this.state.addLog(codeRun.id, 'Проверьте код и подтвердите шаг');
  }

  async rebuildRun(run: RunEntity, userId: string): Promise<void> {
    const rebuildRun = await this.state.updateRunStatus(
      run,
      RunStatus.Running,
      'build_project',
      userId,
    );
    void this.runBuildAndQA(rebuildRun, rebuildRun.slug, userId);
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
      run.slug,
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
        run.slug,
        userId,
      );
      const qaRun = await this.state.getRun(run.id);
      if (qaRun) {
        await this.visualQAService.runVisualQA(qaRun, run.id, run.slug, userId);
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
          break;
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
    const updatedBrief = instruction
      ? `${run.brief}\n\nПравка: ${instruction}`
      : run.brief;
    await this.state.updateRun(run, { brief: updatedBrief });

    const projectSpec: ProjectSpec =
      await this.aiService.extractProjectSpec(updatedBrief);
    const specRelativePath = this.state.getRunRelativePath(
      userId,
      run.slug,
      'spec',
      'project-spec.json',
    );
    const specAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      run.slug,
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
      run.slug,
      'design',
      'design-description.md',
    );
    const descAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      run.slug,
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
    );

    const tokensRelativePath = this.state.getRunRelativePath(
      userId,
      run.slug,
      'design',
      'design-tokens.json',
    );
    const tokensAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      run.slug,
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

    const specContent = await this.state.readArtifactFile(specArtifact.path);
    const tokensContent = await this.state.readArtifactFile(
      tokensArtifact.path,
    );
    const designDescription = await this.state.readArtifactFile(
      designArtifact.path,
    );
    const projectSpec = JSON.parse(specContent) as ProjectSpec;
    const tokens = JSON.parse(tokensContent) as DesignTokens;

    const referenceImage = await this.generateReferenceImageWithFallback(
      run.brief,
      projectSpec,
      tokens,
      designDescription,
      userId,
      run.slug,
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

  private async generateReferenceImageWithFallback(
    brief: string,
    projectSpec: ProjectSpec,
    tokens: DesignTokens,
    designDescription: string,
    userId: string,
    slug: string,
    runId: string,
  ): Promise<{ relativePath: string; mimeType: string; model: string }> {
    try {
      return await this.generateFluxReferenceImage(
        brief,
        projectSpec,
        tokens,
        designDescription,
        userId,
        slug,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Image generation failed';

      if (!this.canFallbackToSvgReference(message)) {
        throw error;
      }

      await this.state.addLog(
        runId,
        'Генерация raster-референса недоступна, создаём SVG fallback',
        { reason: message },
      );

      return this.generateSvgReferenceImage(
        brief,
        projectSpec,
        tokens,
        designDescription,
        userId,
        slug,
      );
    }
  }

  private async generateFluxReferenceImage(
    brief: string,
    projectSpec: ProjectSpec,
    tokens: DesignTokens,
    designDescription: string,
    userId: string,
    slug: string,
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

    for (const [index, section] of sections.entries()) {
      const prompt = this.buildSectionImagePrompt(
        brief,
        projectSpec,
        tokens,
        designDescription,
        section,
        generatedBlocks.map((block) => ({
          sectionId: block.sectionId,
          title: block.title,
        })),
      );
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

  private async generateSvgReferenceImage(
    brief: string,
    projectSpec: ProjectSpec,
    tokens: DesignTokens,
    designDescription: string,
    userId: string,
    slug: string,
  ): Promise<{ relativePath: string; mimeType: string; model: string }> {
    const svg = await this.aiService.generateReferenceSvg(
      brief,
      projectSpec,
      tokens,
      designDescription,
    );
    const relativePath = this.state.getRunRelativePath(
      userId,
      slug,
      'reference',
      'full-page-preview.svg',
    );
    const absolutePath = this.state.getRunAbsolutePath(
      userId,
      slug,
      'reference',
      'full-page-preview.svg',
    );

    await this.state.writeGeneratedFile(absolutePath, svg);

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
          workflow: 'svg-fallback',
          fullPagePreview: relativePath,
          blocks: this.normalizeReferenceSections(projectSpec).map(
            (section) => ({
              sectionId: section.id,
              title: section.title,
              path: relativePath,
              mimeType: 'image/svg+xml',
              model: 'analysis-svg-fallback',
            }),
          ),
        },
        null,
        2,
      ),
    );

    return {
      relativePath,
      mimeType: 'image/svg+xml',
      model: 'analysis-svg-fallback',
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

  private buildSectionImagePrompt(
    brief: string,
    projectSpec: ProjectSpec,
    tokens: DesignTokens,
    designDescription: string,
    section: ProjectSpec['sections'][number],
    previousSections: Array<{ sectionId: string; title: string }>,
  ): string {
    return [
      'Create one production-ready desktop website section image.',
      'Canvas: 1440px wide desktop website section, straight-on website screenshot.',
      'Generate only the current section, not the full page.',
      'Do not include browser chrome, device mockups, editor UI, annotations, or unrelated text.',
      'The design must feel like a real shipped landing page section with strong typography, clear hierarchy, generous spacing, readable text, coherent style, and frontend-implementable layout.',
      'Keep the same art direction as previous sections. Do not make each block a different style.',
      '',
      `Brief:\n${brief}`,
      '',
      `Project spec:\n${JSON.stringify(projectSpec, null, 2)}`,
      '',
      `Design tokens:\n${JSON.stringify(tokens, null, 2)}`,
      '',
      `Design description:\n${designDescription}`,
      '',
      `Previous sections:\n${JSON.stringify(previousSections, null, 2)}`,
      '',
      `Current section:\n${JSON.stringify(section, null, 2)}`,
    ].join('\n');
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

  private canFallbackToSvgReference(message: string): boolean {
    return [
      'Image generation failed',
      'AI_IMAGE_PROVIDER',
      'AI_IMAGE_API_KEY',
      'Insufficient credit',
      'Payment Required',
      'Replicate returned no image URL',
    ].some((fragment) => message.includes(fragment));
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
      this.storageService.getRunPath(userId, run.slug),
      'code',
    );
    await this.codeGeneratorService.generateProjectFiles(
      run.brief,
      projectSpec,
      tokens,
      await this.buildCodegenContextForRun(run.id, designDescription),
      codePath,
    );

    await this.state.addLog(run.id, 'Код сайта перегенерирован', {
      instruction,
    });
  }
}


