import type { FC, FormEvent } from "react";
import { useState } from "react";

import { ArrowRight, FileText } from "lucide-react";

import { Button } from "@/kit";

import styles from "./BriefForm.module.scss";

const DEFAULT_BRIEF = `Сделай первый экран лендинга для ИИ-сервиса финансовой аналитики.

Стиль:
- темный
- дорогой
- современный
- крупная типографика
- фиолетово-синие акценты
- карточка продукта справа

Текст:
Заголовок: ИИ-аналитика для финансовых команд
Описание: Получайте инсайты, прогнозы и отчеты быстрее без ручной рутины.
Основная кнопка: Начать бесплатно
Вторая кнопка: Смотреть демо`;

interface BriefFormProps {
  isSubmitting: boolean;
  onSubmit: (brief: string) => void;
}

export const BriefForm: FC<BriefFormProps> = ({ isSubmitting, onSubmit }) => {
  const [brief, setBrief] = useState(DEFAULT_BRIEF);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = brief.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <div className={styles.icon}>
          <FileText size={20} />
        </div>
        <label htmlFor="brief">Бриф</label>
      </div>
      <textarea
        id="brief"
        value={brief}
        onChange={(event) => setBrief(event.target.value)}
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
