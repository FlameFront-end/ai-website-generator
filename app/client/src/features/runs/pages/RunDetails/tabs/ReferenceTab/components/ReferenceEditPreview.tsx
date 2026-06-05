import type { FC, PointerEvent, RefObject } from "react";

import type { ReferenceBlockBbox } from "@/api/services/runs";

import refStyles from "../ReferenceTab.module.scss";

interface ReferenceEditPreviewProps {
  activeBox: ReferenceBlockBbox | undefined;
  alt: string;
  hasError: boolean;
  hasSelectedRegion: boolean;
  imageUrl: string | null;
  imageWrapRef: RefObject<HTMLDivElement | null>;
  isImageReady: boolean;
  onImageError: () => void;
  onImageLoad: () => void;
  onImageLoadStart: () => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
}

export const ReferenceEditPreview: FC<ReferenceEditPreviewProps> = ({
  activeBox,
  alt,
  hasError,
  hasSelectedRegion,
  imageUrl,
  imageWrapRef,
  isImageReady,
  onImageError,
  onImageLoad,
  onImageLoadStart,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) => (
  <div className={refStyles.modalPreviewColumn}>
    <div
      ref={imageWrapRef}
      className={refStyles.modalImageWrap}
      role="presentation"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {hasError ? (
        <div className={refStyles.blockError}>Не удалось загрузить изображение</div>
      ) : imageUrl ? (
        <img
          key={imageUrl}
          src={imageUrl}
          alt={alt}
          draggable={false}
          className={isImageReady ? undefined : refStyles.imageHidden}
          onLoadStart={onImageLoadStart}
          onLoad={onImageLoad}
          onError={onImageError}
        />
      ) : (
        <div className={refStyles.blockError}>Загрузка изображения…</div>
      )}
      {isImageReady && <div className={refStyles.editVeil} />}
      {!isImageReady && (
        <div className={refStyles.modalImageLoading}>Загружаем изображение…</div>
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
);
