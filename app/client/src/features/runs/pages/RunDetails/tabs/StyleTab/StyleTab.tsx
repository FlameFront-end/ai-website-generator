import type { FC } from "react";

import { useMemo, useState } from "react";

import { toast } from "react-toastify";

import {
  useArtifactContentQuery,
  useArtifactFileUrls,
  useSelectStyleMutation,
} from "@/api/services/runs";
import type { RunArtifact } from "@/api/services/runs";
import { ImageViewerGallery } from "@/kit";
import { logger } from "@/lib";

import { StyleCard } from "./components/StyleCard";
import { StyleSkeletonBlock } from "./components/StyleSkeletonBlock";
import { parseSelectedStyle, parseVariants } from "./lib/style-variant-parsing";
import styleTabStyles from "./StyleTab.module.scss";
import visualStyles from "./components/StyleVisual.module.scss";

interface StyleTabProps {
  runId: string;
  status: string;
  variantsArtifact: RunArtifact | undefined;
  imageArtifacts: RunArtifact[];
  selectedStyleArtifact: RunArtifact | undefined;
  onSelected?: () => Promise<void> | void;
}

const PLACEHOLDER_VARIANTS_WHEN_EMPTY = 3;

export const StyleTab: FC<StyleTabProps> = ({
  runId,
  status,
  variantsArtifact,
  imageArtifacts,
  selectedStyleArtifact,
  onSelected,
}) => {
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [optimisticSelection, setOptimisticSelection] = useState<{
    runId: string;
    variantId: string;
  } | null>(null);
  const canSelect = status === "awaiting_style_selection";
  const variantsQuery = useArtifactContentQuery(runId, variantsArtifact?.id);
  const selectedQuery = useArtifactContentQuery(
    runId,
    selectedStyleArtifact?.id,
  );
  const selectStyleMutation = useSelectStyleMutation();
  const imageArtifactIds = useMemo(
    () => imageArtifacts.map((artifact) => artifact.id),
    [imageArtifacts],
  );
  const imageUrls = useArtifactFileUrls(runId, imageArtifactIds);

  const variants = useMemo(
    () => parseVariants(variantsQuery.data?.content),
    [variantsQuery.data?.content],
  );
  const selectedStyle = useMemo(
    () => parseSelectedStyle(selectedQuery.data?.content),
    [selectedQuery.data?.content],
  );
  const optimisticSelectedId =
    optimisticSelection?.runId === runId &&
    optimisticSelection.variantId !== selectedStyle?.id
      ? optimisticSelection.variantId
      : null;
  const selectedStyleId = optimisticSelectedId ?? selectedStyle?.id ?? null;

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
    setOptimisticSelection({ runId, variantId });
    setSelectingId(variantId);
    try {
      await selectStyleMutation.mutateAsync({
        runId,
        payload: { styleVariantId: variantId },
      });
      await onSelected?.();
      setOptimisticSelection(null);
    } catch (error) {
      logger.error("run:select-style", error, { runId, variantId });
      setOptimisticSelection(null);
      toast.error("Не удалось выбрать стиль");
    } finally {
      setSelectingId(null);
    }
  };

  if (variantsQuery.isLoading || !variantsArtifact) {
    return (
      <div className={styleTabStyles.root}>
        <div className={visualStyles.root}>
          <div className={visualStyles.header}>
            <h2>Выберите визуальный стиль сайта</h2>
            <span className={visualStyles.statusLine}>
              <span className={visualStyles.spinner} aria-hidden />
              Генерация…
            </span>
          </div>
          <div className={visualStyles.blocks}>
            {Array.from({ length: PLACEHOLDER_VARIANTS_WHEN_EMPTY }).map(
              (_, index) => (
                <StyleSkeletonBlock
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
      <div className={visualStyles.root}>
        <div className={visualStyles.header}>
          <h2>Выберите визуальный стиль сайта</h2>
          <span className={visualStyles.headerMeta}>
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
            <div className={visualStyles.blocks}>
              {variants.map((variant, index) => {
                const artifact = imageByVariantId.get(variant.id);

                return (
                  <StyleCard
                    key={variant.id}
                    variant={variant}
                    artifact={artifact}
                    imageUrl={artifact ? imageUrls[artifact.id] : undefined}
                    selected={selectedStyleId === variant.id}
                    isSelecting={selectingId === variant.id}
                    canSelect={canSelect}
                    index={index}
                    onImageClick={(src) => openGallery(index, src)}
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
