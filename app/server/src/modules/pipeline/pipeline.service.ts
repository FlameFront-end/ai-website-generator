import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { promises as fs } from 'node:fs';

import type { StyleVariant } from '../ai/types';
import { ArtifactType, RunStatus } from '../../common/enums';
import { RunEntity } from '../../db/entities';
import { sleep } from '../../common/utils';
import { PIPELINE_STEP_DELAY_MS } from '../../common/constants/pipeline';
import { StorageService } from '../storage/storage.service';
import { ArtifactService } from './artifact.service';
import { PipelineStateService } from './pipeline-state.service';
import { StyleStepService } from './style-step.service';
import { ReferenceStepService } from './reference-step.service';
import { CodegenStepService } from './codegen-step.service';
import { StyleToSpecMapper } from '../ai/mappers/style-to-spec.mapper';
const SHUTDOWN_DRAIN_TIMEOUT_MS = 15_000;

@Injectable()
export class PipelineService implements OnApplicationShutdown {
  private readonly logger = new Logger(PipelineService.name);
  private readonly activeRuns = new Map<string, Promise<void>>();
  private shuttingDown = false;

  constructor(
    private readonly state: PipelineStateService,
    private readonly storageService: StorageService,
    private readonly artifactService: ArtifactService,
    private readonly styleStep: StyleStepService,
    private readonly referenceStep: ReferenceStepService,
    private readonly codegenStep: CodegenStepService,
  ) {}

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.shuttingDown = true;
    const count = this.activeRuns.size;

    if (count === 0) {
      this.logger.log(
        `Shutdown (${signal ?? 'unknown'}): no active pipeline runs`,
      );
      return;
    }

    this.logger.warn(
      `Shutdown (${signal ?? 'unknown'}): stopping ${count} active pipeline run(s)`,
    );

    for (const runId of this.activeRuns.keys()) {
      try {
        await this.state.stopRunById(runId, 'Server is shutting down');
      } catch (err) {
        this.logger.error(`Failed to stop run ${runId}`, err);
      }
    }

    await Promise.race([
      Promise.allSettled([...this.activeRuns.values()]),
      new Promise<void>((resolve) =>
        setTimeout(resolve, SHUTDOWN_DRAIN_TIMEOUT_MS),
      ),
    ]);

