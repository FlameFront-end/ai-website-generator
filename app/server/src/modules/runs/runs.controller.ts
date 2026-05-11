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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import type { CreateRunDto } from './dto/create-run.dto';
import type { UpdateRunDto } from './dto/update-run.dto';
import { RunsService } from './runs.service';

@Controller('runs')
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Post()
  createRun(@Body() body: CreateRunDto) {
    return this.runsService.createRun(body);
  }

  @Get()
  getRuns() {
    return this.runsService.getRuns();
  }

  @Get(':id')
  async getRun(@Param('id') id: string) {
    const run = await this.runsService.getRun(id);

    if (!run) {
      throw new NotFoundException('Запуск не найден');
    }

    return run;
  }

  @Patch(':id')
  updateRun(@Param('id') id: string, @Body() body: UpdateRunDto) {
    return this.runsService.updateRun(id, body);
  }

  @Delete(':id')
  deleteRun(@Param('id') id: string) {
    return this.runsService.deleteRun(id);
  }

  @Get(':id/artifacts/:artifactId/content')
  getArtifactContent(
    @Param('id') id: string,
    @Param('artifactId') artifactId: string,
  ) {
    return this.runsService.getArtifactContent(id, artifactId);
  }

  @Get(':id/artifacts/:artifactId/file')
  async getArtifactFile(
    @Param('id') id: string,
    @Param('artifactId') artifactId: string,
    @Res() response: Response,
  ) {
    const file = await this.runsService.getArtifactFile(id, artifactId);
    response.type(file.mimeType);
    return response.sendFile(file.absolutePath);
  }

  @Get(':id/code-files')
  getCodeFiles(@Param('id') id: string) {
    return this.runsService.getCodeFiles(id);
  }

  @Get(':id/code-file')
  getCodeFileContent(@Param('id') id: string, @Query('path') filePath: string) {
    return this.runsService.getCodeFileContent(id, filePath);
  }

  @Get(':id/download-code')
  async downloadCode(@Param('id') id: string, @Res() response: Response) {
    const buffer = await this.runsService.downloadCode(id);
    response.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="frontend-project.zip"',
    });
    return response.send(buffer);
  }

  @Post(':id/rebuild')
  async rebuild(@Param('id') id: string) {
    return this.runsService.rebuildRun(id);
  }
}
