import type {
  BriefClarificationQuestion,
  ClarifyBriefResponse,
} from "@/api/services/runs";

import { MAX_CLARIFICATION_STEPS } from "../../../lib/brief-wizard";
import type { DraftAnswerMap } from "../../../lib/brief-drafts";

interface UseBriefWizardProgressOptions {
  answersCount: number;
  answerMap: DraftAnswerMap;
  clarification: ClarifyBriefResponse | null;
}

interface UseBriefWizardProgressResult {
  canSubmitAnswers: boolean;
  currentAnswer: DraftAnswerMap[string] | undefined;
  currentQuestion: BriefClarificationQuestion | null;
  currentQuestionKey: string;
  displayedStep: number;
  estimatedTotalQuestions: number;
  progressPercent: number;
}

export function useBriefWizardProgress({
  answersCount,
  answerMap,
  clarification,
}: UseBriefWizardProgressOptions): UseBriefWizardProgressResult {
  const currentQuestion = clarification?.questions[0] ?? null;
  const currentQuestionKey = currentQuestion
    ? `${currentQuestion.id}:${currentQuestion.question}`
    : "";
  const currentAnswer = currentQuestion
    ? answerMap[currentQuestion.id]
    : undefined;
  const displayedStep = Math.min(answersCount + 1, MAX_CLARIFICATION_STEPS);
  const estimatedTotalQuestions = Math.min(
    MAX_CLARIFICATION_STEPS,
    Math.max(
      displayedStep,
      clarification?.estimatedTotalQuestions ?? answersCount + 2,
    ),
  );
  const progressPercent = Math.min(
    100,
    Math.max(20, Math.round((displayedStep / estimatedTotalQuestions) * 100)),
  );
  const canSubmitAnswers = Boolean(
    currentQuestion &&
      (!currentQuestion.required ||
        (Array.isArray(currentAnswer)
          ? currentAnswer.length > 0
          : currentAnswer !== undefined && currentAnswer !== "")),
  );

  return {
    canSubmitAnswers,
    currentAnswer,
    currentQuestion,
    currentQuestionKey,
    displayedStep,
    estimatedTotalQuestions,
    progressPercent,
  };
}
