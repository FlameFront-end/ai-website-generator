import { Injectable, Logger } from '@nestjs/common';

import type {
  BriefClarificationAnswer,
  BriefClarificationResult,
} from './types';
import { AiService } from './ai.service';
import { buildClarifyBriefMessages } from './prompts';

@Injectable()
export class BriefAiService {
  private readonly logger = new Logger(BriefAiService.name);

  constructor(private readonly ai: AiService) {}

  async clarifyBrief(
    brief: string,
    answers: BriefClarificationAnswer[] = [],
    siteLanguage?: string,
  ): Promise<BriefClarificationResult> {
    this.logger.log('Clarifying brief via AI');

    const result = await this.ai.chat('analysis', {
      messages: buildClarifyBriefMessages(brief, answers, siteLanguage),
      json: true,
      temperature: 0.35,
      maxTokens: 4096,
    });

    const parsed = this.ai.parseJson<BriefClarificationResult>(
      result.content,
      'BriefClarificationResult',
    );

    return this.sanitizeClarificationResult(answers, parsed);
  }

  private sanitizeClarificationResult(
    answers: BriefClarificationAnswer[],
    result: BriefClarificationResult,
  ): BriefClarificationResult {
    if (result.status !== 'needs_clarification') {
      if (!result.projectTitle?.trim()) {
        throw new Error(
          'AI brief clarification returned ready status without a project title',
        );
      }
      if (!result.finalBrief?.trim()) {
        throw new Error(
          'AI brief clarification returned ready status without a final brief',
        );
      }
      return result;
    }

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

    if (questions.length === 0) {
      throw new Error(
        'AI brief clarification failed: all generated questions were filtered out as banned or duplicate',
      );
    }

    return {
      ...result,
      questions: questions.slice(0, 1),
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
}
