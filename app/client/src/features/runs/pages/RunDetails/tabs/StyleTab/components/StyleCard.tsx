import type { FC } from "react";

import type { RunArtifact, StyleVariant } from "@/api/services/runs";

import styleTabStyles from "../StyleTab.module.scss";
import visualStyles from "./StyleVisual.module.scss";

interface StyleCardProps {
  variant: StyleVariant;
  artifact: RunArtifact | undefined;
  imageUrl: string | undefined;
  selected: boolean;
  isSelecting: boolean;
  canSelect: boolean;
  index: number;
  onImageClick?: (src: string) => void;
  onSelect: (variantId: string) => void;
}

export const StyleCard: FC<StyleCardProps> = ({
  variant,
  artifact,
  imageUrl,
  selected,
  isSelecting,
  canSelect,
  index,
  onImageClick,
  onSelect,
}) => {
  return (
    <article
      className={[
        visualStyles.block,
        styleTabStyles.card,
        selected ? styleTabStyles.selectedCard : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className={visualStyles.blockHeader}>
        <div className={visualStyles.blockTitle}>
          <span className={visualStyles.blockIndex}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className={visualStyles.blockType}>{variant.name}</span>
        </div>
        <span className={styleTabStyles.cardMeta}>
          {artifact?.path.split("/").pop() ?? variant.id}
        </span>
      </header>

      <div className={styleTabStyles.imageWrap}>
        {imageUrl ? (
          <button
            type="button"
            className={visualStyles.imageButton}
            onClick={() => onImageClick?.(imageUrl)}
          >
            <img
              className={visualStyles.blockImage}
              src={imageUrl}
              alt={variant.name}
            />
          </button>
        ) : (
          <div className={visualStyles.skeletonImage}>
            <span className={visualStyles.skeletonCaption}>
              <span className={visualStyles.spinner} aria-hidden />
              Генерация превью…
            </span>
          </div>
        )}
      </div>

      <div className={styleTabStyles.cardBody}>
        <div className={styleTabStyles.text}>
          <h3>{variant.name}</h3>
          <p>{variant.description}</p>
        </div>

        <div className={styleTabStyles.palette}>
          {variant.colorPalette.map((color) => (
            <span key={color} style={{ background: color }} title={color} />
          ))}
        </div>

        {canSelect && (
          <button
            type="button"
            className={styleTabStyles.selectButton}
            disabled={selected || isSelecting}
            onClick={() => onSelect(variant.id)}
          >
            <span>{selected ? "Стиль выбран" : "Выбрать этот стиль"}</span>
          </button>
        )}
      </div>
    </article>
  );
};
