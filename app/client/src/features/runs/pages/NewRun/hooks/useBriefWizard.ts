import { useRef, useState } from "react";

import type { BriefClarificationAnswer, ClarifyBriefResponse } from "@/api/services/runs";

import { getSuggestedAnswer } from "../../../lib/brief-wizard";
import { useAnswerHistoryScroll } from "./useAnswerHistoryScroll";
import { useBriefAnswerState } from "./useBriefAnswerState";
import { useBriefDraftSession } from "./useBriefDraftSession";
import { useBriefDraftAutosave } from "./useBriefDraftAutosave";
import { useBriefWizardProgress } from "./useBriefWizardProgress";
import { useClarificationFlow } from "./useClarificationFlow";
import { useCreateRunFromBrief } from "./useCreateRunFromBrief";

export function useBriefWizard(requestedDraftId: string | null) {
  const {
    deleteCurrentDraft,
    draftId,
    initialDraft,
    persistDraftSearchParam,
  } = useBriefDraftSession(requestedDraftId);

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
  const answerState = useBriefAnswerState({
    initialAnswers: initialDraft?.answers ?? [],
    initialAnswerMap: initialDraft?.answerMap ?? {},
  });
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(
    initialDraft?.isHistoryExpanded ?? false,
  );
  const historyListRef = useRef<HTMLDivElement | null>(null);
  const clarificationFlow = useClarificationFlow();
  const createRunFromBrief = useCreateRunFromBrief({
    draftId,
    projectTitle,
    siteLanguage,
  });

  useBriefDraftAutosave({
    draftId,
    initialCreatedAt: initialDraft?.createdAt,
    rawBrief,
    siteLanguage,
    finalBrief,
    projectTitle,
    clarification,
    answers: answerState.answers,
    answerMap: answerState.answerMap,
    isHistoryExpanded,
    onDraftCreated: persistDraftSearchParam,
  });

  useAnswerHistoryScroll(
    historyListRef,
    answerState.answers.length,
    isHistoryExpanded,
  );

  const applyClarification = (result: ClarifyBriefResponse) => {
    setClarification(result);
    answerState.setAnswerMap({});

    if (result.status === "ready" && result.finalBrief) {
      setFinalBrief(result.finalBrief);
      setProjectTitle(result.projectTitle ?? "");
    }
  };

  const requestClarification = async (
    brief: string,
    nextAnswers: BriefClarificationAnswer[],
  ) => {
    const result = await clarificationFlow.runClarification({
      brief,
      siteLanguage,
      answers: nextAnswers,
    });
    if (result) applyClarification(result);
  };

  const handleInitialBrief = (brief: string) => {
    setRawBrief(brief);
    setFinalBrief(null);
    setProjectTitle("");
    setClarification(null);
    answerState.resetAnswers();
    void requestClarification(brief, []);
  };

  const updateDraftBrief = (brief: string) => {
    setRawBrief(brief);
  };

  const updateSiteLanguage = (language: string) => {
    setSiteLanguage(language);
  };

  const updateFinalBrief = (brief: string) => {
    setFinalBrief(brief);
  };

  const updateProjectTitle = (title: string) => {
    setProjectTitle(title);
  };

  const toggleHistory = () => {
    setIsHistoryExpanded((current) => !current);
  };

  const submitAnswers = (
    overrideValue?: BriefClarificationAnswer["value"],
    isSkipped = false,
  ) => {
    const question = clarification?.questions[0];
    if (!question) return;

    const mergedAnswers = answerState.submitAnswer({
      question,
      overrideValue,
      isSkipped,
    });
    setClarification((prev) => (prev ? { ...prev, questions: [] } : prev));
    void requestClarification(rawBrief, mergedAnswers);
  };

  const skipCurrentQuestion = () => {
    submitAnswers("skipped", true);
  };

  const editAnswerFrom = (index: number) => {
    const answer = answerState.answers[index];
    if (!answer?.type) return;
    const questionType = answer.type;

    const nextAnswers = answerState.answers.slice(0, index);
    answerState.setAnswers(nextAnswers);
    answerState.setAnswerMap({ [answer.questionId]: answer.value });
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
    createRunFromBrief.createRun(brief);
  };

  const resetDraft = () => {
    deleteCurrentDraft();
    setRawBrief("");
    setSiteLanguage("ru");
    setFinalBrief(null);
    setProjectTitle("");
    setClarification(null);
    answerState.resetAnswers();
    setIsHistoryExpanded(false);
  };

  const progress = useBriefWizardProgress({
    answersCount: answerState.answers.length,
    answerMap: answerState.answerMap,
    clarification,
  });

  const suggestCurrentAnswer = () => {
    if (!progress.currentQuestion) return;
    answerState.setAnswerMap({
      ...answerState.answerMap,
      [progress.currentQuestion.id]: getSuggestedAnswer(progress.currentQuestion),
    });
  };

  return {
    rawBrief,
    siteLanguage,
    finalBrief,
    projectTitle,
    clarification,
    answers: answerState.answers,
    answerMap: answerState.answerMap,
    isHistoryExpanded,
    isClarifying: clarificationFlow.isClarifying,
    historyListRef,
    isCreating: createRunFromBrief.isCreating,

    handleInitialBrief,
    updateDraftBrief,
    updateSiteLanguage,
    updateFinalBrief,
    updateProjectTitle,
    toggleHistory,
    submitAnswers,
    skipCurrentQuestion,
    editAnswerFrom,
    handleCreateRun,
    resetDraft,
    updateAnswer: answerState.updateAnswer,
    suggestCurrentAnswer,

    currentQuestion: progress.currentQuestion,
    currentQuestionKey: progress.currentQuestionKey,
    canSubmitAnswers: progress.canSubmitAnswers,
    displayedStep: progress.displayedStep,
    estimatedTotalQuestions: progress.estimatedTotalQuestions,
    progressPercent: progress.progressPercent,
  };
}
