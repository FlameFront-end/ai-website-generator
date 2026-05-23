import type { FC } from "react";
import { useState, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import type { ImageViewerGalleryProps } from "./lib/types";
import { GalleryImage } from "./components/GalleryImage/GalleryImage";
import shared from "./lib/shared.module.scss";
import styles from "./ImageViewerGallery.module.scss";

export const ImageViewerGallery: FC<ImageViewerGalleryProps> = ({
  images,
  initialIndex = 0,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [srcOverride, setSrcOverride] = useState<string | null>(null);
  const currentSrc = srcOverride ?? images[currentIndex]?.src ?? "";

  const openGallery = useCallback((index?: number, srcOverride?: string) => {
    if (index !== undefined) setCurrentIndex(index);
    setSrcOverride(srcOverride ?? null);
    setIsOpen(true);
  }, []);

  const closeGallery = useCallback(() => {
    setIsOpen(false);
    setSrcOverride(null);
  }, []);

  const findNextAvailableIndex = useCallback(
    (fromIndex: number, direction: 1 | -1) => {
      if (images.length === 0) return fromIndex;
      for (let step = 1; step <= images.length; step += 1) {
        const nextIndex =
          (fromIndex + direction * step + images.length) % images.length;
        if (images[nextIndex]?.src) return nextIndex;
      }
      return fromIndex;
    },
    [images],
  );

  const goToPrev = useCallback(() => {
    setSrcOverride(null);
    setCurrentIndex((prev) => findNextAvailableIndex(prev, -1));
  }, [findNextAvailableIndex]);

  const goToNext = useCallback(() => {
    setSrcOverride(null);
    setCurrentIndex((prev) => findNextAvailableIndex(prev, 1));
  }, [findNextAvailableIndex]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeGallery();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeGallery, goToPrev, goToNext]);

  return (
    <>
      {children({ openGallery })}

      {isOpen &&
        createPortal(
          <div className={shared.modalOverlay}>
            <button
              type="button"
              className={shared.modalBackdrop}
              onClick={closeGallery}
              aria-label="Закрыть галерею"
            />
            <div
              className={styles.content}
              role="dialog"
              aria-modal="true"
              aria-label="Галерея изображений"
            >
              <button
                className={styles.navBtn}
                onClick={goToPrev}
                title="Предыдущая (←)"
              >
                <ChevronLeft size={24} />
              </button>

              <div className={styles.imageWrapper}>
                {currentSrc ? (
                  <GalleryImage
                    src={currentSrc}
                    alt={images[currentIndex]?.alt || ""}
                    caption={images[currentIndex]?.caption}
                  />
                ) : (
                  <div className={styles.pending}>
                    <span className={styles.pendingSpinner} />
                    Генерация превью…
                  </div>
                )}
                <span className={styles.counter}>
                  {currentIndex + 1} / {images.length}
                </span>
              </div>

              <button
                className={styles.navBtn}
                onClick={goToNext}
                title="Следующая (→)"
              >
                <ChevronRight size={24} />
              </button>

              <button
                className={styles.closeBtn}
                onClick={closeGallery}
                title="Закрыть (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
