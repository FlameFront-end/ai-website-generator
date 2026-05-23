import type { FC } from "react";

import type { BriefClarificationQuestion } from "@/api/services/runs";

import type { DraftAnswerMap } from "../../../../lib/brief-drafts";

import sharedStyles from "../wizard-shared.module.scss";
import styles from "./QuestionRenderer.module.scss";

interface QuestionRendererProps {
  question: BriefClarificationQuestion;
  answerMap: DraftAnswerMap;
  onUpdate: (
    question: BriefClarificationQuestion,
    value: string | number | boolean,
  ) => void;
}

export const QuestionRenderer: FC<QuestionRendererProps> = ({
  question,
  answerMap,
  onUpdate,
}) => {
  const value = answerMap[question.id];

  if (question.type === "single_choice") {
    return (
      <div className={styles.options}>
        {question.options?.map((option) => (
          <button
            key={option}
            type="button"
            className={value === option ? styles.selectedOption : ""}
            onClick={() => onUpdate(question, option)}
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
            onClick={() => onUpdate(question, option)}
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
          onClick={() => onUpdate(question, true)}
        >
          Да
        </button>
        <button
          type="button"
          className={value === false ? styles.selectedOption : ""}
          onClick={() => onUpdate(question, false)}
        >
          Нет
        </button>
      </div>
    );
  }

  if (question.type === "scale") {
    return (
      <input
        className={sharedStyles.input}
        type="number"
        min={question.min ?? 1}
        max={question.max ?? 5}
        value={String(value ?? question.min ?? 1)}
        onChange={(event) => onUpdate(question, Number(event.target.value))}
      />
    );
  }

  return (
    <textarea
      className={sharedStyles.answerTextarea}
      value={String(value ?? "")}
      placeholder={question.placeholder ?? "Введите ответ..."}
      onChange={(event) => onUpdate(question, event.target.value)}
    />
  );
};
