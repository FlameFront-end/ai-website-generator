import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { CodeGeneratorModule } from '../code-generator/code-generator.module';
import { StorageModule } from '../storage/storage.module';
import { RunArtifactEntity, RunEntity, RunLogEntity } from '../../db/entities';
import { PipelineService } from './pipeline.service';
import { PipelineStateService } from './pipeline-state.service';
import { BuildService } from './build.service';
import { ScreenshotService } from './screenshot.service';
import { VisualQAService } from './visual-qa.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RunEntity, RunArtifactEntity, RunLogEntity]),
    AiModule,
    CodeGeneratorModule,
    StorageModule,
  ],
  providers: [
    PipelineService,
    PipelineStateService,
    BuildService,
    ScreenshotService,
    VisualQAService,
  ],
  exports: [PipelineService],
})
export class PipelineModule {}
