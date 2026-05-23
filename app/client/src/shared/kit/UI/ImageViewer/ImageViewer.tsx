import type { FC } from "react";
import { useState, useCallback } from "react";
import { createPortal } from "react-dom";

import clsx from "clsx";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";

import type { ImageViewerProps } from "./lib/types";
import { FullscreenModal } from "./components/FullscreenModal/FullscreenModal";
import styles from "./ImageViewer.module.scss";

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

  const handleFullscreenOpen = useCallback(() => setIsFullscreen(true), []);
  const handleFullscreenClose = useCallback(() => setIsFullscreen(false), []);

  const handleDoubleClick = useCallback(() => {
    if (fullscreenOnDoubleClick) handleFullscreenOpen();
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
          <button
            type="button"
            className={styles.thumbnailButton}
            onClick={handleFullscreenOpen}
          >
            {thumbnail}
          </button>
        )}
        {caption && (
          <figcaption className={styles.caption}>{caption}</figcaption>
        )}
      </figure>

      {isFullscreen &&
        createPortal(
          <FullscreenModal
            key={src}
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
