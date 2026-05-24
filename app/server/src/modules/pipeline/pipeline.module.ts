import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { CodeGeneratorModule } from '../code-generator/code-generator.module';
import { ImagesModule } from '../images/images.module';
import { StorageModule } from '../storage/storage.module';
import { RunArtifactEntity, RunEntity, RunLogEntity } from '../../db/entities';
import { RunLogService } from '../runs/run-log.service';
import { PipelineService } from './pipeline.service';
import { PipelineStateService } from './pipeline-state.service';
import { BuildService } from './build.service';
import { ScreenshotService } from './screenshot.service';
import { VisualQAService } from './visual-qa.service';
import { StyleStepService } from './style-step.service';
import { ReferenceStepService } from './reference-step.service';
import { CodegenStepService } from './codegen-step.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RunEntity, RunArtifactEntity, RunLogEntity]),
    AiModule,
    CodeGeneratorModule,
    ImagesModule,
    StorageModule,
  ],
  providers: [
    RunLogService,
    PipelineStateService,
    BuildService,
    ScreenshotService,
    VisualQAService,
    StyleStepService,
    ReferenceStepService,
    CodegenStepService,
    PipelineService,
  ],
  exports: [PipelineService],
})
export class PipelineModule {}
