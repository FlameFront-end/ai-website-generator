import type { FC } from "react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  useArtifactFileUrl,
  useEditReferenceBlockMutation,
} from "@/api/services/runs";
import type { RunArtifact } from "@/api/services/runs";

import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useReferenceRegionSelection } from "../hooks/useReferenceRegionSelection";
import { parseBlockMeta } from "../lib/reference-block-meta";
import refStyles from "../ReferenceTab.module.scss";
import { ReferenceEditControls } from "./ReferenceEditControls";
import { ReferenceEditPreview } from "./ReferenceEditPreview";

export interface EditingReferenceBlock {
  artifact: RunArtifact;
  index: number;
}

interface ReferenceEditModalProps {
  runId: string;
  editing: EditingReferenceBlock;
  onClose: () => void;
}

export const ReferenceEditModal: FC<ReferenceEditModalProps> = ({
  runId,
  editing,
  onClose,
}) => {
  const fileQuery = useArtifactFileUrl(runId, editing.artifact.id);
  const editReferenceBlockMutation = useEditReferenceBlockMutation();
  const meta = parseBlockMeta(editing.artifact.path, editing.index);
  const imageAlt = `Блок ${editing.index + 1} — ${meta.sectionId}`;
  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const [instruction, setInstruction] = useState("");
  const [isImageReady, setIsImageReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmitting = editReferenceBlockMutation.isPending;

  useBodyScrollLock();
  const {
    activeBox,
    hasSelectedRegion,
    selection,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    resetSelection,
  } = useReferenceRegionSelection(imageWrapRef, isImageReady, () =>
    setError(null),
  );

  const handleResetSelection = () => {
    resetSelection();
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selection || !instruction.trim()) return;
    if (selection.bbox.width < 0.01 || selection.bbox.height < 0.01) {
      setError("Выделите область побольше.");
      return;
    }

    setError(null);
    try {
      await editReferenceBlockMutation.mutateAsync({
        runId,
        payload: {
          artifactId: editing.artifact.id,
          bbox: selection.bbox,
          instruction: instruction.trim(),
        },
      });
      await fileQuery.refetch({ cancelRefetch: false });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось изменить блок.");
    }
  };

  return createPortal(
    <div className={refStyles.modalBackdrop} role="presentation">
      <section className={refStyles.editModal} aria-modal="true" role="dialog">
        <header className={refStyles.modalHeader}>
          <div>
            <span className={refStyles.modalEyebrow}>Точечная правка</span>
            <h3>Выберите место и опишите изменение</h3>
            <p>
              Блок {editing.index + 1}
              {meta.sectionType ? ` — ${meta.sectionType}` : ""}
            </p>
          </div>
          <button
            type="button"
            className={refStyles.modalClose}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <div className={refStyles.modalBody}>
          <ReferenceEditPreview
            activeBox={activeBox}
            alt={imageAlt}
            hasError={fileQuery.isError}
            hasSelectedRegion={hasSelectedRegion}
            imageUrl={fileQuery.url}
            imageWrapRef={imageWrapRef}
            isImageReady={isImageReady}
            onImageError={() => setIsImageReady(false)}
            onImageLoad={() => setIsImageReady(true)}
            onImageLoadStart={() => {
              setIsImageReady(false);
              resetSelection();
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
          <ReferenceEditControls
            error={error}
            hasSelectedRegion={hasSelectedRegion}
            hasSelection={Boolean(selection)}
            instruction={instruction}
            isSubmitting={isSubmitting}
            onCancel={onClose}
            onInstructionChange={setInstruction}
            onResetSelection={handleResetSelection}
            onSubmit={handleSubmit}
          />
        </div>
      </section>
    </div>,
    document.body,
  );
};
