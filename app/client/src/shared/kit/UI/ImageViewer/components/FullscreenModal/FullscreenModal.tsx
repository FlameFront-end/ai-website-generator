import type { FC } from "react";
import { useLayoutEffect } from "react";
import { Minus, Plus, RotateCcw, X } from "lucide-react";

import type { FullscreenModalProps } from "../../lib/types";
import { usePanZoom } from "../../hooks/usePanZoom";
import shared from "../../lib/shared.module.scss";
import styles from "./FullscreenModal.module.scss";

export const FullscreenModal: FC<FullscreenModalProps> = ({
  src,
  alt,
  caption,
  onClose,
}) => {
  const {
    scale,
    containerProps,
    imageStyle,
    cursorStyle,
    zoomIn,
    zoomOut,
    reset,
  } = usePanZoom();

  useLayoutEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className={shared.modalOverlay}>
      <button
        type="button"
        className={shared.modalBackdrop}
        onClick={onClose}
        aria-label="Закрыть просмотр"
      />
      <div
        className={styles.content}
        role="dialog"
        aria-modal="true"
        aria-label={alt || "Просмотр изображения"}
      >
        <div
          className={styles.imageContainer}
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
          <button
            className={shared.controlBtn}
            onClick={reset}
            title="Сбросить"
          >
            <RotateCcw size={14} />
          </button>
          <button
            className={shared.controlBtn}
            onClick={onClose}
            title="Закрыть"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
