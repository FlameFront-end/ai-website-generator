import type { ReactNode } from "react";

export interface ImageViewerProps {
  src: string;
  alt?: string;
  caption?: string;
  className?: string;
  thumbnailClassName?: string;
  inlineZoom?: boolean;
  fullscreenOnDoubleClick?: boolean;
  renderThumbnail?: (props: {
    onClick: () => void;
    src: string;
    alt?: string;
  }) => ReactNode;
}

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

export interface FullscreenModalProps {
  src: string;
  alt: string;
  caption?: string;
  onClose: () => void;
}

export interface GalleryImageProps {
  src: string;
  alt: string;
  caption?: string;
}
