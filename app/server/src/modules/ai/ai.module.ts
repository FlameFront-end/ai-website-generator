import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AI_PROVIDER } from './providers/ai-provider.interface';
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider';

@Module({
  providers: [
    {
      provide: AI_PROVIDER,
      useClass: OpenAiCompatibleProvider,
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
