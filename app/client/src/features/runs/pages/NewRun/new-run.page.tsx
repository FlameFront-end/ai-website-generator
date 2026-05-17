import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import { useCreateRunMutation } from "@/api/services/runs";
import type {
  BriefClarificationAnswer,
  BriefClarificationQuestion,
  ClarifyBriefResponse,
} from "@/api/services/runs";
import { runsApi } from "@/shared/api/services/runs/runs.api";
import { BriefForm } from "@/features/runs/components/BriefForm";
import { Button } from "@/kit";
import { ROUTES } from "@/model";

import {
  createBriefDraftId,
  deleteBriefDraft,
  readBriefDraft,
  saveBriefDraft,
  type BriefDraft,
  type DraftAnswerMap,
} from "../../lib/brief-drafts";

import styles from "./new-run.module.scss";

type AnswerMap = DraftAnswerMap;
const MAX_CLARIFICATION_STEPS = 5;

function normalizeAnswerValue(
  question: BriefClarificationQuestion,
  value: unknown,
) {
  if (question.type === "scale") return Number(value || question.min || 1);
  if (question.type === "yes_no") return Boolean(value);
  if (question.type === "multi_choice")
    return Array.isArray(value) ? value : [];
  return String(value ?? "");
}

function getProgressLabel(answerCount: number) {
  if (answerCount === 0) return "Собираем основу";
  if (answerCount <= 2) return "Уточняем направление";
  if (answerCount < MAX_CLARIFICATION_STEPS) return "Финализируем детали";
  return "Готовим финальный бриф";
}

function formatAnswerValue(value: BriefClarificationAnswer["value"]) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  return String(value);
}

function getSuggestedAnswer(question: BriefClarificationQuestion) {
  if (question.suggestedAnswer !== undefined) return question.suggestedAnswer;
  if (question.type === "yes_no") return true;
  if (question.type === "scale") return Math.ceil((question.max ?? 5) / 2);
  if (question.type === "multi_choice")
    return question.options?.slice(0, 2) ?? [];
  if (question.type === "single_choice") return question.options?.[0] ?? "";
  return "";
}

export default function NewRunPage() {
  const [searchParams] = useSearchParams();
  const requestedDraftId = searchParams.get("draft");

  return (
    <NewRunDraftPage
      key={requestedDraftId ?? "new"}
      draftId={requestedDraftId}
    />
  );
}

