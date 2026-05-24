import { Injectable, Logger } from '@nestjs/common';

import type {
  DesignDescription,
  DesignTokens,
  ProjectSpec,
  StyleVariantsResult,
} from './types';
import { AiService } from './ai.service';
import {
  buildExtractSpecMessages,
  buildDesignTokensMessages,
  buildDesignDescriptionMessages,
  buildGenerateSvgMessages,
  buildGenerateStyleVariantsMessages,
  normalizeStyleVariantsResult,
} from './prompts';

@Injectable()
export class DesignAiService {
  private readonly logger = new Logger(DesignAiService.name);

  constructor(private readonly ai: AiService) {}

  /**
   * Generate style variants based on brief via LLM
   */
  async generateStyleVariants(brief: string): Promise<StyleVariantsResult> {
    this.logger.log('Generating style variants via AI');

    const result = await this.ai.chat('analysis', {
      messages: buildGenerateStyleVariantsMessages(brief),
      json: true,
      temperature: 0.4,
      maxTokens: 4096,
    });

    const parsed = this.ai.parseJson<StyleVariantsResult>(
      result.content,
      'StyleVariantsResult',
    );

    return normalizeStyleVariantsResult(parsed);
  }

  /**
   * Extract project specification from brief via LLM
   */
  async extractProjectSpec(brief: string): Promise<ProjectSpec> {
    this.logger.log('Extracting project spec from brief via AI');

    const result = await this.ai.chat('analysis', {
      messages: buildExtractSpecMessages(brief),
      json: true,
      temperature: 0.3,
      maxTokens: 4096,
    });

    return this.ai.parseJson<ProjectSpec>(result.content, 'ProjectSpec');
  }

  /**
   * Generate design tokens based on project spec via LLM
   */
  async generateDesignTokens(
    brief: string,
    spec: ProjectSpec,
  ): Promise<DesignTokens> {
    this.logger.log('Generating design tokens via AI');

    const result = await this.ai.chat('analysis', {
      messages: buildDesignTokensMessages(brief, spec),
      json: true,
      temperature: 0.3,
      maxTokens: 4096,
    });

    return this.ai.parseJson<DesignTokens>(result.content, 'DesignTokens');
  }

  /**
   * Generate design description via LLM
   */
  async generateDesignDescription(
    brief: string,
    spec: ProjectSpec,
    tokens: DesignTokens,
  ): Promise<DesignDescription> {
    this.logger.log('Generating design description via AI');

    const result = await this.ai.chat('analysis', {
      messages: buildDesignDescriptionMessages(brief, spec, tokens),
      temperature: 0.5,
      maxTokens: 4096,
    });

    return { markdown: this.sanitizeDesignDescription(result.content) };
  }

  /**
   * Generate reference SVG via LLM
   */
  async generateReferenceSvg(
    brief: string,
    spec: ProjectSpec,
    tokens: DesignTokens,
    designDescription: string,
  ): Promise<string> {
    this.logger.log('Generating reference SVG via AI');

    const result = await this.ai.chat('analysis', {
      messages: buildGenerateSvgMessages(
        brief,
        spec,
        tokens,
        designDescription,
      ),
      temperature: 0.4,
      maxTokens: 4096,
    });

    return this.ai.extractSvg(result.content);
  }

  private sanitizeDesignDescription(markdown: string): string {
    return markdown
      .replace(/```[\s\S]*?```/g, '')
      .split(/\r?\n(?=#{1,6}\s+)/)
      .filter((section) => {
        const heading = section.split(/\r?\n/, 1)[0]?.toLowerCase() ?? '';

        return ![
          'developer handoff',
          'html/css',
          'react',
          'implementation',
          'пример кода',
          'код',
        ].some((blockedHeading) => heading.includes(blockedHeading));
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
