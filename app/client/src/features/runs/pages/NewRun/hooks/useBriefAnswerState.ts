import { useState } from "react";

import type {
  BriefClarificationAnswer,
  BriefClarificationQuestion,
} from "@/api/services/runs";

import type { DraftAnswerMap } from "../../../lib/brief-drafts";
import { normalizeAnswerValue } from "../../../lib/brief-wizard";

interface UseBriefAnswerStateOptions {
  initialAnswers: BriefClarificationAnswer[];
  initialAnswerMap: DraftAnswerMap;
}

interface SubmitAnswerInput {
  question: BriefClarificationQuestion;
  overrideValue?: BriefClarificationAnswer["value"];
  isSkipped?: boolean;
}

interface UseBriefAnswerStateResult {
  answers: BriefClarificationAnswer[];
  setAnswers: (answers: BriefClarificationAnswer[]) => void;
  answerMap: DraftAnswerMap;
  setAnswerMap: (answerMap: DraftAnswerMap) => void;
  submitAnswer: (input: SubmitAnswerInput) => BriefClarificationAnswer[];
  updateAnswer: (
    question: BriefClarificationQuestion,
    value: string | number | boolean,
  ) => void;
  resetAnswers: () => void;
}

export function useBriefAnswerState({
  initialAnswers,
  initialAnswerMap,
}: UseBriefAnswerStateOptions): UseBriefAnswerStateResult {
  const [answers, setAnswers] =
    useState<BriefClarificationAnswer[]>(initialAnswers);
  const [answerMap, setAnswerMap] = useState<DraftAnswerMap>(initialAnswerMap);

  const submitAnswer = ({
    question,
    overrideValue,
    isSkipped = false,
  }: SubmitAnswerInput) => {
    const nextAnswer: BriefClarificationAnswer = {
      questionId: question.id,
      question: question.question,
      type: question.type,
      description: question.description,
      required: question.required,
      options: question.options,
      placeholder: question.placeholder,
      suggestedAnswer: question.suggestedAnswer,
      min: question.min,
      max: question.max,
      value: isSkipped
        ? "skipped"
        : (overrideValue ?? normalizeAnswerValue(question, answerMap[question.id])),
      skipped: isSkipped,
    };

    const mergedAnswers = [...answers, nextAnswer];
    setAnswers(mergedAnswers);
    setAnswerMap({});
    return mergedAnswers;
  };

  const updateAnswer = (
    question: BriefClarificationQuestion,
    value: string | number | boolean,
  ) => {
    setAnswerMap((prev) => {
      if (question.type !== "multi_choice") {
        return { ...prev, [question.id]: value };
      }

      const current = Array.isArray(prev[question.id])
        ? (prev[question.id] as string[])
        : [];
      const option = String(value);
      const next = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];

      return { ...prev, [question.id]: next };
    });
  };

  const resetAnswers = () => {
    setAnswers([]);
    setAnswerMap({});
  };

  return {
    answers,
    setAnswers,
    answerMap,
    setAnswerMap,
    submitAnswer,
    updateAnswer,
    resetAnswers,
  };
}
