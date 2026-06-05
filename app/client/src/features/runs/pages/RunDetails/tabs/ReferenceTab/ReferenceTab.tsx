import type { FC } from "react";
import { useMemo, useState } from "react";

import { useArtifactFileUrls, useArtifactFileUrl } from "@/api/services/runs";
import type { RunArtifact } from "@/api/services/runs";
import { ImageViewerGallery } from "@/kit";
import { pluralize } from "@/lib/pluralize";

import shared from "../../lib/run-details-shared.module.scss";
import { ReferenceBlock } from "./components/ReferenceBlock";
import {
  ReferenceEditModal,
  type EditingReferenceBlock,
} from "./components/ReferenceEditModal";
import { SkeletonBlock } from "./components/SkeletonBlock";
import { parseBlockMeta } from "./lib/reference-block-meta";
import refStyles from "./ReferenceTab.module.scss";

const PLACEHOLDER_BLOCKS_WHEN_EMPTY = 3;

interface ReferenceTabProps {
  runId: string;
  artifact: RunArtifact | undefined;
  blocks: RunArtifact[];
}

export const ReferenceTab: FC<ReferenceTabProps> = ({
  runId,
  artifact,
  blocks,
}) => {
  const fullPageQuery = useArtifactFileUrl(runId, artifact?.id);
  const [editingBlock, setEditingBlock] =
    useState<EditingReferenceBlock | null>(null);
  const blockArtifactIds = useMemo(
    () => blocks.map((block) => block.id),
    [blocks],
  );
  const blockImageUrls = useArtifactFileUrls(runId, blockArtifactIds);

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

      {!hasBlocks && !hasFullPage && <ReferenceSkeletonGrid />}

      {hasBlocks && (
        <ReferenceBlocksGallery
          blocks={blocks}
          blockImageUrls={blockImageUrls}
          isGenerating={isGenerating}
          onEdit={setEditingBlock}
        />
      )}

      {hasFullPage && !hasBlocks && (
        <FullPageReference fileUrl={fullPageQuery.url} hasError={fullPageQuery.isError} />
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

const ReferenceSkeletonGrid: FC = () => (
  <div className={refStyles.blocks}>
    {Array.from({ length: PLACEHOLDER_BLOCKS_WHEN_EMPTY }).map((_, index) => (
      <SkeletonBlock
        key={`placeholder-${index}`}
        index={index}
        pending={index === 0}
      />
    ))}
  </div>
);

interface ReferenceBlocksGalleryProps {
  blocks: RunArtifact[];
  blockImageUrls: Record<string, string>;
  isGenerating: boolean;
  onEdit: (editingBlock: EditingReferenceBlock) => void;
}

const ReferenceBlocksGallery: FC<ReferenceBlocksGalleryProps> = ({
  blocks,
  blockImageUrls,
  isGenerating,
  onEdit,
}) => (
  <ImageViewerGallery
    images={blocks.map((block, index) => {
      const meta = parseBlockMeta(block.path, index);
      return {
        src: blockImageUrls[block.id] ?? "",
        alt: `Блок ${index + 1} — ${meta.sectionId}`,
      };
    })}
  >
    {({ openGallery }) => (
      <div className={refStyles.blocks}>
        {blocks.map((block, index) => (
          <ReferenceBlock
            key={block.id}
            artifact={block}
            imageUrl={blockImageUrls[block.id]}
            index={index}
            onClick={(src) => openGallery(index, src)}
            onEdit={(artifactToEdit, artifactIndex) =>
              onEdit({
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
);

interface FullPageReferenceProps {
  fileUrl: string | null;
  hasError: boolean;
}

const FullPageReference: FC<FullPageReferenceProps> = ({
  fileUrl,
  hasError,
}) => (
  <section className={refStyles.fullPage}>
    {hasError ? (
      <p className={shared.error}>
        Не удалось загрузить финальный референс. Возможно, файл не найден.
      </p>
    ) : fileUrl ? (
      <ImageViewerGallery
        images={[
          {
            src: fileUrl || "",
            alt: "Визуальный референс — полная сборка",
          },
        ]}
      >
        {({ openGallery }) => (
          <button
            type="button"
            className={refStyles.fullPageImageButton}
            onClick={() => openGallery(0)}
          >
            <img
              src={fileUrl || ""}
              alt="Визуальный референс — полная сборка"
            />
          </button>
        )}
      </ImageViewerGallery>
    ) : null}
  </section>
);
