import type { FC } from "react";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  useArtifactContentQuery,
  useArtifactFileUrl,
} from "@/api/services/runs";
import type {
  RunArtifact,
  StyleVariant,
  StyleVariantsResponse,
} from "@/api/services/runs";
import { runsApi } from "@/shared/api/services/runs/runs.api";
import { ImageViewerGallery } from "@/kit";

import styleTabStyles from "./StyleTab.module.scss";
import refStyles from "./ReferenceTab.module.scss";

interface StyleTabProps {
  runId: string;
  status: string;
  variantsArtifact: RunArtifact | undefined;
  imageArtifacts: RunArtifact[];
  selectedStyleArtifact: RunArtifact | undefined;
  onSelected?: () => void;
}

interface StyleCardProps {
  runId: string;
  variant: StyleVariant;
  artifact: RunArtifact | undefined;
  selected: boolean;
  isSelecting: boolean;
  canSelect: boolean;
  index: number;
  onImageClick?: (src: string) => void;
  onImageUrlChange?: (artifactId: string, src: string) => void;
  onSelect: (variantId: string) => void;
}

const PLACEHOLDER_VARIANTS_WHEN_EMPTY = 3;

const SkeletonBlock: FC<{ index: number; pending?: boolean }> = ({
  index,
  pending,
}) => (
  <figure
    className={refStyles.block}
    aria-label={`Вариант визуального стиля ${index + 1} (генерация)`}
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
          Готовим вариант стиля {index + 1}…
        </span>
      )}
    </div>
  </figure>
);

function parseVariants(content?: string): StyleVariant[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content) as StyleVariantsResponse;
    return parsed.variants ?? [];
  } catch {
    return [];
  }
}

function parseSelectedStyle(content?: string): StyleVariant | null {
  if (!content) return null;
  try {
    return JSON.parse(content) as StyleVariant;
  } catch {
    return null;
  }
}

const StyleCard: FC<StyleCardProps> = ({
  runId,
  variant,
  artifact,
  selected,
  isSelecting,
  canSelect,
  index,
  onImageClick,
  onImageUrlChange,
  onSelect,
}) => {
  const imageQuery = useArtifactFileUrl(runId, artifact?.id);

  useEffect(() => {
    if (artifact?.id && imageQuery.url) {
      onImageUrlChange?.(artifact.id, imageQuery.url);
    }
  }, [artifact?.id, imageQuery.url, onImageUrlChange]);

  return (
    <article
      className={[
        refStyles.block,
        styleTabStyles.card,
        selected ? styleTabStyles.selectedCard : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className={refStyles.blockHeader}>
        <div className={refStyles.blockTitle}>
          <span className={refStyles.blockIndex}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className={refStyles.blockType}>{variant.name}</span>
        </div>
        <span className={styleTabStyles.cardMeta}>
          {artifact?.path.split("/").pop() ?? variant.id}
        </span>
      </header>

      <div className={styleTabStyles.imageWrap}>
        {imageQuery.url ? (
          <img
            className={refStyles.blockImage}
            src={imageQuery.url}
            alt={variant.name}
            onClick={() => onImageClick?.(imageQuery.url || "")}
            style={{ cursor: "pointer" }}
          />
        ) : (
          <div className={refStyles.skeletonImage}>
            <span className={refStyles.skeletonCaption}>
              <span className={refStyles.spinner} aria-hidden />
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

export const StyleTab: FC<StyleTabProps> = ({
  runId,
  status,
  variantsArtifact,
  imageArtifacts,
  selectedStyleArtifact,
  onSelected,
}) => {
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const canSelect = status === "awaiting_style_selection";
  const variantsQuery = useArtifactContentQuery(runId, variantsArtifact?.id);
  const selectedQuery = useArtifactContentQuery(
    runId,
    selectedStyleArtifact?.id,
  );

  const variants = useMemo(
    () => parseVariants(variantsQuery.data?.content),
    [variantsQuery.data?.content],
  );
  const selectedStyle = useMemo(
    () => parseSelectedStyle(selectedQuery.data?.content),
    [selectedQuery.data?.content],
  );

  const imageByVariantId = useMemo(() => {
    const map = new Map<string, RunArtifact>();
    for (const artifact of imageArtifacts) {
      const filename = artifact.path
        .split("/")
        .pop()
        ?.replace(/\.png$/i, "");
      if (filename) map.set(filename, artifact);
    }
    return map;
  }, [imageArtifacts]);

  const handleSelect = async (variantId: string) => {
    setSelectingId(variantId);
    try {
      await runsApi.selectStyle(runId, { styleVariantId: variantId });
      onSelected?.();
    } finally {
      setSelectingId(null);
    }
  };

  const handleImageUrlChange = useCallback(
    (artifactId: string, src: string) => {
      setImageUrls((current) =>
        current[artifactId] === src
          ? current
          : { ...current, [artifactId]: src },
      );
    },
    [],
  );

  if (variantsQuery.isLoading || !variantsArtifact) {
    return (
      <div className={styleTabStyles.root}>
        <div className={refStyles.root}>
          <div className={refStyles.header}>
            <h2>Выберите визуальный стиль сайта</h2>
            <span className={refStyles.statusLine}>
              <span className={refStyles.spinner} aria-hidden />
              Генерация…
            </span>
          </div>
          <div className={refStyles.blocks}>
            {Array.from({ length: PLACEHOLDER_VARIANTS_WHEN_EMPTY }).map(
              (_, index) => (
                <SkeletonBlock
                  key={`placeholder-${index}`}
                  index={index}
                  pending={index === 0}
                />
              ),
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variants.length === 0) {
    return (
      <div className={styleTabStyles.empty}>
        Варианты визуального стиля пока не готовы.
      </div>
    );
  }

  return (
    <div className={styleTabStyles.root}>
      <div className={refStyles.root}>
        <div className={refStyles.header}>
          <h2>Выберите визуальный стиль сайта</h2>
          <span className={refStyles.headerMeta}>
            {variants.length} вариантов
          </span>
        </div>

        <ImageViewerGallery
          images={variants.map((variant) => {
            const artifact = imageByVariantId.get(variant.id);
            return {
              src: artifact ? imageUrls[artifact.id] || "" : "",
              alt: variant.name,
            };
          })}
        >
          {({ openGallery }) => (
            <div className={refStyles.blocks}>
              {variants.map((variant, index) => {
                const artifact = imageByVariantId.get(variant.id);

                return (
                  <StyleCard
                    key={variant.id}
                    runId={runId}
                    variant={variant}
                    artifact={artifact}
                    selected={selectedStyle?.id === variant.id}
                    isSelecting={selectingId === variant.id}
                    canSelect={canSelect}
                    index={index}
                    onImageClick={(src) => openGallery(index, src)}
                    onImageUrlChange={handleImageUrlChange}
                    onSelect={handleSelect}
                  />
                );
              })}
            </div>
          )}
        </ImageViewerGallery>
      </div>
    </div>
  );
};
