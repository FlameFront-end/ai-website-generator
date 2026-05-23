import type { FC, ReactNode, WheelEvent, MouseEvent } from "react";
import { useState, useCallback, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

import clsx from "clsx";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";

import styles from "./ImageViewer.module.scss";

export interface ImageViewerProps {
  src: string;
  alt?: string;
  caption?: string;
  className?: string;
  thumbnailClassName?: string;
  /** Enable inline zoom on click (default: true) */
  inlineZoom?: boolean;
  /** Open fullscreen modal on double click (default: false) */
  fullscreenOnDoubleClick?: boolean;
  renderThumbnail?: (props: {
    onClick: () => void;
    src: string;
    alt?: string;
  }) => ReactNode;
}

export const ImageViewer: FC<ImageViewerProps> = ({
  src,
  alt = "",
  caption,
  className,
  thumbnailClassName,
  inlineZoom = true,
  fullscreenOnDoubleClick = false,
  renderThumbnail,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreenOpen = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  const handleFullscreenClose = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (fullscreenOnDoubleClick) {
      handleFullscreenOpen();
    }
  }, [fullscreenOnDoubleClick, handleFullscreenOpen]);

  const thumbnail = renderThumbnail ? (
    renderThumbnail({ onClick: handleFullscreenOpen, src, alt })
  ) : (
    <img
      src={src}
      alt={alt}
      className={clsx(styles.thumbnail, thumbnailClassName)}
      onDoubleClick={handleDoubleClick}
    />
  );

  return (
    <>
      <figure className={clsx(styles.figure, className)}>
        {inlineZoom ? (
          <Zoom>{thumbnail}</Zoom>
        ) : (
          <div onClick={handleFullscreenOpen} style={{ cursor: "pointer" }}>
            {thumbnail}
          </div>
        )}
        {caption && (
          <figcaption className={styles.caption}>{caption}</figcaption>
        )}
      </figure>

      {isFullscreen &&
        createPortal(
          <FullscreenModal
            key={src} // Force remount to reset state
            src={src}
            alt={alt}
            caption={caption}
            onClose={handleFullscreenClose}
          />,
          document.body,
        )}
    </>
  );
};

interface FullscreenModalProps {
  src: string;
  alt: string;
  caption?: string;
  onClose: () => void;
}

const FullscreenModal: FC<FullscreenModalProps> = ({
  src,
  alt,
  caption,
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape and prevent body scroll
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

  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.min(Math.max(prev * delta, 0.5), 5));
  }, []);

  const handleMouseDown = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (scale > 1) {
        setIsDragging(true);
        dragStart.current = {
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        };
      }
    },
    [scale, position],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (isDragging && scale > 1) {
        setPosition({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y,
        });
      }
    },
    [isDragging, scale],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev * 1.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const newScale = Math.max(prev / 1.5, 1);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
      return newScale;
    });
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  return (
    <div className={styles.modalOverlay} onClick={onClose} ref={containerRef}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div
          className={styles.imageContainer}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          }}
        >
          <img
            src={src}
            alt={alt}
            className={styles.fullscreenImage}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? "none" : "transform 0.2s ease",
            }}
            draggable={false}
          />
        </div>

        {caption && <p className={styles.modalCaption}>{caption}</p>}

        <div className={styles.controls}>
          <button
            className={styles.controlBtn}
            onClick={handleZoomOut}
            title="Уменьшить"
          >
            −
          </button>
          <span className={styles.zoomLevel}>{Math.round(scale * 100)}%</span>
          <button
            className={styles.controlBtn}
            onClick={handleZoomIn}
            title="Увеличить"
          >
            +
          </button>
          <button
            className={styles.controlBtn}
            onClick={handleReset}
            title="Сбросить"
          >
            ⟲
          </button>
          <button
            className={styles.controlBtn}
            onClick={onClose}
            title="Закрыть"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

// Simple zoomable image for gallery (no modal, zoom is local)
interface GalleryImageProps {
  src: string;
  alt: string;
  caption?: string;
}

const GalleryImage: FC<GalleryImageProps> = ({ src, alt, caption }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => {
      const newScale = Math.min(Math.max(prev * delta, 0.5), 5);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
      return newScale;
    });
  }, []);

  const handleMouseDown = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (scale > 1) {
        setIsDragging(true);
        dragStart.current = {
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        };
      }
    },
    [scale, position],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (isDragging && scale > 1) {
        setPosition({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y,
        });
      }
    },
    [isDragging, scale],
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleZoomIn = useCallback(
    () => setScale((prev) => Math.min(prev * 1.5, 5)),
    [],
  );
  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const newScale = Math.max(prev / 1.5, 1);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
      return newScale;
    });
  }, []);
  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  return (
    <div className={styles.galleryImageContainer}>
      <div
        className={styles.galleryZoomContainer}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
        }}
      >
        <img
          src={src}
          alt={alt}
          className={styles.galleryImage}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? "none" : "transform 0.2s ease",
          }}
          draggable={false}
        />
      </div>
      {caption && <p className={styles.galleryCaption}>{caption}</p>}
      <div className={styles.galleryControls}>
        <button
          className={styles.controlBtn}
          onClick={handleZoomOut}
          title="Уменьшить"
        >
          −
        </button>
        <span className={styles.zoomLevel}>{Math.round(scale * 100)}%</span>
        <button
          className={styles.controlBtn}
          onClick={handleZoomIn}
          title="Увеличить"
        >
          +
        </button>
        <button
          className={styles.controlBtn}
          onClick={handleReset}
          title="Сбросить"
        >
          ⟲
        </button>
      </div>
    </div>
  );
};

export interface ImageViewerGalleryProps {
  images: Array<{
    src: string;
    alt?: string;
    caption?: string;
  }>;
  initialIndex?: number;
  children: (props: {
    openGallery: (index?: number, srcOverride?: string) => void;
  }) => ReactNode;
}

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

  // Keyboard navigation
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
          <div className={styles.modalOverlay} onClick={closeGallery}>
            <div
              className={styles.galleryContent}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.navBtn}
                onClick={goToPrev}
                title="Предыдущая (←)"
              >
                ‹
              </button>

              <div className={styles.galleryImageWrapper}>
                {currentSrc ? (
                  <GalleryImage
                    src={currentSrc}
                    alt={images[currentIndex]?.alt || ""}
                    caption={images[currentIndex]?.caption}
                  />
                ) : (
                  <div className={styles.galleryPending}>
                    <span className={styles.galleryPendingSpinner} />
                    Генерация превью…
                  </div>
                )}
                <span className={styles.galleryCounter}>
                  {currentIndex + 1} / {images.length}
                </span>
              </div>

              <button
                className={styles.navBtn}
                onClick={goToNext}
                title="Следующая (→)"
              >
                ›
              </button>

              <button
                className={styles.galleryClose}
                onClick={closeGallery}
                title="Закрыть (Esc)"
              >
                ✕
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
