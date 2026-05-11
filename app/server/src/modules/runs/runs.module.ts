import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RunArtifactEntity, RunEntity, RunLogEntity } from '../../db/entities';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';

@Module({
  imports: [TypeOrmModule.forFeature([RunEntity, RunArtifactEntity, RunLogEntity])],
  controllers: [RunsController],
  providers: [RunsService],
  exports: [RunsService],
})
export class RunsModule {}
