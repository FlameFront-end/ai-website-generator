import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ArtifactType, RunStatus } from '../../common/enums';
import { RunArtifactEntity, RunEntity } from '../../db/entities';
import { PipelineService } from '../pipeline/pipeline.service';
import { RunsCrudService } from './runs-crud.service';

@Injectable()
export class RunsWorkflowService {
  constructor(
    @InjectRepository(RunEntity)
    private readonly runsRepository: Repository<RunEntity>,
    @InjectRepository(RunArtifactEntity)
    private readonly artifactsRepository: Repository<RunArtifactEntity>,
    private readonly pipelineService: PipelineService,
    private readonly crud: RunsCrudService,
  ) {}

  async rebuildRun(
    runId: string,
    userId: string,
  ): Promise<{ id: string; status: string }> {
    const run = await this.crud.getRunOrFail(runId, userId);

    await this.crud.addLog(run.id, 'Rebuild started');

    void this.pipelineService.rebuildRun(run, userId);

    return {
      id: run.id,
      status: run.status,
    };
  }

  async restartCurrentStep(
    runId: string,
    userId: string,
  ): Promise<{ id: string; status: string }> {
    let run = await this.crud.getRunOrFail(runId, userId);

    if (run.status !== RunStatus.Failed) {
      throw new BadRequestException('Only a failed step can be restarted');
    }

    run = (await this.runsRepository.findOne({ where: { id: runId } })) || run;

    const step = await this.getRestartableStep(
      run.status,
      run.currentStep,
      run.id,
    );

    if (!step) {
      throw new BadRequestException(
        'No restartable step found for the current run state',
      );
    }

    await this.crud.addLog(
      run.id,
      `Step restart request accepted: ${this.formatPipelineStep(step)}`,
    );

    await this.pipelineService.restartStep(run, step, userId);

    return {
      id: run.id,
      status: RunStatus.Running,
    };
  }

  async stopCurrentStep(
    runId: string,
    userId: string,
  ): Promise<{ id: string; status: string }> {
    const run = await this.crud.getRunOrFail(runId, userId);

    if (run.status !== RunStatus.Running && run.status !== RunStatus.Queued) {
      throw new BadRequestException('Only an active step can be stopped');
    }

    await this.crud.markRunStopped(run, 'Step stopped by user');

    return {
      id: run.id,
      status: RunStatus.Failed,
    };
  }

  async editReferenceBlock(
    runId: string,
    artifactId: string,
    bbox: { x: number; y: number; width: number; height: number },
    instruction: string,
    userId: string,
  ): Promise<{
    id: string;
    status: string;
    artifactId: string;
    path: string;
    model: string;
  }> {
    const run = await this.crud.getRunOrFail(runId, userId);

    if (run.status !== RunStatus.AwaitingReferenceApproval) {
      throw new BadRequestException(
        'Reference block editing is only available during reference approval',
      );
    }

    if (bbox.x + bbox.width > 1 || bbox.y + bbox.height > 1) {
      throw new BadRequestException('Selected area exceeds image bounds');
    }

    const result = await this.pipelineService.editReferenceBlock(
      run,
      artifactId,
      bbox,
      instruction,
      userId,
    );

    return {
      id: run.id,
      status: run.status,
      ...result,
    };
  }
  async selectStyle(
    runId: string,
    styleVariantId: string,
    userId: string,
  ): Promise<{ id: string; status: string }> {
    const run = await this.crud.getRunOrFail(runId, userId);

    if (run.status !== RunStatus.AwaitingStyleSelection) {
      throw new BadRequestException(
        'Style selection is only available during the style selection phase',
      );
    }

    await this.crud.addLog(run.id, `Style variant selected: ${styleVariantId}`);

    await this.pipelineService.selectStyle(run, styleVariantId, userId);

    const updatedRun = await this.crud.getRunOrFail(runId, userId);
    return { id: updatedRun.id, status: updatedRun.status };
  }

  async restartCodeStep(
    runId: string,
    userId: string,
  ): Promise<{ id: string; status: string }> {
    const run = await this.crud.getRunOrFail(runId, userId);

    if (!this.canRestartCodeStep(run.status)) {
      throw new BadRequestException(
        'Code regeneration is only available after design preparation or for build/QA failures',
      );
    }

    await this.ensureCodeRestartArtifacts(run.id);

    await this.crud.addLog(run.id, 'Code regeneration request accepted');
    await this.pipelineService.restartStep(run, 'code', userId);

    return {
      id: run.id,
      status: RunStatus.Running,
    };
  }

