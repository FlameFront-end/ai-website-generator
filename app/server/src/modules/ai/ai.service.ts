import { Injectable, Logger } from '@nestjs/common';

import type {
  BriefClarificationAnswer,
  BriefClarificationResult,
  DesignDescription,
  DesignTokens,
  ProjectSpec,
} from './ai.types';
import { AiProviderRegistry } from './providers/ai-provider.registry';
import { buildExtractSpecMessages } from './prompts/extract-spec.prompt';
import { buildDesignTokensMessages } from './prompts/design-tokens.prompt';
import { buildDesignDescriptionMessages } from './prompts/design-description.prompt';
import { buildGenerateCodeMessages } from './prompts/generate-code.prompt';
import { buildGenerateSvgMessages } from './prompts/generate-svg.prompt';
import { buildClarifyBriefMessages } from './prompts/clarify-brief.prompt';

export type { DesignDescription, DesignTokens, ProjectSpec };

export interface GeneratedCodeFile {
  path: string;
  content: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly providers: AiProviderRegistry) {}

  async clarifyBrief(
    brief: string,
    answers: BriefClarificationAnswer[] = [],
  ): Promise<BriefClarificationResult> {
    this.logger.log('Clarifying brief via AI');

    if (answers.length >= 5) {
      return {
        status: 'ready',
        confidence: 0.8,
        estimatedTotalQuestions: 5,
        missingFields: [],
        questions: [],
        finalBrief: this.buildFallbackFinalBrief(brief, answers),
      };
    }

    const result = await this.providers.chat('analysis', {
      messages: buildClarifyBriefMessages(brief, answers),
      json: true,
      temperature: 0.35,
      maxTokens: 4096,
    });

    const parsed = this.parseJson<BriefClarificationResult>(
      result.content,
      'BriefClarificationResult',
    );

    return this.sanitizeClarificationResult(brief, answers, parsed);
  }

  private sanitizeClarificationResult(
    brief: string,
    answers: BriefClarificationAnswer[],
    result: BriefClarificationResult,
  ): BriefClarificationResult {
    if (result.status !== 'needs_clarification') return result;

    const previousQuestions = answers.map((answer) =>
      this.normalizeQuestion(answer.question),
    );
    const questions = result.questions.filter((question) => {
      const normalized = this.normalizeQuestion(question.question);
      return (
        !this.isBannedClarificationQuestion(normalized) &&
        !previousQuestions.some(
          (previous) =>
            previous === normalized ||
            previous.includes(normalized) ||
            normalized.includes(previous),
        )
      );
    });

    if (questions.length > 0) {
      return {
        ...result,
        questions: questions.slice(0, 1),
      };
    }

    return {
      ...result,
      status: 'ready',
      questions: [],
      finalBrief: this.buildFallbackFinalBrief(brief, answers),
    };
  }

  private normalizeQuestion(question: string) {
    return question
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .trim();
  }

  private isBannedClarificationQuestion(question: string) {
    return [
      'бюджет',
      'стоимость',
      'цена',
      'оплата',
      'срок',
      'дедлайн',
      'deadline',
      'budget',
    ].some((word) => question.includes(word));
  }

  private buildFallbackFinalBrief(
    brief: string,
    answers: BriefClarificationAnswer[],
  ) {
    const answeredContext = answers
      .map((answer) => `${answer.question}: ${String(answer.value)}`)
      .join('\n');

    return [brief, answeredContext].filter(Boolean).join('\n\n');
  }

  /**
   * Extract project specification from brief via LLM
   */
  async extractProjectSpec(brief: string): Promise<ProjectSpec> {
    this.logger.log('Extracting project spec from brief via AI');

    const result = await this.providers.chat('analysis', {
      messages: buildExtractSpecMessages(brief),
      json: true,
      temperature: 0.3,
      maxTokens: 4096,
    });

    return this.parseJson<ProjectSpec>(result.content, 'ProjectSpec');
  }

  /**
   * Generate design tokens based on project spec via LLM
   */
  async generateDesignTokens(
    brief: string,
    spec: ProjectSpec,
  ): Promise<DesignTokens> {
    this.logger.log('Generating design tokens via AI');

    const result = await this.providers.chat('analysis', {
      messages: buildDesignTokensMessages(brief, spec),
      json: true,
      temperature: 0.3,
      maxTokens: 4096,
    });

    return this.parseJson<DesignTokens>(result.content, 'DesignTokens');
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

    const result = await this.providers.chat('analysis', {
      messages: buildDesignDescriptionMessages(brief, spec, tokens),
      temperature: 0.5,
      maxTokens: 4096,
    });

    return { markdown: result.content };
  }

  /**
   * Generate React component code + CSS via LLM
   */
  async generateCode(
    brief: string,
    spec: ProjectSpec,
    tokens: DesignTokens,
    designDescription: string,
  ): Promise<{ files: GeneratedCodeFile[] }> {
    this.logger.log('Generating frontend code via AI');

    const result = await this.providers.chat('code', {
      messages: buildGenerateCodeMessages(
        brief,
        spec,
        tokens,
        designDescription,
      ),
      json: true,
      temperature: 0.3,
      maxTokens: 8192,
    });

    return this.parseJson<{ files: GeneratedCodeFile[] }>(
      result.content,
      'GeneratedCode',
    );
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

    const result = await this.providers.chat('analysis', {
      messages: buildGenerateSvgMessages(
        brief,
        spec,
        tokens,
        designDescription,
      ),
      temperature: 0.4,
      maxTokens: 4096,
    });

    const svg = this.extractSvg(result.content);
    return svg;
  }

  private parseJson<T>(raw: string, label: string): T {
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
      throw new Error(`AI вернул невалидный JSON для ${label}`);
    }
  }

  private extractSvg(raw: string): string {
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
      throw new Error('AI не вернул валидный SVG');
    }

    return cleaned.slice(svgStart);
  }
}
