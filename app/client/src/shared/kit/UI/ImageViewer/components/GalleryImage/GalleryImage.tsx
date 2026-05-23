import type { FC } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";

import type { GalleryImageProps } from "../../lib/types";
import { usePanZoom } from "../../hooks/usePanZoom";
import shared from "../../lib/shared.module.scss";
import styles from "./GalleryImage.module.scss";

export const GalleryImage: FC<GalleryImageProps> = ({ src, alt, caption }) => {
  const {
    scale,
    containerProps,
    imageStyle,
    cursorStyle,
    zoomIn,
    zoomOut,
    reset,
  } = usePanZoom();

  return (
    <div className={styles.container}>
      <div
        className={styles.zoomContainer}
        role="application"
        aria-label="Масштабирование и перемещение изображения"
        {...containerProps}
        style={{ cursor: cursorStyle }}
      >
        <img
          src={src}
          alt={alt}
          className={styles.image}
          style={imageStyle}
          draggable={false}
        />
      </div>
      {caption && <p className={styles.caption}>{caption}</p>}
      <div className={styles.controls}>
        <button
          className={shared.controlBtn}
          onClick={zoomOut}
          title="Уменьшить"
        >
          <Minus size={16} />
        </button>
        <span className={shared.zoomLevel}>{Math.round(scale * 100)}%</span>
        <button
          className={shared.controlBtn}
          onClick={zoomIn}
          title="Увеличить"
        >
          <Plus size={16} />
        </button>
        <button className={shared.controlBtn} onClick={reset} title="Сбросить">
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};
