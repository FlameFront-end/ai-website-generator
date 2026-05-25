import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';

import { RunStatus } from '../../common/enums';
import type { RequestWithUser } from '../../common/types/request.types';
import { RunEntity } from '../../db/entities';
import { BriefAiService } from '../ai/brief-ai.service';
import type { BriefClarificationResult } from '../ai/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ArtifactReaderService } from './artifact-reader.service';
import { ApproveStepDto } from './dto/approve-step.dto';
import { ClarifyBriefDto } from './dto/clarify-brief.dto';
import { CreateRunDto } from './dto/create-run.dto';
import { EditReferenceBlockDto } from './dto/edit-reference-block.dto';
import { EditRequestDto } from './dto/edit-request.dto';
import { SelectStyleDto } from './dto/select-style.dto';
import { UpdateRunPinnedDto } from './dto/update-run-pinned.dto';
import { UpdateRunDto } from './dto/update-run.dto';
import { RunsCrudService } from './runs-crud.service';
import { RunsWorkflowService } from './runs-workflow.service';

@Controller('runs')
@UseGuards(JwtAuthGuard)
export class RunsController {
  constructor(
    private readonly crud: RunsCrudService,
    private readonly workflow: RunsWorkflowService,
    private readonly artifacts: ArtifactReaderService,
    private readonly briefAiService: BriefAiService,
  ) {}

  @Post('brief/clarify')
  clarifyBrief(
    @Body() body: ClarifyBriefDto,
  ): Promise<BriefClarificationResult> {
    return this.briefAiService.clarifyBrief(
      body.brief,
      body.answers ?? [],
      body.siteLanguage,
    );
  }

  @Post()
  createRun(
    @Body() body: CreateRunDto,
    @Request() req: RequestWithUser,
  ): Promise<{ id: string; slug: string; status: RunStatus }> {
    return this.crud.createRun(body, req.user.id);
  }

  @Get()
  getRuns(@Request() req: RequestWithUser): Promise<RunEntity[]> {
    return this.crud.getRuns(req.user.id);
  }

  @Get(':id')
  @SkipThrottle()
  async getRun(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<RunEntity> {
    const run = await this.crud.getRun(id, req.user.id);

    if (!run) {
      throw new NotFoundException('Run not found');
    }

    return run;
  }

  @Patch(':id')
  updateRun(
    @Param('id') id: string,
    @Body() body: UpdateRunDto,
    @Request() req: RequestWithUser,
  ): Promise<RunEntity> {
    return this.crud.updateRun(id, body, req.user.id);
  }

  @Patch(':id/pinned')
  updateRunPinned(
    @Param('id') id: string,
    @Body() body: UpdateRunPinnedDto,
    @Request() req: RequestWithUser,
  ): Promise<RunEntity> {
    return this.crud.updateRunPinned(id, body.isPinned, req.user.id);
  }

  @Delete(':id')
  deleteRun(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<{ id: string; deleted: boolean }> {
    return this.crud.deleteRun(id, req.user.id);
  }

  @Get(':id/artifacts/:artifactId/content')
  getArtifactContent(
    @Param('id') id: string,
    @Param('artifactId') artifactId: string,
    @Request() req: RequestWithUser,
  ): Promise<{
    artifactId: string;
    type: string;
    path: string;
    mimeType: string;
    content: string;
  }> {
    return this.artifacts.getArtifactContent(id, artifactId, req.user.id);
  }

  @Get(':id/artifacts/:artifactId/file')
  async getArtifactFile(
    @Param('id') id: string,
    @Param('artifactId') artifactId: string,
    @Res() response: Response,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    const file = await this.artifacts.getArtifactFile(
      id,
      artifactId,
      req.user.id,
    );
    response.type(file.mimeType);
    response.sendFile(file.absolutePath);
  }

  @Get(':id/code-files')
  getCodeFiles(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<{ path: string; size: number }[]> {
    return this.artifacts.getCodeFiles(id, req.user.id);
  }

  @Get(':id/code-file')
  getCodeFileContent(
    @Param('id') id: string,
    @Query('path') filePath: string,
    @Request() req: RequestWithUser,
  ): Promise<{ path: string; content: string; mimeType: string }> {
    return this.artifacts.getCodeFileContent(id, filePath, req.user.id);
  }

  @Get(':id/download-code')
  async downloadCode(
    @Param('id') id: string,
    @Res() response: Response,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    const buffer = await this.artifacts.downloadCode(id, req.user.id);
    response.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="frontend-project.zip"',
    });
    response.send(buffer);
  }

  @Post(':id/rebuild')
  rebuild(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<{ id: string; status: string }> {
    return this.workflow.rebuildRun(id, req.user.id);
  }

  @Post(':id/restart-current-step')
  restartCurrentStep(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<{ id: string; status: string }> {
    return this.workflow.restartCurrentStep(id, req.user.id);
  }

  @Post(':id/stop-current-step')
  stopCurrentStep(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<{ id: string; status: string }> {
    return this.workflow.stopCurrentStep(id, req.user.id);
  }
  @Post(':id/restart-code-step')
  restartCodeStep(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<{ id: string; status: string }> {
    return this.workflow.restartCodeStep(id, req.user.id);
  }

  @Post(':id/approve')
  approveStep(
    @Param('id') id: string,
    @Body() body: ApproveStepDto,
    @Request() req: RequestWithUser,
  ): Promise<{ id: string; status: string }> {
    return this.workflow.approveStep(id, body.step, req.user.id);
  }

  @Post(':id/edit-request')
  requestEdit(
    @Param('id') id: string,
    @Body() body: EditRequestDto,
    @Request() req: RequestWithUser,
  ): Promise<{ id: string; status: string }> {
    return this.workflow.requestEdit(
      id,
      body.step,
      body.instruction,
      req.user.id,
    );
  }

  @Post(':id/reference-blocks/edit')
  editReferenceBlock(
    @Param('id') id: string,
    @Body() body: EditReferenceBlockDto,
    @Request() req: RequestWithUser,
  ): Promise<{
    id: string;
    status: string;
    artifactId: string;
    path: string;
    model: string;
  }> {
    return this.workflow.editReferenceBlock(
      id,
      body.artifactId,
      body.bbox,
      body.instruction,
      req.user.id,
    );
  }
  @Post(':id/select-style')
  selectStyle(
    @Param('id') id: string,
    @Body() body: SelectStyleDto,
    @Request() req: RequestWithUser,
  ): Promise<{ id: string; status: string }> {
    return this.workflow.selectStyle(id, body.styleVariantId, req.user.id);
  }
}
