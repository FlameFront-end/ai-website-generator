import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { BriefAiService } from './brief-ai.service';
import { CodegenAiService } from './codegen-ai.service';
import { DesignAiService } from './design-ai.service';
import { AiProviderRegistry } from './providers/ai-provider.registry';

@Module({
  providers: [
    AiProviderRegistry,
    AiService,
    BriefAiService,
    DesignAiService,
    CodegenAiService,
  ],
  exports: [AiService, BriefAiService, DesignAiService, CodegenAiService],
})
export class AiModule {}
