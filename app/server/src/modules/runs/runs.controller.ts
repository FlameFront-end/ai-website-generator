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
import type { Response } from 'express';

import type { RequestWithUser } from '../../common/types/request.types';
import { AiService } from '../ai/ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApproveStepDto } from './dto/approve-step.dto';
import { ClarifyBriefDto } from './dto/clarify-brief.dto';
import { CreateRunDto } from './dto/create-run.dto';
import { EditRequestDto } from './dto/edit-request.dto';
import { UpdateRunDto } from './dto/update-run.dto';
import { RunsService } from './runs.service';

@Controller('runs')
@UseGuards(JwtAuthGuard)
export class RunsController {
  constructor(
    private readonly runsService: RunsService,
    private readonly aiService: AiService,
  ) {}

  @Post('brief/clarify')
  clarifyBrief(@Body() body: ClarifyBriefDto) {
    return this.aiService.clarifyBrief(body.brief, body.answers ?? []);
  }

  @Post()
  createRun(@Body() body: CreateRunDto, @Request() req: RequestWithUser) {
    return this.runsService.createRun(body, req.user.id);
  }

  @Get()
  getRuns(@Request() req: RequestWithUser) {
    return this.runsService.getRuns(req.user.id);
  }

  @Get(':id')
  async getRun(@Param('id') id: string, @Request() req: RequestWithUser) {
    const run = await this.runsService.getRun(id, req.user.id);

    if (!run) {
      throw new NotFoundException('Запуск не найден');
    }

    return run;
  }

  @Patch(':id')
  updateRun(
    @Param('id') id: string,
    @Body() body: UpdateRunDto,
    @Request() req: RequestWithUser,
  ) {
    return this.runsService.updateRun(id, body, req.user.id);
  }

  @Delete(':id')
  deleteRun(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.runsService.deleteRun(id, req.user.id);
  }

  @Get(':id/artifacts/:artifactId/content')
  getArtifactContent(
    @Param('id') id: string,
    @Param('artifactId') artifactId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.runsService.getArtifactContent(id, artifactId, req.user.id);
  }

  @Get(':id/artifacts/:artifactId/file')
  async getArtifactFile(
    @Param('id') id: string,
    @Param('artifactId') artifactId: string,
    @Res() response: Response,
    @Request() req: RequestWithUser,
  ) {
    const file = await this.runsService.getArtifactFile(
      id,
      artifactId,
      req.user.id,
    );
    response.type(file.mimeType);
    return response.sendFile(file.absolutePath);
  }

  @Get(':id/code-files')
  getCodeFiles(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.runsService.getCodeFiles(id, req.user.id);
  }

  @Get(':id/code-file')
  getCodeFileContent(
    @Param('id') id: string,
    @Query('path') filePath: string,
    @Request() req: RequestWithUser,
  ) {
    return this.runsService.getCodeFileContent(id, filePath, req.user.id);
  }

  @Get(':id/download-code')
  async downloadCode(
    @Param('id') id: string,
    @Res() response: Response,
    @Request() req: RequestWithUser,
  ) {
    const buffer = await this.runsService.downloadCode(id, req.user.id);
    response.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="frontend-project.zip"',
    });
    return response.send(buffer);
  }

  @Post(':id/rebuild')
  rebuild(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.runsService.rebuildRun(id, req.user.id);
  }

  @Post(':id/approve')
  approveStep(
    @Param('id') id: string,
    @Body() body: ApproveStepDto,
    @Request() req: RequestWithUser,
  ) {
    return this.runsService.approveStep(id, body.step, req.user.id);
  }

  @Post(':id/edit-request')
  requestEdit(
    @Param('id') id: string,
    @Body() body: EditRequestDto,
    @Request() req: RequestWithUser,
  ) {
    return this.runsService.requestEdit(
      id,
      body.step,
      body.instruction,
      req.user.id,
    );
  }
}
