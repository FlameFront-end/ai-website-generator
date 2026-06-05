import type { FC } from "react";

import refStyles from "../ReferenceTab.module.scss";

interface ReferenceEditControlsProps {
  error: string | null;
  hasSelectedRegion: boolean;
  hasSelection: boolean;
  instruction: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onInstructionChange: (instruction: string) => void;
  onResetSelection: () => void;
  onSubmit: () => void;
}

export const ReferenceEditControls: FC<ReferenceEditControlsProps> = ({
  error,
  hasSelectedRegion,
  hasSelection,
  instruction,
  isSubmitting,
  onCancel,
  onInstructionChange,
  onResetSelection,
  onSubmit,
}) => (
  <aside className={refStyles.modalControls}>
    <div className={refStyles.editPanelHeader}>
      <strong>Что нужно сделать?</strong>
      <span>
        Сначала выделите нужный фрагмент на картинке, затем напишите короткое
        описание правки.
      </span>
    </div>
    <div className={refStyles.selectionStatus}>
      {hasSelectedRegion ? "Фрагмент выбран" : "Выделите область на изображении"}
    </div>
    <label className={refStyles.promptLabel} htmlFor="reference-edit">
      Описание изменения
    </label>
    <textarea
      id="reference-edit"
      value={instruction}
      onChange={(event) => onInstructionChange(event.target.value)}
      placeholder="Например: заменить текст на «Start now» и сделать кнопку заметнее"
      rows={7}
    />
    {error && <p className={refStyles.editError}>{error}</p>}
    <div className={refStyles.editButtons}>
      <button
        type="button"
        className={refStyles.secondaryButton}
        onClick={onResetSelection}
        disabled={!hasSelection || isSubmitting}
      >
        Выбрать заново
      </button>
      <button
        type="button"
        className={refStyles.secondaryButton}
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Отмена
      </button>
      <button
        type="button"
        className={refStyles.primaryButton}
        onClick={onSubmit}
        disabled={!hasSelectedRegion || !instruction.trim() || isSubmitting}
      >
        {isSubmitting ? "Сохраняем…" : "Обновить фрагмент"}
      </button>
    </div>
  </aside>
);
