import type { FC } from "react";

import type { RunArtifact } from "@/api/services/runs";

import { parseBlockMeta } from "../lib/reference-block-meta";
import refStyles from "../ReferenceTab.module.scss";

interface ReferenceBlockProps {
  artifact: RunArtifact;
  imageUrl: string | undefined;
  index: number;
  onClick?: (src: string) => void;
  onEdit?: (artifact: RunArtifact, index: number) => void;
}

export const ReferenceBlock: FC<ReferenceBlockProps> = ({
  artifact,
  imageUrl,
  index,
  onClick,
  onEdit,
}) => {
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
        {imageUrl ? (
          <button
            type="button"
            className={refStyles.imageButton}
            onClick={() => onClick?.(imageUrl)}
          >
            <img
              className={refStyles.blockImage}
              src={imageUrl}
              alt={`Блок ${index + 1} — ${meta.sectionId}`}
              draggable={false}
            />
          </button>
        ) : null}
      </div>
    </figure>
  );
};
