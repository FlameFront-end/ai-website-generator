import { Injectable, Logger } from '@nestjs/common';

import { AiProviderRegistry } from './providers/ai-provider.registry';
import type {
  AiProviderRole,
  ChatCompletionOptions,
  ChatCompletionResult,
} from './providers/ai-provider.interface';

export type { AiProviderRole, ChatCompletionOptions, ChatCompletionResult };

/**
 * Base AI service — thin wrapper around AiProviderRegistry
 * providing LLM chat access and response-parsing utilities.
 * Domain-specific AI logic lives in BriefAiService, DesignAiService, CodegenAiService.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly providers: AiProviderRegistry) {}

  chat(
    role: AiProviderRole,
    options: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    return this.providers.chat(role, options);
  }

  parseJson<T>(raw: string, label: string): T {
    let cleaned = raw.trim();

    // Strip markdown code fences if present
    const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      this.logger.error(
        `Failed to parse ${label} JSON: ${cleaned.slice(0, 300)}`,
      );
      throw new Error(`AI returned invalid JSON for ${label}`);
    }
  }

  extractSvg(raw: string): string {
    let cleaned = raw.trim();

    // Strip markdown code fences
    const fenceMatch = cleaned.match(
      /```(?:svg|xml|html)?\s*\n?([\s\S]*?)\n?```/,
    );
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }

    // Ensure it starts with <svg
    const svgStart = cleaned.indexOf('<svg');
    if (svgStart === -1) {
      this.logger.error(
        `No <svg> tag found in AI response: ${cleaned.slice(0, 200)}`,
      );
      throw new Error('AI did not return valid SVG');
    }

    return cleaned.slice(svgStart);
  }
}
