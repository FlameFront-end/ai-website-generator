import { type FormEvent, useState } from 'react'

import styles from './BriefForm.module.scss'

const DEFAULT_BRIEF = `Сделай первый экран лендинга для AI-сервиса финансовой аналитики.

Стиль:
- темный
- дорогой
- современный
- крупная типографика
- фиолетово-синие акценты
- карточка продукта справа

Текст:
Заголовок: AI-аналитика для финансовых команд
Описание: Получайте инсайты, прогнозы и отчеты быстрее без ручной рутины.
Основная кнопка: Начать бесплатно
Вторая кнопка: Смотреть демо`

interface BriefFormProps {
  isSubmitting: boolean
  onSubmit: (brief: string) => void
}

export function BriefForm({ isSubmitting, onSubmit }: BriefFormProps) {
  const [brief, setBrief] = useState(DEFAULT_BRIEF)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedBrief = brief.trim()

    if (trimmedBrief) {
      onSubmit(trimmedBrief)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label htmlFor="brief">Brief</label>
      <textarea id="brief" value={brief} onChange={event => setBrief(event.target.value)} />
      <button type="submit" disabled={isSubmitting || !brief.trim()}>
        {isSubmitting ? 'Creating...' : 'Generate'}
      </button>
    </form>
  )
}
