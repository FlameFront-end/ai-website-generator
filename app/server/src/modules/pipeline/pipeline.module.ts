import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { CodeGeneratorModule } from '../code-generator/code-generator.module';
import { ImageGenerationModule } from '../image-generation/image-generation.module';
import { StorageModule } from '../storage/storage.module';
import { RunArtifactEntity, RunEntity } from '../../db/entities';
import { RunLogModule } from '../runs/run-log.module';
import { ArtifactService } from './artifact.service';
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
    TypeOrmModule.forFeature([RunEntity, RunArtifactEntity]),
    AiModule,
    CodeGeneratorModule,
    ImageGenerationModule,
    StorageModule,
    RunLogModule,
  ],
  providers: [
    ArtifactService,
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
