import type { PointerEvent, RefObject } from "react";
import { useState } from "react";

import type { ReferenceBlockBbox } from "@/api/services/runs";

interface RegionSelection {
  startX: number;
  startY: number;
  bbox: ReferenceBlockBbox;
}

interface UseReferenceRegionSelectionResult {
  activeBox: ReferenceBlockBbox | undefined;
  hasSelectedRegion: boolean;
  selection: RegionSelection | null;
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  resetSelection: () => void;
}

export function useReferenceRegionSelection(
  imageWrapRef: RefObject<HTMLDivElement | null>,
  isImageReady: boolean,
  onSelectionStart?: () => void,
): UseReferenceRegionSelectionResult {
  const [selection, setSelection] = useState<RegionSelection | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getNormalizedPoint = (event: PointerEvent<HTMLDivElement>) => {
    const rect = imageWrapRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isImageReady) return;
    const point = getNormalizedPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    onSelectionStart?.();
    setSelection({
      startX: point.x,
      startY: point.y,
      bbox: { x: point.x, y: point.y, width: 0, height: 0 },
    });
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !selection) return;
    const point = getNormalizedPoint(event);
    if (!point) return;
    const x = Math.min(selection.startX, point.x);
    const y = Math.min(selection.startY, point.y);
    const width = Math.abs(point.x - selection.startX);
    const height = Math.abs(point.y - selection.startY);
    setSelection({ ...selection, bbox: { x, y, width, height } });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  };

  const resetSelection = () => {
    setSelection(null);
  };

  const activeBox = selection?.bbox;
  const hasSelectedRegion = Boolean(
    isImageReady &&
      activeBox &&
      activeBox.width >= 0.01 &&
      activeBox.height >= 0.01,
  );

  return {
    activeBox,
    hasSelectedRegion,
    selection,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    resetSelection,
  };
}
