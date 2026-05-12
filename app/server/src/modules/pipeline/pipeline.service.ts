import { Injectable } from '@nestjs/common';
import path from 'node:path';

import type { ProjectSpec, DesignTokens } from '../ai/ai.types';
import { ArtifactType, RunEntity, RunStatus } from '../../db/entities';
import { StorageService } from '../storage/storage.service';
import { AiService } from '../ai/ai.service';
import { CodeGeneratorService } from '../code-generator/code-generator.service';
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

    const tokens = await this.aiService.generateDesignTokens(projectSpec);
    const designDescription = await this.aiService.generateDesignDescription(
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

    const referenceSvg = await this.codeGeneratorService.generateReferenceSvg(
      projectSpec,
      tokens,
    );
    const referenceRelativePath = this.state.getRunRelativePath(
      userId,
      referenceRun.slug,
      'reference',
      'reference.svg',
    );
    const referenceAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      referenceRun.slug,
      'reference',
      'reference.svg',
    );
    await this.state.writeGeneratedFile(referenceAbsolutePath, referenceSvg);

    await this.state.saveArtifact(
      referenceRun.id,
      ArtifactType.ReferenceImage,
      referenceRelativePath,
      'image/svg+xml',
    );
    await this.state.addLog(referenceRun.id, 'Визуальный референс сохранен', {
      path: referenceRelativePath,
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
      projectSpec,
      tokens,
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

    if (!specArtifact || !tokensArtifact) {
      await this.state.failRun(run, 'Артефакты дизайна не найдены');
      return;
    }

    const specContent = await this.state.readArtifactFile(specArtifact.path);
    const tokensContent = await this.state.readArtifactFile(
      tokensArtifact.path,
    );
    const projectSpec = JSON.parse(specContent) as ProjectSpec;
    const tokens = JSON.parse(tokensContent) as DesignTokens;

    await this.prepareReferenceImage(run, projectSpec, tokens, userId);
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

    if (!specArtifact || !tokensArtifact) {
      await this.state.failRun(run, 'Артефакты не найдены');
      return;
    }

    const specContent = await this.state.readArtifactFile(specArtifact.path);
    const tokensContent = await this.state.readArtifactFile(
      tokensArtifact.path,
    );
    const projectSpec = JSON.parse(specContent) as ProjectSpec;
    const tokens = JSON.parse(tokensContent) as DesignTokens;

    await this.prepareFrontendProject(run, projectSpec, tokens, userId);
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
    const referencePath = this.state.getRunAbsolutePath(
      userId,
      run.slug,
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

      await this.prepareReferenceImage(run, projectSpec, tokens, userId);
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

  private async regenerateSpec(
    run: RunEntity,
    instruction: string,
    userId: string,
  ): Promise<void> {
    const updatedBrief = `${run.brief}\n\nПравка: ${instruction}`;
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

    const tokens = await this.aiService.generateDesignTokens(projectSpec);
    const designDescription = await this.aiService.generateDesignDescription(
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

    if (!specArtifact || !tokensArtifact) {
      await this.state.failRun(run, 'Артефакты не найдены');
      return;
    }

    const specContent = await this.state.readArtifactFile(specArtifact.path);
    const tokensContent = await this.state.readArtifactFile(
      tokensArtifact.path,
    );
    const projectSpec = JSON.parse(specContent) as ProjectSpec;
    const tokens = JSON.parse(tokensContent) as DesignTokens;

    const referenceSvg = await this.codeGeneratorService.generateReferenceSvg(
      projectSpec,
      tokens,
    );
    const referenceRelativePath = this.state.getRunRelativePath(
      userId,
      run.slug,
      'reference',
      'reference.svg',
    );
    const referenceAbsolutePath = this.state.getRunAbsolutePath(
      userId,
      run.slug,
      'reference',
      'reference.svg',
    );
    await this.state.writeGeneratedFile(referenceAbsolutePath, referenceSvg);

    await this.state.updateArtifact(
      run.id,
      ArtifactType.ReferenceImage,
      referenceRelativePath,
    );
    await this.state.addLog(run.id, 'Визуальный референс перегенерирован', {
      instruction,
    });
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

    if (!specArtifact || !tokensArtifact) {
      await this.state.failRun(run, 'Артефакты не найдены');
      return;
    }

    const specContent = await this.state.readArtifactFile(specArtifact.path);
    const tokensContent = await this.state.readArtifactFile(
      tokensArtifact.path,
    );
    const projectSpec = JSON.parse(specContent) as unknown as ProjectSpec;
    const tokens = JSON.parse(tokensContent) as unknown as DesignTokens;

    const codePath = path.join(
      this.storageService.getRunPath(userId, run.slug),
      'code',
    );
    await this.codeGeneratorService.generateProjectFiles(
      projectSpec,
      tokens,
      codePath,
    );

    await this.state.addLog(run.id, 'Код перегенерирован', { instruction });
  }
}
