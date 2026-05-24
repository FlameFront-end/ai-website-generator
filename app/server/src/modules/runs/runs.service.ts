import { Injectable } from '@nestjs/common';

import type { RunEntity } from '../../db/entities';
import { RunsCrudService } from './runs-crud.service';
import { RunsWorkflowService } from './runs-workflow.service';
import { ArtifactReaderService } from './artifact-reader.service';
import type { CreateRunDto } from './dto/create-run.dto';
import type { UpdateRunDto } from './dto/update-run.dto';

/**
 * Thin facade preserving the original RunsService API.
 * Delegates to focused sub-services.
 */
@Injectable()
export class RunsService {
  constructor(
    private readonly crud: RunsCrudService,
    private readonly workflow: RunsWorkflowService,
    private readonly artifacts: ArtifactReaderService,
  ) {}

  // ===================== CRUD =====================

  createRun(dto: CreateRunDto, userId: string) {
    return this.crud.createRun(dto, userId);
  }

  getRuns(userId: string): Promise<RunEntity[]> {
    return this.crud.getRuns(userId);
  }

  getRun(id: string, userId: string): Promise<RunEntity | null> {
    return this.crud.getRun(id, userId);
  }

  updateRun(id: string, dto: UpdateRunDto, userId: string) {
    return this.crud.updateRun(id, dto, userId);
  }

  updateRunPinned(id: string, isPinned: boolean, userId: string) {
    return this.crud.updateRunPinned(id, isPinned, userId);
  }

  deleteRun(id: string, userId: string) {
    return this.crud.deleteRun(id, userId);
  }

  // ===================== Workflow =====================

  rebuildRun(id: string, userId: string) {
    return this.workflow.rebuildRun(id, userId);
  }

  restartCurrentStep(id: string, userId: string) {
    return this.workflow.restartCurrentStep(id, userId);
  }

  stopCurrentStep(id: string, userId: string) {
    return this.workflow.stopCurrentStep(id, userId);
  }

  selectStyle(id: string, styleVariantId: string, userId: string) {
    return this.workflow.selectStyle(id, styleVariantId, userId);
  }

  restartCodeStep(id: string, userId: string) {
    return this.workflow.restartCodeStep(id, userId);
  }

  approveStep(
    id: string,
    step: 'style' | 'reference' | 'code' | 'final',
    userId: string,
  ) {
    return this.workflow.approveStep(id, step, userId);
  }

  requestEdit(
    id: string,
    step: 'style' | 'reference' | 'code' | 'final',
    instruction: string,
    userId: string,
  ) {
    return this.workflow.requestEdit(id, step, instruction, userId);
  }

  // ===================== Artifacts =====================

  getArtifactContent(runId: string, artifactId: string, userId: string) {
    return this.artifacts.getArtifactContent(runId, artifactId, userId);
  }

  getArtifactFile(runId: string, artifactId: string, userId: string) {
    return this.artifacts.getArtifactFile(runId, artifactId, userId);
  }

  getCodeFiles(runId: string, userId: string) {
    return this.artifacts.getCodeFiles(runId, userId);
  }

  getCodeFileContent(runId: string, filePath: string, userId: string) {
    return this.artifacts.getCodeFileContent(runId, filePath, userId);
  }

  downloadCode(runId: string, userId: string) {
    return this.artifacts.downloadCode(runId, userId);
  }
}
