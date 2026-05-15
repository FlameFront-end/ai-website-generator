import { Injectable, Logger } from '@nestjs/common';

import type {
  BriefClarificationAnswer,
  BriefClarificationResult,
  CodePlan,
  CodePlanSection,
  DesignDescription,
  DesignTokens,
  GeneratedContentModule,
  GeneratedLayoutModule,
  GeneratedSectionModule,
  ProjectSpec,
} from './ai.types';
import { AiProviderRegistry } from './providers/ai-provider.registry';
import { buildExtractSpecMessages } from './prompts/extract-spec.prompt';
import { buildDesignTokensMessages } from './prompts/design-tokens.prompt';
import { buildDesignDescriptionMessages } from './prompts/design-description.prompt';
import { buildGenerateCodeMessages } from './prompts/generate-code.prompt';
import { buildGenerateSvgMessages } from './prompts/generate-svg.prompt';
import { buildClarifyBriefMessages } from './prompts/clarify-brief.prompt';
import { buildCodePlanMessages } from './prompts/code-plan.prompt';
import { buildGenerateContentMessages } from './prompts/generate-content.prompt';
import { buildGenerateLayoutMessages } from './prompts/generate-layout.prompt';
import { buildGenerateSectionMessages } from './prompts/generate-section.prompt';
import { buildRepairCodeFilesMessages } from './prompts/repair-code-files.prompt';
import { buildRepairCodeModuleMessages } from './prompts/repair-code-module.prompt';

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
    siteLanguage?: string,
  ): Promise<BriefClarificationResult> {
    this.logger.log('Clarifying brief via AI');

    const result = await this.providers.chat('analysis', {
      messages: buildClarifyBriefMessages(brief, answers, siteLanguage),
      json: true,
      temperature: 0.35,
      maxTokens: 4096,
    });

    const parsed = this.parseJson<BriefClarificationResult>(
      result.content,
      'BriefClarificationResult',
    );

    return this.sanitizeClarificationResult(
      brief,
      answers,
      parsed,
      siteLanguage,
    );
  }

  private sanitizeClarificationResult(
    brief: string,
    answers: BriefClarificationAnswer[],
    result: BriefClarificationResult,
    siteLanguage?: string,
  ): BriefClarificationResult {
    const sanitizedResult = {
      ...result,
      understoodSummary: this.sanitizeUnderstoodSummary(
        brief,
        result.understoodSummary ?? '',
        siteLanguage,
      ),
    };

    if (sanitizedResult.status !== 'needs_clarification') {
      return {
        ...sanitizedResult,
        projectTitle:
          sanitizedResult.projectTitle?.trim() ||
          this.buildFallbackProjectTitle(brief),
      };
    }

    const previousQuestions = answers.map((answer) =>
      this.normalizeQuestion(answer.question),
    );
    const questions = sanitizedResult.questions.filter((question) => {
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
        ...sanitizedResult,
        questions: questions.slice(0, 1),
      };
    }

    return {
      ...sanitizedResult,
      status: 'ready',
      projectTitle: this.buildFallbackProjectTitle(brief),
      questions: [],
      finalBrief: this.buildFallbackFinalBrief(brief, answers),
    };
  }

  private sanitizeUnderstoodSummary(
    brief: string,
    understoodSummary: string,
    siteLanguage?: string,
  ): string {
    if (siteLanguage !== 'ru' || !this.looksEnglish(understoodSummary)) {
      return understoodSummary;
    }

    const firstSentence = brief
      .trim()
      .split(/(?<=[.!?。])\s+/u)
      .find(Boolean);

    return [
      'Понятно, что нужно создать современный сайт на основе вашего брифа.',
      firstSentence
        ? `Основная идея: ${firstSentence}`
        : 'Я учту аудиторию, цель, структуру, визуальный стиль и ключевое действие пользователя.',
    ].join(' ');
  }

  private looksEnglish(value: string): boolean {
    const latinMatches = value.match(/[a-z]/gi)?.length ?? 0;
    const cyrillicMatches = value.match(/[а-яё]/gi)?.length ?? 0;

    return latinMatches > cyrillicMatches;
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
      .map((answer) => {
        const value = Array.isArray(answer.value)
          ? answer.value.join(', ')
          : String(answer.value);
        return value.trim();
      })
      .filter(Boolean)
      .join('\n');

    return [
      'Идея сайта',
      brief.trim(),
      '',
      'Уточнённый контекст',
      answeredContext,
      '',
      'Проектная задача',
      'Нужно сгенерировать полноценный современный сайт на основе исходной идеи и уточнённого контекста. Сайт должен понятно объяснять предложение, быть ориентирован на выбранную аудиторию и вести пользователя к целевому действию.',
      '',
      'Требования к генерации',
      'Использовать уточнения как требования к структуре, содержанию, визуальному стилю, тону коммуникации и приоритетам интерфейса. Если часть деталей не указана явно, аккуратно додумать их в рамках исходной идеи, аудитории и выбранного направления сайта.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildFallbackProjectTitle(brief: string): string {
    const title = brief
      .trim()
      .replace(/\s+/g, ' ')
      .split(/[.!?\n]/)[0]
      .slice(0, 60)
      .trim();

    return title || 'Новый проект';
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

    return { markdown: this.sanitizeDesignDescription(result.content) };
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
      maxTokens: 16384,
    });

    return this.parseJson<{ files: GeneratedCodeFile[] }>(
      result.content,
      'GeneratedCode',
    );
  }

  async generateCodePlan(
    brief: string,
    spec: ProjectSpec,
    tokens: DesignTokens,
    codegenContext: string,
  ): Promise<CodePlan> {
    this.logger.log('Generating frontend code plan via AI');

    const result = await this.providers.chat('code', {
      messages: buildCodePlanMessages(brief, spec, tokens, codegenContext),
      json: true,
      temperature: 0.2,
      maxTokens: 4096,
    });

    return this.parseJson<CodePlan>(result.content, 'CodePlan');
  }

  async generateCodeContent(
    brief: string,
    spec: ProjectSpec,
    tokens: DesignTokens,
    codePlan: CodePlan,
    codegenContext: string,
  ): Promise<{ files: GeneratedContentModule[] }> {
    this.logger.log('Generating frontend content files via AI');

    const result = await this.providers.chat('code', {
      messages: buildGenerateContentMessages(
        brief,
        spec,
        tokens,
        codePlan,
        codegenContext,
      ),
      json: true,
      temperature: 0.25,
      maxTokens: 8192,
    });

    return this.parseJson<{ files: GeneratedContentModule[] }>(
      result.content,
      'GeneratedContent',
    );
  }

  async generateCodeLayout(
    brief: string,
    spec: ProjectSpec,
    tokens: DesignTokens,
    codePlan: CodePlan,
    contentFiles: string,
    codegenContext: string,
    fullPageImageDataUrl: string | null,
  ): Promise<GeneratedLayoutModule> {
    this.logger.log('Generating frontend layout files via AI');

    const result = await this.providers.chat('code', {
      messages: buildGenerateLayoutMessages(
        brief,
        spec,
        tokens,
        codePlan,
        contentFiles,
        codegenContext,
        fullPageImageDataUrl,
      ),
      json: true,
      temperature: 0.25,
      maxTokens: 8192,
    });

    return this.parseJson<GeneratedLayoutModule>(
      result.content,
      'GeneratedLayout',
    );
  }

  async generateCodeSection(
    brief: string,
    spec: ProjectSpec,
    tokens: DesignTokens,
    codePlan: CodePlan,
    section: CodePlanSection,
    contentFiles: string,
    codegenContext: string,
    sectionImageDataUrl: string | null,
  ): Promise<GeneratedSectionModule> {
    this.logger.log(`Generating frontend section via AI: ${section.id}`);

    const result = await this.providers.chat('code', {
      messages: buildGenerateSectionMessages(
        brief,
        spec,
        tokens,
        codePlan,
        section,
        contentFiles,
        codegenContext,
        sectionImageDataUrl,
      ),
      json: true,
      temperature: 0.3,
      maxTokens: 8192,
    });

    return this.parseJson<GeneratedSectionModule>(
      result.content,
      'GeneratedSection',
    );
  }

  async repairCodeFiles(
    brief: string,
    spec: ProjectSpec,
    tokens: DesignTokens,
    validationError: string,
    files: GeneratedCodeFile[],
    codegenContext: string,
  ): Promise<{ files: GeneratedCodeFile[] }> {
    this.logger.log('Repairing generated frontend files via AI');

    const result = await this.providers.chat('code', {
      messages: buildRepairCodeFilesMessages(
        brief,
        spec,
        tokens,
        validationError,
        files,
        codegenContext,
      ),
      json: true,
      temperature: 0.15,
      maxTokens: 16384,
    });

    return this.parseJson<{ files: GeneratedCodeFile[] }>(
      result.content,
      'RepairedCodeFiles',
    );
  }

  async repairCodeModule(
    brief: string,
    spec: ProjectSpec,
    tokens: DesignTokens,
    targetModule: string,
    validationError: string,
    moduleFiles: GeneratedCodeFile[],
    contextFiles: GeneratedCodeFile[],
    codegenContext: string,
  ): Promise<{ files: GeneratedCodeFile[] }> {
    this.logger.log(
      `Repairing generated frontend module via AI: ${targetModule}`,
    );

    const result = await this.providers.chat('code', {
      messages: buildRepairCodeModuleMessages(
        brief,
        spec,
        tokens,
        targetModule,
        validationError,
        moduleFiles,
        contextFiles,
        codegenContext,
      ),
      json: true,
      temperature: 0.15,
      maxTokens: 8192,
    });

    return this.parseJson<{ files: GeneratedCodeFile[] }>(
      result.content,
      'RepairedCodeModule',
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
