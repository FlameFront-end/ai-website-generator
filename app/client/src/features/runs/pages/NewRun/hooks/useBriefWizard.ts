import { useEffect, useRef, useState } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import { useCreateRunMutation } from "@/api/services/runs";
import type {
  BriefClarificationAnswer,
  BriefClarificationQuestion,
  ClarifyBriefResponse,
} from "@/api/services/runs";
import { runsApi } from "@/shared/api/services/runs/runs-api";
import { logger } from "@/lib";
import { ROUTES } from "@/model";

import {
  createBriefDraftId,
  deleteBriefDraft,
  readBriefDraft,
  saveBriefDraft,
  type BriefDraft,
  type DraftAnswerMap,
} from "../../../lib/brief-drafts";
import {
  buildLocalizedBrief,
  getSuggestedAnswer,
  MAX_CLARIFICATION_STEPS,
  normalizeAnswerValue,
} from "../../../lib/brief-wizard";

type AnswerMap = DraftAnswerMap;

export function useBriefWizard(requestedDraftId: string | null) {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const createRunMutation = useCreateRunMutation();

  const [initialDraft] = useState(() =>
    requestedDraftId ? readBriefDraft(requestedDraftId) : null,
  );
  const [draftId] = useState(
    () => initialDraft?.id ?? requestedDraftId ?? createBriefDraftId(),
  );

  const [rawBrief, setRawBrief] = useState(initialDraft?.rawBrief ?? "");
  const [siteLanguage, setSiteLanguage] = useState(
    initialDraft?.siteLanguage ?? "ru",
  );
  const [finalBrief, setFinalBrief] = useState<string | null>(
    initialDraft?.finalBrief ?? null,
  );
  const [projectTitle, setProjectTitle] = useState(initialDraft?.title ?? "");
  const [clarification, setClarification] =
    useState<ClarifyBriefResponse | null>(initialDraft?.clarification ?? null);
  const [answers, setAnswers] = useState<BriefClarificationAnswer[]>(
    initialDraft?.answers ?? [],
  );
  const [answerMap, setAnswerMap] = useState<AnswerMap>(
    initialDraft?.answerMap ?? {},
  );
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(
    initialDraft?.isHistoryExpanded ?? false,
  );
  const [isClarifying, setIsClarifying] = useState(false);
  const historyListRef = useRef<HTMLDivElement | null>(null);

  // ── Draft auto-save (debounced) ──────────────────────────────────

  useEffect(() => {
    const hasDraft =
      rawBrief.trim() ||
      finalBrief?.trim() ||
      clarification ||
      answers.length > 0 ||
      Object.keys(answerMap).length > 0;

    if (!hasDraft) return;

    if (!requestedDraftId) {
      setSearchParams({ draft: draftId }, { replace: true });
    }

    const timer = setTimeout(() => {
      const draft: BriefDraft = {
        id: draftId,
        title: projectTitle.trim() || null,
        rawBrief,
        siteLanguage,
        finalBrief,
        clarification,
        answers,
        answerMap,
        isHistoryExpanded,
        createdAt: initialDraft?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveBriefDraft(draft);
    }, 400);

    return () => clearTimeout(timer);
  }, [
    draftId,
    initialDraft?.createdAt,
    requestedDraftId,
    rawBrief,
    siteLanguage,
    finalBrief,
    projectTitle,
    clarification,
    answers,
    answerMap,
    isHistoryExpanded,
    setSearchParams,
  ]);

  // ── Scroll history ────────────────────────────────────────────────

  useEffect(() => {
    const historyList = historyListRef.current;
    if (!historyList) return;

    requestAnimationFrame(() => {
      historyList.scrollTo({
        top: historyList.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [answers.length, isHistoryExpanded]);

  // ── Clarification API ─────────────────────────────────────────────

  const runClarification = async (
    brief: string,
    nextAnswers: BriefClarificationAnswer[],
  ) => {
    setIsClarifying(true);
    try {
      const result = await runsApi.clarifyBrief({
        brief,
        siteLanguage,
        answers: nextAnswers,
      });
      setClarification(result);
      setAnswerMap({});

      if (result.status === "ready" && result.finalBrief) {
        setFinalBrief(result.finalBrief);
        setProjectTitle(result.projectTitle ?? "");
      }
    } catch (error) {
      logger.error("brief:clarify", error);
      toast.error("Не удалось уточнить бриф");
    } finally {
      setIsClarifying(false);
    }
  };

  const handleInitialBrief = (brief: string) => {
    setRawBrief(brief);
    setFinalBrief(null);
    setProjectTitle("");
    setClarification(null);
    setAnswers([]);
    setAnswerMap({});
    void runClarification(brief, []);
  };

  const submitAnswers = (
    overrideValue?: BriefClarificationAnswer["value"],
    isSkipped = false,
  ) => {
    const question = clarification?.questions[0];
    if (!question) return;

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
        : (overrideValue ??
          normalizeAnswerValue(question, answerMap[question.id])),
      skipped: isSkipped,
    };

    const mergedAnswers = [...answers, nextAnswer];
    setAnswers(mergedAnswers);
    setAnswerMap({});
    setClarification((prev) => (prev ? { ...prev, questions: [] } : prev));
    void runClarification(rawBrief, mergedAnswers);
  };

  const skipCurrentQuestion = () => {
    submitAnswers("skipped", true);
  };

  const editAnswerFrom = (index: number) => {
    const answer = answers[index];
    if (!answer?.type) return;
    const questionType = answer.type;

    const nextAnswers = answers.slice(0, index);
    setAnswers(nextAnswers);
    setAnswerMap({ [answer.questionId]: answer.value });
    setClarification((prev) =>
      prev
        ? {
            ...prev,
            questions: [
              {
                id: answer.questionId,
                type: questionType,
                question: answer.question,
                description: answer.description,
                required: answer.required ?? true,
                options: answer.options,
                placeholder: answer.placeholder,
                suggestedAnswer: answer.suggestedAnswer,
                min: answer.min,
                max: answer.max,
              },
            ],
          }
        : prev,
    );
  };

  const handleCreateRun = (brief: string) => {
    const localizedBrief = buildLocalizedBrief(brief, siteLanguage);
    createRunMutation.mutate(
      { brief: localizedBrief, displayName: projectTitle.trim() || null },
      {
        onSuccess: (run) => {
          deleteBriefDraft(draftId);
          void navigate(ROUTES.runDetails(run.id));
        },
        onError: () => toast.error("Не удалось создать проект"),
      },
    );
  };

  const resetDraft = () => {
    deleteBriefDraft(draftId);
    setSearchParams({}, { replace: true });
    setRawBrief("");
    setSiteLanguage("ru");
    setFinalBrief(null);
    setProjectTitle("");
    setClarification(null);
    setAnswers([]);
    setAnswerMap({});
    setIsHistoryExpanded(false);
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

  const suggestCurrentAnswer = () => {
    if (!currentQuestion) return;
    setAnswerMap((prev) => ({
      ...prev,
      [currentQuestion.id]: getSuggestedAnswer(currentQuestion),
    }));
  };

  // ── Derived state ─────────────────────────────────────────────────

  const currentQuestion = clarification?.questions[0] ?? null;
  const currentQuestionKey = currentQuestion
    ? `${currentQuestion.id}:${currentQuestion.question}`
    : "";
  const currentAnswer = currentQuestion
    ? answerMap[currentQuestion.id]
    : undefined;
  const displayedStep = Math.min(answers.length + 1, MAX_CLARIFICATION_STEPS);
  const estimatedTotalQuestions = Math.min(
    MAX_CLARIFICATION_STEPS,
    Math.max(
      displayedStep,
      clarification?.estimatedTotalQuestions ?? answers.length + 2,
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
    rawBrief,
    siteLanguage,
    setSiteLanguage,
    setRawBrief,
    finalBrief,
    setFinalBrief,
    projectTitle,
    setProjectTitle,
    clarification,
    answers,
    answerMap,
    isHistoryExpanded,
    setIsHistoryExpanded,
    isClarifying,
    historyListRef,
    isCreating: createRunMutation.isPending,

    handleInitialBrief,
    submitAnswers,
    skipCurrentQuestion,
    editAnswerFrom,
    handleCreateRun,
    resetDraft,
    updateAnswer,
    suggestCurrentAnswer,

    currentQuestion,
    currentQuestionKey,
    canSubmitAnswers,
    displayedStep,
    estimatedTotalQuestions,
    progressPercent,
  };
}
