import { Injectable } from '@nestjs/common';
import path from 'node:path';

import type { ProjectSpec, DesignTokens } from '../ai/ai.types';
import { ArtifactType, RunEntity, RunStatus } from '../../db/entities';
import { StorageService } from '../storage/storage.service';
import { AiService } from '../ai/ai.service';
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
    await this.state.addLog(briefRun.id, 'Начата обработка брифа');
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
    await this.state.addLog(briefRun.id, 'Спецификация проекта сохранена', {
      path: specRelativePath,
    });

    await this.state.updateRunStatus(
      briefRun,
      RunStatus.AwaitingSpecApproval,
      'awaiting_spec_approval',
      userId,
    );
    await this.state.addLog(briefRun.id, 'Ожидание подтверждения спецификации');
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
    await this.state.addLog(run.id, 'Начато описание дизайна');
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
    await this.state.addLog(designRun.id, 'Описание дизайна сохранено', {
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
    await this.state.addLog(run.id, 'Начата генерация дизайн-токенов');
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
    await this.state.addLog(tokensRun.id, 'Дизайн-токены сохранены', {
      path: tokensRelativePath,
    });

    await this.state.updateRunStatus(
      tokensRun,
      RunStatus.AwaitingDesignApproval,
      'awaiting_design_approval',
      userId,
    );
    await this.state.addLog(tokensRun.id, 'Ожидание подтверждения дизайна');
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
    await this.state.addLog(run.id, 'Начата подготовка визуального референса');
    await this.state.sleep(PIPELINE_STEP_DELAY_MS);

    const referenceImage = await this.generateFluxReferenceImage(
      referenceRun.brief,
      projectSpec,
      tokens,
      designDescription,
      userId,
      referenceRun.slug,
    );

    await this.state.saveArtifact(
      referenceRun.id,
      ArtifactType.ReferenceImage,
      referenceImage.relativePath,
      referenceImage.mimeType,
    );
    await this.state.addLog(referenceRun.id, 'Визуальный референс сохранен', {
      model: referenceImage.model,
      path: referenceImage.relativePath,
    });

    await this.state.updateRunStatus(
      referenceRun,
      RunStatus.AwaitingReferenceApproval,
      'awaiting_reference_approval',
      userId,
    );
    await this.state.addLog(
      referenceRun.id,
      'Ожидание подтверждения визуального референса',
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
    await this.state.addLog(run.id, 'Начата генерация клиентского проекта');
    await this.state.sleep(PIPELINE_STEP_DELAY_MS);

    const codePath = path.join(
      this.storageService.getRunPath(userId, codeRun.slug),
      'code',
    );
    await this.codeGeneratorService.generateProjectFiles(
      run.brief,
      projectSpec,
      tokens,
      designDescription,
      codePath,
    );

    await this.state.addLog(codeRun.id, 'Клиентский проект сгенерирован');

    await this.state.updateRunStatus(
      codeRun,
      RunStatus.AwaitingCodeApproval,
      'awaiting_code_approval',
      userId,
    );
    await this.state.addLog(codeRun.id, 'Ожидание подтверждения кода');
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
      'Ожидание финального подтверждения',
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
      spec: 'спецификации',
      design: 'дизайна',
      reference: 'визуального референса',
      code: 'кода проекта',
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
    await this.state.addLog(
      run.id,
      `Запущен перезапуск шага ${stepTitleMap[step]}`,
    );

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
    await this.state.addLog(run.id, 'Спецификация перегенерирована', {
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
    await this.state.addLog(run.id, 'Дизайн перегенерирован', { instruction });
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

    const referenceImage = await this.generateFluxReferenceImage(
      run.brief,
      projectSpec,
      tokens,
      designDescription,
      userId,
      run.slug,
    );

    await this.state.updateArtifact(
      run.id,
      ArtifactType.ReferenceImage,
      referenceImage.relativePath,
      referenceImage.mimeType,
    );
    await this.state.addLog(run.id, 'Визуальный референс перегенерирован', {
      instruction,
      model: referenceImage.model,
    });
  }

  private async generateFluxReferenceImage(
    brief: string,
    projectSpec: ProjectSpec,
    tokens: DesignTokens,
    designDescription: string,
    userId: string,
    slug: string,
  ): Promise<{ relativePath: string; mimeType: string; model: string }> {
    const prompt = this.buildReferenceImagePrompt(
      brief,
      projectSpec,
      tokens,
      designDescription,
    );
    const result = await this.imagesService.generateImage(prompt);
    const response = await fetch(result.image);

    if (!response.ok) {
      throw new Error(
        `Не удалось скачать Flux reference image: ${response.status} ${response.statusText}`,
      );
    }

    const mimeType = this.normalizeImageMimeType(
      response.headers.get('content-type'),
    );
    const extension = this.getImageExtension(mimeType);
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const relativePath = this.state.getRunRelativePath(
      userId,
      slug,
      'reference',
      `reference.${extension}`,
    );
    const absolutePath = this.state.getRunAbsolutePath(
      userId,
      slug,
      'reference',
      `reference.${extension}`,
    );

    await this.state.writeGeneratedFile(absolutePath, imageBuffer);

    return { relativePath, mimeType, model: result.model };
  }

  private buildReferenceImagePrompt(
    brief: string,
    projectSpec: ProjectSpec,
    tokens: DesignTokens,
    designDescription: string,
  ): string {
    return [
      'Generate a polished visual reference mockup for the first viewport of a website hero section.',
      'Format: 1440x900 desktop web screenshot, 16:10 aspect ratio, no browser chrome, no device frame.',
      'Style: production-ready UI design, crisp typography, realistic spacing, coherent layout, high fidelity.',
      'Use the provided copy and design system. Text must be readable and resemble the requested Russian/English content, but avoid adding unrelated text.',
      '',
      `Brief:\n${brief}`,
      '',
      `Project spec:\n${JSON.stringify(projectSpec, null, 2)}`,
      '',
      `Design tokens:\n${JSON.stringify(tokens, null, 2)}`,
      '',
      `Design description:\n${designDescription}`,
    ].join('\n');
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
      designDescription,
      codePath,
    );

    await this.state.addLog(run.id, 'Код перегенерирован', { instruction });
  }
}
