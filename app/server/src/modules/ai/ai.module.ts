import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiProviderRegistry } from './providers/ai-provider.registry';

@Module({
  providers: [AiProviderRegistry, AiService],
  exports: [AiService],
})
export class AiModule {}