    this.logger.log(
      `Shutdown drain complete, ${this.activeRuns.size} run(s) still in-flight`,
    );
  }

  processRun(run: RunEntity, userId: string): void {
    if (this.shuttingDown) return;
    this.trackRun(run.id, async () => {
      try {
        await sleep(PIPELINE_STEP_DELAY_MS);
        await this.styleStep.generateStyleVariantsStep(run, userId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown pipeline error';
        await this.state.failRun(run, message);
      }
    });
  }

  async rebuildRun(run: RunEntity, userId: string): Promise<void> {
    if (this.shuttingDown) return;
    const rebuildRun = await this.state.updateRunStatus(
      run,
      RunStatus.Running,
      'build_project',
      userId,
    );
    this.trackRun(run.id, () =>
      this.codegenStep.runBuildAndQA(rebuildRun, rebuildRun.id, userId),
    );
  }

  /**
   * Resume run from current status
   */
  resumeRun(run: RunEntity, userId: string): void {
    if (this.shuttingDown) return;
    this.trackRun(run.id, async () => {
      try {
        switch (run.status) {
          case RunStatus.AwaitingStyleSelection:
            await this.state.addLog(
              run.id,
              'Waiting for user to select a style',
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
              'Cannot resume from the current status',
            );
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Error while resuming the pipeline';
        await this.state.failRun(run, message);
      }
    });
  }

  /**
   * Select style without continuing the pipeline.
   */
  async selectStyle(
    run: RunEntity,
    selectedStyleId: string,
    userId: string,
  ): Promise<void> {
    if (this.shuttingDown) return;
    const variantsArtifact = await this.artifactService.getArtifactByType(
      run.id,
      ArtifactType.StyleVariants,
    );
    if (!variantsArtifact) {
      await this.state.failRun(run, 'Style variants not found');
      return;
    }

    const variantsContent = await this.storageService.readArtifactFile(
      variantsArtifact.path,
    );
    const variants = JSON.parse(variantsContent) as {
      variants: StyleVariant[];
    };

    const selectedStyle = variants.variants.find(
      (v) => v.id === selectedStyleId,
    );
    if (!selectedStyle) {
      await this.state.failRun(run, `Style ${selectedStyleId} not found`);
      return;
    }

    // Save selected style as artifact
    const selectedStylePath = this.storageService.getRunRelativePath(
      userId,
      run.id,
      'style',
      'selected-style.json',
    );
    const selectedStyleAbsolutePath = this.storageService.getRunAbsolutePath(
      userId,
      run.id,
      'style',
      'selected-style.json',
    );

    await this.storageService.writeGeneratedFile(
      selectedStyleAbsolutePath,
      JSON.stringify(selectedStyle, null, 2),
    );

    await this.artifactService.updateArtifact(
      run.id,
      ArtifactType.SelectedStyle,
      selectedStylePath,
      'application/json',
    );

    await this.state.addLog(run.id, `Style selected: ${selectedStyle.name}`);

    await this.state.updateRunStatus(
      run,
      RunStatus.AwaitingStyleSelection,
      'awaiting_style_selection',
      userId,
    );
  }

  startReferenceFromSelectedStyle(run: RunEntity, userId: string): void {
    if (this.shuttingDown) return;
    this.trackRun(run.id, async () => {
      const selectedStyleArtifact =
        await this.artifactService.getArtifactByType(
          run.id,
          ArtifactType.SelectedStyle,
        );

      if (!selectedStyleArtifact) {
        await this.state.failRun(run, 'Please select a visual style first');
        return;
      }

      const selectedStyle = JSON.parse(
        await this.storageService.readArtifactFile(selectedStyleArtifact.path),
      ) as StyleVariant;

      await this.referenceStep.prepareReferenceImage(
        run,
        selectedStyle,
        userId,
      );
    });
  }

  /**
   * Regenerate a specific step
   */
  regenerateStep(
    run: RunEntity,
    step: 'style' | 'reference' | 'code' | 'final',
    instruction: string,
    userId: string,
  ): void {
    if (this.shuttingDown) return;
    this.trackRun(run.id, async () => {
      try {
        switch (step) {
          case 'style':
            await this.cleanStepWorkspace(userId, run.id, 'style');
            await this.styleStep.regenerateStyle(run, instruction, userId);
            break;
          case 'reference':
            await this.cleanStepWorkspace(userId, run.id, 'reference');
            await this.referenceStep.regenerateReference(
              run,
              instruction,
              userId,
            );
            break;
          case 'code':
            await this.cleanStepWorkspace(userId, run.id, 'code');
            await this.codegenStep.regenerateCode(run, instruction, userId);
            break;
          case 'final':
            await this.state.addLog(run.id, 'Final step cannot be regenerated');
            break;
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Error while regenerating step';
        await this.state.failRun(run, message);
      }
    });
  }

  /**
   * Restart a specific step
   */
  async restartStep(
    run: RunEntity,
    step: 'style' | 'reference' | 'code',
    userId: string,
  ): Promise<void> {
    if (this.shuttingDown) return;

    const stepTitleMap: Record<typeof step, string> = {
      style: 'Style',
      reference: 'Visual reference',
      code: 'Website code',
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
    await this.state.addLog(run.id, `Restarting step: ${stepTitleMap[step]}`);

    this.trackRun(run.id, () => this.finishRestartStep(run, step, userId));
  }

  // ===================== Private helpers =====================

  private trackRun(runId: string, fn: () => Promise<void>): void {
    const promise = fn()
      .catch((err: unknown) => {
        this.logger.error(`Unhandled error in tracked run ${runId}`, err);
      })
      .finally(() => this.activeRuns.delete(runId));
    this.activeRuns.set(runId, promise);
  }

  private async resumeFromReference(
    run: RunEntity,
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

    const designDescription =
      StyleToSpecMapper.toDesignDescription(selectedStyle);

    await this.codegenStep.prepareFrontendProject(
      run,
      selectedStyle,
      designDescription,
      userId,
    );
  }

  private async resumeFromCode(run: RunEntity, userId: string): Promise<void> {
    const referenceArtifact = await this.artifactService.getArtifactByType(
      run.id,
      ArtifactType.ReferenceImage,
    );

    if (!referenceArtifact) {
      await this.state.failRun(run, 'Reference image artifact not found');
      return;
    }

    const selectedStyleArtifact = await this.artifactService.getArtifactByType(
      run.id,
      ArtifactType.SelectedStyle,
    );

    if (!selectedStyleArtifact) {
      await this.state.failRun(run, 'Selected style not found');
      return;
    }

    await this.codegenStep.runBuildAndQA(run, run.id, userId);
  }

  private async resumeFromFinal(run: RunEntity, userId: string): Promise<void> {
    await this.state.updateRunStatus(
      run,
      RunStatus.Completed,
      'completed',
      userId,
    );
    await this.state.addLog(run.id, 'Project completed');
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
          await this.cleanStepWorkspace(userId, run.id, 'style');
          await this.styleStep.regenerateStyle(run, '', userId);
          break;
        case 'reference':
          await this.cleanStepWorkspace(userId, run.id, 'reference');
          await this.referenceStep.regenerateReference(run, '', userId);
          break;
        case 'code':
          await this.cleanStepWorkspace(userId, run.id, 'code');
          await this.codegenStep.regenerateCode(run, '', userId);
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
        error instanceof Error ? error.message : 'Error while restarting step';
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
      const dir = this.storageService.getRunAbsolutePath(userId, runId, folder);
      await fs.rm(dir, { recursive: true, force: true });
    }

    for (const type of types) {
      await this.artifactService.deleteArtifactsByType(runId, type);
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
}
