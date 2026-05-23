/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */
import type { FC } from "react";

import { useArtifactFileUrl } from "@/api/services/runs";
import type { RunArtifact } from "@/api/services/runs";
import { ImageViewerGallery } from "@/kit";

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
        <span className={refStyles.blockMeta}>{meta.fileName}</span>
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
            style={{ cursor: "pointer" }}
          />
        ) : null}
      </div>
    </figure>
  );
};

export const ReferenceTab: FC<ReferenceTabProps> = ({
  runId,
  artifact,
  blocks,
}) => {
  const fullPageQuery = useArtifactFileUrl(runId, artifact?.id);

  const hasBlocks = blocks.length > 0;
  const hasFullPage = Boolean(artifact);
  const isGenerating = hasBlocks && !hasFullPage;

  const blockWord = (n: number) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "блок";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
      return "блока";
    return "блоков";
  };

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
    </div>
  );
};
