import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RunArtifactEntity, RunEntity, UserEntity } from '../../db/entities';
import { AiModule } from '../ai/ai.module';
import { PipelineModule } from '../pipeline/pipeline.module';
import { StorageModule } from '../storage/storage.module';
import { RunLogModule } from './run-log.module';
import { ArtifactReaderService } from './artifact-reader.service';
import { RunsCrudService } from './runs-crud.service';
import { RunsWorkflowService } from './runs-workflow.service';
import { RunsController } from './runs.controller';

@Module({
  imports: [
    AiModule,
    StorageModule,
    PipelineModule,
    RunLogModule,
    TypeOrmModule.forFeature([RunEntity, RunArtifactEntity, UserEntity]),
  ],
  controllers: [RunsController],
  providers: [RunsCrudService, RunsWorkflowService, ArtifactReaderService],
  exports: [RunLogModule],
})
export class RunsModule {}
