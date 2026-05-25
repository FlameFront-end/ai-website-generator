/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */
import type { FC, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { runsApi, useArtifactFileUrl } from "@/api/services/runs";
import type { ReferenceBlockBbox, RunArtifact } from "@/api/services/runs";
import { ImageViewerGallery } from "@/kit";
import { pluralize } from "@/lib/pluralize";

import shared from "../../lib/run-details-shared.module.scss";
import refStyles from "./ReferenceTab.module.scss";

const PLACEHOLDER_BLOCKS_WHEN_EMPTY = 3;

const SkeletonBlock: FC<{ index: number; pending?: boolean }> = ({
  index,
  pending,
}) => (
  <figure
    className={refStyles.block}
    aria-label={`Блок ${index + 1} (генерация)`}
  >
    <header className={refStyles.skeletonHeader}>
      <div className={refStyles.skeletonTitle}>
        <span className={refStyles.skeletonPill} />
        <span className={refStyles.skeletonType} />
      </div>
      <span className={refStyles.skeletonFile} />
    </header>
    <div className={refStyles.skeletonImage}>
      {pending && (
        <span className={refStyles.skeletonCaption}>
          <span className={refStyles.spinner} aria-hidden />
          Генерация блока {index + 1}…
        </span>
      )}
    </div>
  </figure>
);

interface ReferenceTabProps {
  runId: string;
  artifact: RunArtifact | undefined;
  blocks: RunArtifact[];
}

interface ReferenceBlockProps {
  runId: string;
  artifact: RunArtifact;
  index: number;
  onClick?: (src: string) => void;
  onEdit?: (artifact: RunArtifact, index: number) => void;
}

interface EditingReferenceBlock {
  artifact: RunArtifact;
  index: number;
}

interface RegionSelection {
  startX: number;
  startY: number;
  bbox: ReferenceBlockBbox;
}

/**
 * Parse the section info from the file path.
 * Files are written as `${index}-${slugifiedSectionId}.${ext}`,
 * e.g. `01-01-hero.png` for the hero section.
 */
function parseBlockMeta(
  path: string,
  index: number,
): {
  fileName: string;
  sectionId: string;
  sectionType: string;
} {
  const fileName = path.split("/").pop() ?? `block-${index + 1}.png`;
  const stem = fileName.replace(/\.[^.]+$/, "");
  // strip leading order prefix `01-` once
  const withoutOrder = stem.replace(/^\d+-/, "");
  // section.id is typically `01-hero`, `02-about` — use the trailing word as type
  const typeMatch = withoutOrder.match(/[a-zа-яё]+$/i);
  return {
    fileName,
    sectionId: withoutOrder || `section-${index + 1}`,
    sectionType: typeMatch?.[0] ?? "",
  };
}

const ReferenceBlock: FC<ReferenceBlockProps> = ({
  runId,
  artifact,
  index,
  onClick,
  onEdit,
}) => {
  const fileQuery = useArtifactFileUrl(runId, artifact.id);
  const meta = parseBlockMeta(artifact.path, index);

  return (
    <figure className={refStyles.block}>
      <header className={refStyles.blockHeader}>
        <div className={refStyles.blockTitle}>
          <span className={refStyles.blockIndex}>
            {String(index + 1).padStart(2, "0")}
          </span>
          {meta.sectionType && (
            <span className={refStyles.blockType}>{meta.sectionType}</span>
          )}
        </div>
        <div className={refStyles.blockHeaderActions}>
          <span className={refStyles.blockMeta}>{meta.fileName}</span>
          <button
            type="button"
            className={refStyles.blockEditButton}
            onClick={() => onEdit?.(artifact, index)}
            title="Изменить фрагмент"
            aria-label={`Изменить фрагмент блока ${index + 1}`}
          >
            ✦
          </button>
        </div>
      </header>

      <div className={refStyles.imageWrap}>
        {fileQuery.isError ? (
          <div className={refStyles.blockError}>
            Не удалось загрузить блок {index + 1}
          </div>
        ) : fileQuery.url ? (
          <img
            className={refStyles.blockImage}
            src={fileQuery.url}
            alt={`Блок ${index + 1} — ${meta.sectionId}`}
            onClick={() => onClick?.(fileQuery.url || "")}
            draggable={false}
            style={{ cursor: "pointer" }}
          />
        ) : null}
      </div>
    </figure>
  );
};

interface ReferenceEditModalProps {
  runId: string;
  editing: EditingReferenceBlock;
  onClose: () => void;
}

const ReferenceEditModal: FC<ReferenceEditModalProps> = ({
  runId,
  editing,
  onClose,
}) => {
  const fileQuery = useArtifactFileUrl(runId, editing.artifact.id);
  const meta = parseBlockMeta(editing.artifact.path, editing.index);
  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const [selection, setSelection] = useState<RegionSelection | null>(null);
  const [instruction, setInstruction] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isImageReady, setIsImageReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const getNormalizedPoint = (event: MouseEvent<HTMLDivElement>) => {
    const rect = imageWrapRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (!isImageReady) return;
    const point = getNormalizedPoint(event);
    if (!point) return;
    setIsDragging(true);
    setError(null);
    setSelection({
      startX: point.x,
      startY: point.y,
      bbox: { x: point.x, y: point.y, width: 0, height: 0 },
    });
  };

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !selection) return;
    const point = getNormalizedPoint(event);
    if (!point) return;
    const x = Math.min(selection.startX, point.x);
    const y = Math.min(selection.startY, point.y);
    const width = Math.abs(point.x - selection.startX);
    const height = Math.abs(point.y - selection.startY);
    setSelection({ ...selection, bbox: { x, y, width, height } });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetSelection = () => {
    setSelection(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selection || !instruction.trim()) return;
    if (selection.bbox.width < 0.01 || selection.bbox.height < 0.01) {
      setError("Выделите область побольше.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await runsApi.editReferenceBlock(runId, {
        artifactId: editing.artifact.id,
        bbox: selection.bbox,
        instruction: instruction.trim(),
      });
      await fileQuery.refetch({ cancelRefetch: false });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось изменить блок.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeBox = selection?.bbox;
  const hasSelectedRegion = Boolean(
    isImageReady &&
    activeBox &&
    activeBox.width >= 0.01 &&
    activeBox.height >= 0.01,
  );

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
          <div className={refStyles.modalPreviewColumn}>
            <div
              ref={imageWrapRef}
              className={refStyles.modalImageWrap}
              role="presentation"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {fileQuery.isError ? (
                <div className={refStyles.blockError}>
                  Не удалось загрузить изображение
                </div>
              ) : fileQuery.url ? (
                <img
                  key={fileQuery.url}
                  src={fileQuery.url}
                  alt={`Блок ${editing.index + 1} — ${meta.sectionId}`}
                  draggable={false}
                  className={isImageReady ? undefined : refStyles.imageHidden}
                  onLoadStart={() => {
                    setIsImageReady(false);
                    setSelection(null);
                  }}
                  onLoad={() => setIsImageReady(true)}
                  onError={() => setIsImageReady(false)}
                />
              ) : (
                <div className={refStyles.blockError}>
                  Загрузка изображения…
                </div>
              )}
              {isImageReady && <div className={refStyles.editVeil} />}
              {!isImageReady && (
                <div className={refStyles.modalImageLoading}>
                  Загружаем изображение…
                </div>
              )}
              {isImageReady && !hasSelectedRegion && (
                <div className={refStyles.editHint}>
                  Обведите область, которую нужно изменить
                </div>
              )}
              {isImageReady && activeBox && (
                <div
                  className={refStyles.selectionBox}
                  style={{
                    left: `${activeBox.x * 100}%`,
                    top: `${activeBox.y * 100}%`,
                    width: `${activeBox.width * 100}%`,
                    height: `${activeBox.height * 100}%`,
                  }}
                >
                  {hasSelectedRegion && (
                    <span className={refStyles.selectionLabel}>Выбрано</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <aside className={refStyles.modalControls}>
            <div className={refStyles.editPanelHeader}>
              <strong>Что нужно сделать?</strong>
              <span>
                Сначала выделите нужный фрагмент на картинке, затем напишите
                короткое описание правки.
              </span>
            </div>
            <div className={refStyles.selectionStatus}>
              {hasSelectedRegion
                ? "Фрагмент выбран"
                : "Выделите область на изображении"}
            </div>
            <label className={refStyles.promptLabel} htmlFor="reference-edit">
              Описание изменения
            </label>
            <textarea
              id="reference-edit"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="Например: заменить текст на «Start now» и сделать кнопку заметнее"
              rows={7}
            />
            {error && <p className={refStyles.editError}>{error}</p>}
            <div className={refStyles.editButtons}>
              <button
                type="button"
                className={refStyles.secondaryButton}
                onClick={handleResetSelection}
                disabled={!selection || isSubmitting}
              >
                Выбрать заново
              </button>
              <button
                type="button"
                className={refStyles.secondaryButton}
                onClick={onClose}
                disabled={isSubmitting}
              >
                Отмена
              </button>
              <button
                type="button"
                className={refStyles.primaryButton}
                onClick={handleSubmit}
                disabled={
                  !hasSelectedRegion || !instruction.trim() || isSubmitting
                }
              >
                {isSubmitting ? "Сохраняем…" : "Обновить фрагмент"}
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>,
    document.body,
  );
};

export const ReferenceTab: FC<ReferenceTabProps> = ({
  runId,
  artifact,
  blocks,
}) => {
  const fullPageQuery = useArtifactFileUrl(runId, artifact?.id);
  const [editingBlock, setEditingBlock] =
    useState<EditingReferenceBlock | null>(null);

  const hasBlocks = blocks.length > 0;
  const hasFullPage = Boolean(artifact);
  const isGenerating = hasBlocks && !hasFullPage;

  const blockWord = (n: number) => pluralize(n, "блок", "блока", "блоков");

  const headerStatus = isGenerating ? (
    <span className={refStyles.statusLine}>
      <span className={refStyles.spinner} aria-hidden />
      {hasBlocks
        ? `Готово ${blocks.length} ${blockWord(blocks.length)}…`
        : "Подготовка…"}
    </span>
  ) : hasBlocks ? (
    <span className={refStyles.headerMeta}>
      {blocks.length} {blockWord(blocks.length)}
    </span>
  ) : null;

  return (
    <div className={refStyles.root}>
      <div className={refStyles.header}>
        <h2>Визуальный референс</h2>
        {headerStatus}
      </div>

      {!hasBlocks && !hasFullPage && (
        <div className={refStyles.blocks}>
          {Array.from({ length: PLACEHOLDER_BLOCKS_WHEN_EMPTY }).map(
            (_, index) => (
              <SkeletonBlock
                key={`placeholder-${index}`}
                index={index}
                pending={index === 0}
              />
            ),
          )}
        </div>
      )}

      {hasBlocks && (
        <ImageViewerGallery
          images={blocks.map((block, index) => {
            const meta = parseBlockMeta(block.path, index);
            return {
              src: `/api/runs/${runId}/artifacts/${block.id}/file`,
              alt: `Блок ${index + 1} — ${meta.sectionId}`,
            };
          })}
        >
          {({ openGallery }) => (
            <div className={refStyles.blocks}>
              {blocks.map((block, index) => (
                <ReferenceBlock
                  key={block.id}
                  runId={runId}
                  artifact={block}
                  index={index}
                  onClick={(src) => openGallery(index, src)}
                  onEdit={(artifactToEdit, artifactIndex) =>
                    setEditingBlock({
                      artifact: artifactToEdit,
                      index: artifactIndex,
                    })
                  }
                />
              ))}
              {isGenerating && <SkeletonBlock index={blocks.length} pending />}
            </div>
          )}
        </ImageViewerGallery>
      )}

      {hasFullPage && !hasBlocks && (
        <section className={refStyles.fullPage}>
          {fullPageQuery.isError ? (
            <p className={shared.error}>
              Не удалось загрузить финальный референс. Возможно, файл не найден.
            </p>
          ) : fullPageQuery.url ? (
            <ImageViewerGallery
              images={[
                {
                  src: fullPageQuery.url || "",
                  alt: "Визуальный референс — полная сборка",
                },
              ]}
            >
              {({ openGallery }) => (
                <img
                  src={fullPageQuery.url || ""}
                  alt="Визуальный референс — полная сборка"
                  onClick={() => openGallery(0)}
                  style={{ cursor: "pointer", maxWidth: "100%" }}
                />
              )}
            </ImageViewerGallery>
          ) : null}
        </section>
      )}

      {editingBlock && (
        <ReferenceEditModal
          runId={runId}
          editing={editingBlock}
          onClose={() => setEditingBlock(null)}
        />
      )}
    </div>
  );
};
