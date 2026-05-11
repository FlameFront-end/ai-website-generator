import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';

import type { CreateRunDto } from './dto/create-run.dto';
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
      throw new NotFoundException('Run not found');
    }

    return run;
  }

  @Get(':id/artifacts/:artifactId/content')
  getArtifactContent(@Param('id') id: string, @Param('artifactId') artifactId: string) {
    return this.runsService.getArtifactContent(id, artifactId);
  }
}
