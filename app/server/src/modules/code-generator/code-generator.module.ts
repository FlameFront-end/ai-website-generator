import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';
import { CodeGeneratorService } from './code-generator.service';
import { CodeRepairService } from './code-repair.service';
import { CodeValidationService } from './code-validation.service';
import { ScaffoldTemplateService } from './scaffold-template.service';

@Module({
  imports: [AiModule, StorageModule],
  providers: [
    ScaffoldTemplateService,
    CodeValidationService,
    CodeRepairService,
    CodeGeneratorService,
  ],
  exports: [CodeGeneratorService],
})
export class CodeGeneratorModule {}
