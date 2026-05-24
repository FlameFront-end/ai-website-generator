import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  RunArtifactEntity,
  RunEntity,
  RunLogEntity,
  UserEntity,
} from '../../db/entities';
import { AiModule } from '../ai/ai.module';
import { PipelineModule } from '../pipeline/pipeline.module';
import { StorageModule } from '../storage/storage.module';
import { RunLogService } from './run-log.service';
import { RunsCrudService } from './runs-crud.service';
import { RunsWorkflowService } from './runs-workflow.service';
import { ArtifactReaderService } from './artifact-reader.service';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';

@Module({
  imports: [
    AiModule,
    StorageModule,
    PipelineModule,
    TypeOrmModule.forFeature([
      RunEntity,
      RunArtifactEntity,
      RunLogEntity,
      UserEntity,
    ]),
  ],
  controllers: [RunsController],
  providers: [
    RunLogService,
    RunsCrudService,
    RunsWorkflowService,
    ArtifactReaderService,
    RunsService,
  ],
  exports: [RunLogService, RunsService],
})
export class RunsModule {}
