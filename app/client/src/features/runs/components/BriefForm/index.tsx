import type { FC, FormEvent, KeyboardEvent } from "react";
import { useState } from "react";

import { ArrowRight } from "lucide-react";

import { Button } from "@/kit";

import styles from "./BriefForm.module.scss";

interface BriefFormProps {
  isSubmitting: boolean;
  onSubmit: (brief: string) => void;
}

export const BriefForm: FC<BriefFormProps> = ({ isSubmitting, onSubmit }) => {
  const [brief, setBrief] = useState("");

  const submitBrief = () => {
    const trimmed = brief.trim();
    if (trimmed) onSubmit(trimmed);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitBrief();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      submitBrief();
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <div>
          <label htmlFor="brief">Опишите идею сайта</label>
          <p>
            Чем подробнее бриф, тем точнее будет структура, визуальный стиль и
            итоговый код. Если чего-то не хватит, мы зададим уточняющие вопросы.
          </p>
        </div>
      </div>
      <div className={styles.tips}>
        <span>Ниша и аудитория</span>
        <span>Стиль и настроение</span>
        <span>Тексты и кнопки</span>
      </div>
      <textarea
        id="brief"
        value={brief}
        onChange={(event) => setBrief(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Опишите, что хотите сгенерировать..."
      />
      <div className={styles.actions}>
        <span className={styles.hint}>
          Нажмите Ctrl+Enter для быстрой отправки
        </span>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={!brief.trim()}
          rightIcon={<ArrowRight size={18} />}
        >
          {isSubmitting ? "Создаем..." : "Сгенерировать"}
        </Button>
      </div>
    </form>
  );
};
