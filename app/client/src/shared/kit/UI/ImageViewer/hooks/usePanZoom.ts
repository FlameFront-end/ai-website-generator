import type { WheelEvent, MouseEvent } from "react";
import { useState, useCallback, useRef } from "react";

export function usePanZoom() {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => {
      const next = Math.min(Math.max(prev * delta, 0.5), 5);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
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

  const zoomIn = useCallback(
    () => setScale((prev) => Math.min(prev * 1.5, 5)),
    [],
  );

  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(prev / 1.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const containerProps = {
    onWheel: handleWheel,
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseUp,
  };

  const imageStyle = {
    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
    transition: isDragging ? "none" : "transform 0.2s ease",
  };

  const cursorStyle =
    scale > 1 ? (isDragging ? "grabbing" : "grab") : "default";

  return {
    scale,
    containerProps,
    imageStyle,
    cursorStyle,
    zoomIn,
    zoomOut,
    reset,
  };
}
