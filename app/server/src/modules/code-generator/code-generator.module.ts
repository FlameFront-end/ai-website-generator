import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { CodeGeneratorService } from './code-generator.service';

@Module({
  imports: [AiModule],
  providers: [CodeGeneratorService],
  exports: [CodeGeneratorService],
})
export class CodeGeneratorModule {}
