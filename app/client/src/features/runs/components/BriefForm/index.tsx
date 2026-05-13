import type { FC, FormEvent, KeyboardEvent } from "react";

import { ArrowRight } from "lucide-react";

import { Button } from "@/kit";

import styles from "./BriefForm.module.scss";

interface BriefFormProps {
  brief: string;
  siteLanguage: string;
  isSubmitting: boolean;
  onLanguageChange: (language: string) => void;
  onDraftChange: (brief: string) => void;
  onSubmit: (brief: string) => void;
}

export const BriefForm: FC<BriefFormProps> = ({
  brief,
  siteLanguage,
  isSubmitting,
  onLanguageChange,
  onDraftChange,
  onSubmit,
}) => {
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
      <div className={styles.languageSelector}>
        <span>Язык сайта и вопросов</span>
        <div>
          <button
            type="button"
            className={siteLanguage === "ru" ? styles.selectedLanguage : ""}
            onClick={() => onLanguageChange("ru")}
          >
            Русский
          </button>
          <button
            type="button"
            className={siteLanguage === "en" ? styles.selectedLanguage : ""}
            onClick={() => onLanguageChange("en")}
          >
            English
          </button>
        </div>
      </div>      <textarea
        id="brief"
        value={brief}
        onChange={(event) => onDraftChange(event.target.value)}
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

