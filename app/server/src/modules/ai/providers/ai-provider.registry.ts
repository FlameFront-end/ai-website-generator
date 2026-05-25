import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { getAppConfig } from '../../../config/config.module';
import type { AppConfig } from '../../../config/config';
import type {
  AiProvider,
  AiProviderRole,
  ChatCompletionOptions,
  ChatCompletionResult,
} from './ai-provider.interface';
import { GeminiProvider } from './gemini.provider';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';

class UnsupportedChatProvider implements AiProvider {
  constructor(private readonly role: AiProviderRole) {}

  chat(): Promise<ChatCompletionResult> {
    throw new ServiceUnavailableException(
      `AI role "${this.role}" is not configured as a chat provider`,
    );
  }
}

@Injectable()
export class AiProviderRegistry {
  private readonly providers: Record<AiProviderRole, AiProvider>;
  private readonly aiConfig: AppConfig['ai'];

  constructor(configService: ConfigService) {
    this.aiConfig = getAppConfig(configService).ai;
    this.providers = {
      analysis: this.createProvider('analysis'),
      image: this.createProvider('image'),
      code: this.createProvider('code'),
    };
  }

  chat(
    role: AiProviderRole,
    options: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    return this.providers[role].chat(options);
  }

  private createProvider(role: AiProviderRole): AiProvider {
    const config = this.aiConfig.roles[role];

    switch (config.provider) {
      case 'lmstudio':
      case 'openai':
      case 'openrouter':
      case 'llm7':
        return new OpenAiCompatibleProvider(role, config);
      case 'gemini':
        return new GeminiProvider(role, config);
      default:
        return new UnsupportedChatProvider(role);
    }
  }
}