  async approveStep(
    runId: string,
    step: 'style' | 'reference' | 'code' | 'final',
    userId: string,
  ): Promise<{ id: string; status: string }> {
    const run = await this.crud.getRunOrFail(runId, userId);

    const stepToStatusMap: Record<typeof step, RunStatus> = {
      style: RunStatus.Running,
      reference: RunStatus.Running,
      code: RunStatus.AwaitingFinalApproval,
      final: RunStatus.Completed,
    };

    if (step === 'style') {
      const selectedStyle = await this.artifactsRepository.findOne({
        where: {
          runId: run.id,
          type: ArtifactType.SelectedStyle,
        },
      });

      if (!selectedStyle) {
        throw new BadRequestException('Please select a visual style first');
      }
    }

    const nextStatus = stepToStatusMap[step];
    await this.runsRepository.update(runId, {
      status: nextStatus,
      currentStep:
        step === 'style'
          ? 'prepare_reference_image'
          : step === 'reference'
            ? 'prepare_frontend_project'
            : run.currentStep,
    });
    await this.crud.addLog(
      run.id,
      `Step approved: ${this.formatPipelineStep(step)}`,
    );

    if (step === 'style') {
      void this.pipelineService.startReferenceFromSelectedStyle(run, userId);
    } else if (step !== 'final') {
      void this.pipelineService.resumeRun(run, userId);
    }

    const updatedRun = await this.crud.getRunOrFail(runId, userId);
    return { id: updatedRun.id, status: updatedRun.status };
  }

  async requestEdit(
    runId: string,
    step: 'style' | 'reference' | 'code' | 'final',
    instruction: string,
    userId: string,
  ): Promise<{ id: string; status: string }> {
    const run = await this.crud.getRunOrFail(runId, userId);

    await this.crud.addLog(
      run.id,
      `Edit request for step "${this.formatPipelineStep(step)}": ${instruction}`,
      {
        instruction,
      },
    );

    void this.pipelineService.regenerateStep(run, step, instruction, userId);

    return { id: run.id, status: run.status };
  }

  // ===================== Private helpers =====================

  private async ensureCodeRestartArtifacts(runId: string): Promise<void> {
    const requiredTypes: ArtifactType[] = [
      ArtifactType.SelectedStyle,
      ArtifactType.ReferenceImage,
    ];
    const artifacts = await this.artifactsRepository.find({
      where: { runId },
    });
    const types = new Set(artifacts.map((artifact) => artifact.type));
    const missingTypes = requiredTypes.filter((type) => !types.has(type));

    if (missingTypes.length > 0) {
      throw new BadRequestException(
        `Cannot restart code generation: missing artifacts ${missingTypes.join(', ')}`,
      );
    }
  }

  private getRestartableStep(
    status: RunStatus,
    currentStep?: string | null,
    runId?: string,
  ): Promise<'style' | 'reference' | 'code' | null> {
    const statusToStep: Partial<
      Record<RunStatus, 'style' | 'reference' | 'code'>
    > = {
      [RunStatus.AwaitingStyleSelection]: 'style',
      [RunStatus.AwaitingReferenceApproval]: 'reference',
      [RunStatus.AwaitingCodeApproval]: 'code',
    };

    if (statusToStep[status]) {
      return Promise.resolve(statusToStep[status]);
    }

    if (status === RunStatus.Failed) {
      const step = this.getRestartableStepFromCurrentStep(currentStep);
      if (step || !runId) {
        return Promise.resolve(step);
      }
      return this.inferFailedRestartStepFromArtifacts(runId);
    }

    return Promise.resolve(null);
  }

  private getRestartableStepFromCurrentStep(
    currentStep?: string | null,
  ): 'style' | 'reference' | 'code' | null {
    if (!currentStep) return null;
    if (currentStep.includes('style')) return 'style';
    if (currentStep.includes('reference')) return 'reference';
    if (
      currentStep.includes('code') ||
      currentStep.includes('frontend') ||
      currentStep.includes('build') ||
      currentStep.includes('screenshot') ||
      currentStep.includes('visual')
    ) {
      return 'code';
    }
    return null;
  }

  private async inferFailedRestartStepFromArtifacts(
    runId: string,
  ): Promise<'style' | 'reference' | 'code'> {
    const artifacts = await this.artifactsRepository.find({
      where: { runId },
    });
    const types = new Set(artifacts.map((artifact) => artifact.type));

    if (!types.has(ArtifactType.StyleVariants)) return 'style';
    if (!types.has(ArtifactType.ReferenceImage)) return 'reference';
    return 'code';
  }

  private canRestartCodeStep(status: RunStatus): boolean {
    return [
      RunStatus.AwaitingCodeApproval,
      RunStatus.AwaitingFinalApproval,
      RunStatus.BuildFailed,
      RunStatus.VisualFailed,
      RunStatus.NeedsManualReview,
      RunStatus.Failed,
      RunStatus.Completed,
    ].includes(status);
  }

  private formatPipelineStep(step: string): string {
    const labels: Record<string, string> = {
      style: 'Style',
      reference: 'Reference',
      code: 'Code',
      final: 'Final review',
    };

    return labels[step] ?? step;
  }
}
