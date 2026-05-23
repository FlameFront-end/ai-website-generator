import type { FC, RefObject } from "react";

import clsx from "clsx";

import type { BriefClarificationAnswer } from "@/api/services/runs";

import { formatAnswerValue } from "../../../../lib/brief-wizard";

import styles from "./AnswerHistory.module.scss";

interface AnswerHistoryProps {
  answers: BriefClarificationAnswer[];
  isExpanded: boolean;
  historyListRef: RefObject<HTMLDivElement | null>;
  onToggleExpanded: () => void;
  onEditFrom: (index: number) => void;
}

export const AnswerHistory: FC<AnswerHistoryProps> = ({
  answers,
  isExpanded,
  historyListRef,
  onToggleExpanded,
  onEditFrom,
}) => {
  if (answers.length === 0) return null;

  return (
    <div
      className={clsx(
        styles.answerHistory,
        isExpanded && styles.answerHistoryExpanded,
      )}
    >
      <div className={styles.answerHistoryHeader}>
        <span>Уже учли</span>
        <button type="button" onClick={onToggleExpanded}>
          {isExpanded ? "Свернуть" : "Развернуть"}
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
                    onClick={() => onEditFrom(originalIndex)}
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
  );
};