function NewRunDraftPage({
  draftId: requestedDraftId,
}: {
  draftId: string | null;
}) {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const createRunMutation = useCreateRunMutation();
  const [initialDraft] = useState(() => {
    return requestedDraftId ? readBriefDraft(requestedDraftId) : null;
  });
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

  useEffect(() => {
    const hasDraft =
      rawBrief.trim() ||
      finalBrief?.trim() ||
      clarification ||
      answers.length > 0 ||
      Object.keys(answerMap).length > 0;

    if (!hasDraft) {
      return;
    }

    if (!requestedDraftId) {
      setSearchParams({ draft: draftId }, { replace: true });
    }

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
      console.error("Failed to clarify brief:", error);
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
          navigate(ROUTES.runDetails(run.id));
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

  const renderQuestion = (question: BriefClarificationQuestion) => {
    const value = answerMap[question.id];

    if (question.type === "single_choice") {
      return (
        <div className={styles.options}>
          {question.options?.map((option) => (
            <button
              key={option}
              type="button"
              className={value === option ? styles.selectedOption : ""}
              onClick={() => updateAnswer(question, option)}
            >
              {option}
            </button>
          ))}
        </div>
      );
    }

    if (question.type === "multi_choice") {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className={styles.options}>
          {question.options?.map((option) => (
            <button
              key={option}
              type="button"
              className={selected.includes(option) ? styles.selectedOption : ""}
              onClick={() => updateAnswer(question, option)}
            >
              {option}
            </button>
          ))}
        </div>
      );
    }

    if (question.type === "yes_no") {
      return (
        <div className={styles.options}>
          <button
            type="button"
            className={value === true ? styles.selectedOption : ""}
            onClick={() => updateAnswer(question, true)}
          >
            Да
          </button>
          <button
            type="button"
            className={value === false ? styles.selectedOption : ""}
            onClick={() => updateAnswer(question, false)}
          >
            Нет
          </button>
        </div>
      );
    }

    if (question.type === "scale") {
      return (
        <input
          className={styles.input}
          type="number"
          min={question.min ?? 1}
          max={question.max ?? 5}
          value={String(value ?? question.min ?? 1)}
          onChange={(event) =>
            updateAnswer(question, Number(event.target.value))
          }
        />
      );
    }

    return (
      <textarea
        className={styles.answerTextarea}
        value={String(value ?? "")}
        placeholder={question.placeholder ?? "Введите ответ..."}
        onChange={(event) => updateAnswer(question, event.target.value)}
      />
    );
  };

  const currentQuestion = clarification?.questions[0] ?? null;
  const currentQuestionKey = currentQuestion
    ? `${currentQuestion.id}:${currentQuestion.question}`
    : "";
  const currentAnswer = currentQuestion
    ? answerMap[currentQuestion.id]
    : undefined;
  const progressLabel = getProgressLabel(answers.length);
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

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <button type="button" onClick={() => navigate(ROUTES.RUNS)}>
          Назад к проектам
        </button>
      </div>

      {!clarification && !finalBrief && (
        <BriefForm
          brief={rawBrief}
          siteLanguage={siteLanguage}
          isSubmitting={isClarifying}
          onLanguageChange={setSiteLanguage}
          onDraftChange={setRawBrief}
          onSubmit={handleInitialBrief}
        />
      )}

      {clarification?.status === "needs_clarification" && (
        <div className={styles.wizard}>
          <div className={styles.wizardHero}>
            <div>
              <p className={styles.eyebrow}>Подготовка брифа</p>
              <h1>Уточним детали проекта</h1>
            </div>
            <span className={styles.stepBadge}>
              Шаг {displayedStep} из ~{estimatedTotalQuestions}
            </span>
          </div>

          <div className={styles.intro}>
            <p>{progressLabel}</p>
            <div className={styles.progressTrack}>
              <span
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>
          </div>

          {answers.length > 0 && (
            <div
              className={`${styles.answerHistory} ${
                isHistoryExpanded ? styles.answerHistoryExpanded : ""
              }`}
            >
              <div className={styles.answerHistoryHeader}>
                <span>Уже учли</span>
                <button
                  type="button"
                  onClick={() => setIsHistoryExpanded((value) => !value)}
                >
                  {isHistoryExpanded ? "Свернуть" : "Развернуть"}
                </button>
              </div>
              <div ref={historyListRef} className={styles.answerHistoryList}>
                {answers
                  .filter((answer) => !answer.skipped)
                  .map((answer, index) => {
                    const originalIndex = answers.indexOf(answer);
                    return (
                      <div key={`${answer.questionId}:${index}`}>
                        <div className={styles.answerHistoryItemHeader}>
                          <b>{answer.question}</b>
                          <button
                            type="button"
                            onClick={() => editAnswerFrom(originalIndex)}
                          >
                            Изменить
                          </button>
                        </div>
                        <p>{formatAnswerValue(answer.value)}</p>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {isClarifying && !currentQuestion && (
            <div className={styles.questionCard}>
              <div>
                <h3>Подбираем следующий вопрос...</h3>
                <p>Сверяем ваш ответ с уже собранным контекстом.</p>
              </div>
            </div>
          )}

          {currentQuestion && (
            <div className={styles.questions}>
              <div key={currentQuestionKey} className={styles.questionCard}>
                <div>
                  <h3>{currentQuestion.question}</h3>
                  {currentQuestion.description && (
                    <p>{currentQuestion.description}</p>
                  )}
                </div>
                {renderQuestion(currentQuestion)}
              </div>
            </div>
          )}

          {currentQuestion && (
            <div className={styles.actions}>
              <Button
                type="button"
                variant="secondary"
                onClick={suggestCurrentAnswer}
              >
                Предложить за меня
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={skipCurrentQuestion}
                disabled={isClarifying}
              >
                Пропустить вопрос
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={isClarifying}
                disabled={!canSubmitAnswers}
                onClick={() => submitAnswers()}
              >
                Продолжить
              </Button>
            </div>
          )}

          {clarification.understoodSummary && (
            <div className={styles.understoodSummary}>
              <span>Что уже понятно</span>
              <p>{clarification.understoodSummary}</p>
            </div>
          )}
        </div>
      )}

      {finalBrief && (
        <div className={styles.wizard}>
          <div>
            <p className={styles.eyebrow}>Финальный бриф</p>
            <h1>{projectTitle || "Теперь данных достаточно"}</h1>
            <p>Проверьте улучшенный бриф и запускайте генерацию проекта.</p>
          </div>
          <input
            className={styles.input}
            value={projectTitle}
            onChange={(event) => setProjectTitle(event.target.value)}
            placeholder="Короткое название проекта"
          />
          <textarea
            className={styles.finalBrief}
            value={finalBrief}
            onChange={(event) => setFinalBrief(event.target.value)}
          />
          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={resetDraft}>
              Вернуться к началу
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={createRunMutation.isPending}
              disabled={!finalBrief.trim()}
              onClick={() => handleCreateRun(finalBrief)}
            >
              Запустить генерацию
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function buildLocalizedBrief(brief: string, siteLanguage: string) {
  const languageName = siteLanguage === "en" ? "English" : "Russian";

  return [
    `Target site language: ${languageName}`,
    `Generate all user-facing website copy, style option names, style option descriptions, design labels, metadata, and UI labels in ${languageName}.`,
    "Keep internal technical instructions in English.",
    "",
    brief.trim(),
  ].join("\n");
}
