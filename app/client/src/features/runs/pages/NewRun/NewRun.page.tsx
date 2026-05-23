import { useNavigate, useSearchParams } from "react-router-dom";

import { BriefForm } from "@/features/runs/components/BriefForm/BriefForm";
import { Button } from "@/kit";
import { ROUTES } from "@/model";

import { getProgressLabel } from "../../lib/brief-wizard";

import {
  AnswerHistory,
  FinalBriefSection,
  QuestionRenderer,
} from "./components";
import { useBriefWizard } from "./hooks/useBriefWizard";
import sharedStyles from "./components/wizard-shared.module.scss";
import styles from "./NewRun.module.scss";

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
  const w = useBriefWizard(requestedDraftId);

  const progressLabel = getProgressLabel(w.answers.length);

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <button type="button" onClick={() => navigate(ROUTES.RUNS)}>
          Назад к проектам
        </button>
      </div>

      {!w.clarification && !w.finalBrief && (
        <BriefForm
          brief={w.rawBrief}
          siteLanguage={w.siteLanguage}
          isSubmitting={w.isClarifying}
          onLanguageChange={w.setSiteLanguage}
          onDraftChange={w.setRawBrief}
          onSubmit={w.handleInitialBrief}
        />
      )}

      {w.clarification?.status === "needs_clarification" && (
        <div className={sharedStyles.wizard}>
          <div className={styles.wizardHero}>
            <div>
              <p className={sharedStyles.eyebrow}>Подготовка брифа</p>
              <h1>Уточним детали проекта</h1>
            </div>
            <span className={styles.stepBadge}>
              Шаг {w.displayedStep} из ~{w.estimatedTotalQuestions}
            </span>
          </div>

          <div className={styles.intro}>
            <p>{progressLabel}</p>
            <div className={styles.progressTrack}>
              <span style={{ width: `${w.progressPercent}%` }} />
            </div>
          </div>

          <AnswerHistory
            answers={w.answers}
            isExpanded={w.isHistoryExpanded}
            historyListRef={w.historyListRef}
            onToggleExpanded={() => w.setIsHistoryExpanded((v) => !v)}
            onEditFrom={w.editAnswerFrom}
          />

          {w.isClarifying && !w.currentQuestion && (
            <div className={styles.questionCard}>
              <div>
                <h3>Подбираем следующий вопрос...</h3>
                <p>Сверяем ваш ответ с уже собранным контекстом.</p>
              </div>
            </div>
          )}

          {w.currentQuestion && (
            <div className={styles.questions}>
              <div key={w.currentQuestionKey} className={styles.questionCard}>
                <div>
                  <h3>{w.currentQuestion.question}</h3>
                  {w.currentQuestion.description && (
                    <p>{w.currentQuestion.description}</p>
                  )}
                </div>
                <QuestionRenderer
                  question={w.currentQuestion}
                  answerMap={w.answerMap}
                  onUpdate={w.updateAnswer}
                />
              </div>
            </div>
          )}

          {w.currentQuestion && (
            <div className={sharedStyles.actions}>
              <Button
                type="button"
                variant="secondary"
                onClick={w.suggestCurrentAnswer}
              >
                Предложить за меня
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={w.skipCurrentQuestion}
                disabled={w.isClarifying}
              >
                Пропустить вопрос
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={w.isClarifying}
                disabled={!w.canSubmitAnswers}
                onClick={() => w.submitAnswers()}
              >
                Продолжить
              </Button>
            </div>
          )}

          {w.clarification.understoodSummary && (
            <div className={styles.understoodSummary}>
              <span>Что уже понятно</span>
              <p>{w.clarification.understoodSummary}</p>
            </div>
          )}
        </div>
      )}

      {w.finalBrief && (
        <FinalBriefSection
          finalBrief={w.finalBrief}
          projectTitle={w.projectTitle}
          isCreating={w.isCreating}
          onFinalBriefChange={w.setFinalBrief}
          onProjectTitleChange={w.setProjectTitle}
          onReset={w.resetDraft}
          onCreateRun={w.handleCreateRun}
        />
      )}
    </section>
  );
}
