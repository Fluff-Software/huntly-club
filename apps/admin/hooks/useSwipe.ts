"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useRef, useState } from "react";

const SWIPE_THRESHOLD = 80; // px before action triggers
const MAX_ROTATION_DEG = 15;

interface SwipeState {
  offsetX: number;
  isDragging: boolean;
}

interface UseSwipeOptions {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  disabled?: boolean;
}

interface UseSwipeReturn {
  swipeState: SwipeState;
  cardStyle: CSSProperties;
  overlayOpacity: number;
  overlayDirection: "left" | "right" | null;
  /**
   * Returns true if the last pointer interaction was a drag (not a tap).
   * Call at the top of onClick handlers to bail out early.
   * Reads directly from the ref so it is always accurate at event time.
   */
  wasDrag: () => boolean;
  pointerHandlers: {
    onPointerDown: (e: ReactPointerEvent) => void;
  };
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
}: UseSwipeOptions): UseSwipeReturn {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    offsetX: 0,
    isDragging: false,
  });

  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const wasDragRef = useRef(false);

  // Native event handlers (added to window)
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDraggingRef.current || disabled) return;
      const dx = e.clientX - startXRef.current;
      currentXRef.current = dx;
      if (Math.abs(dx) > 5) {
        wasDragRef.current = true;
      }
      setSwipeState({ offsetX: dx, isDragging: true });
    },
    [disabled],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      const dx = currentXRef.current;
      // Defer clearing so the click event (which fires after pointerup) can still read true
      setTimeout(() => { wasDragRef.current = false; }, 0);

      // Release pointer capture
      (e.target as Element).releasePointerCapture(e.pointerId);

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);

      if (dx > SWIPE_THRESHOLD) {
        setSwipeState({ offsetX: 0, isDragging: false });
        onSwipeRight();
      } else if (dx < -SWIPE_THRESHOLD) {
        setSwipeState({ offsetX: 0, isDragging: false });
        onSwipeLeft();
      } else {
        // Snap back
        setSwipeState({ offsetX: 0, isDragging: false });
      }
    },
    [handlePointerMove, onSwipeLeft, onSwipeRight],
  );

  // React synthetic event handler (attached to JSX element)
  const handlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (disabled) return;
      // Only handle primary button (left click / touch)
      if (e.button !== 0 && e.pointerType !== "touch") return;

      isDraggingRef.current = true;
      wasDragRef.current = false;
      startXRef.current = e.clientX;
      currentXRef.current = 0;

      // Capture pointer so moves/ups fire even outside the element
      (e.target as Element).setPointerCapture(e.pointerId);

      setSwipeState({ offsetX: 0, isDragging: true });

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [disabled, handlePointerMove, handlePointerUp],
  );

  const { offsetX, isDragging } = swipeState;

  const clampedOffset = Math.max(-300, Math.min(300, offsetX));
  const rotationDeg = (clampedOffset / 300) * MAX_ROTATION_DEG;

  const cardStyle: CSSProperties = {
    transform: `translateX(${clampedOffset}px) rotate(${rotationDeg}deg)`,
    transition: isDragging ? "none" : "transform 0.3s ease",
    cursor: isDragging ? "grabbing" : "grab",
    userSelect: "none",
    touchAction: "none",
  };

  const rawOpacity = Math.min(Math.abs(clampedOffset) / SWIPE_THRESHOLD, 1);
  const overlayOpacity = isDragging ? rawOpacity : 0;
  const overlayDirection: "left" | "right" | null =
    clampedOffset > 5 ? "right" : clampedOffset < -5 ? "left" : null;

  /** Returns true if the interaction was a drag — call early in onClick to bail out */
  const wasDrag = useCallback(() => wasDragRef.current, []);

  return {
    swipeState,
    cardStyle,
    overlayOpacity,
    overlayDirection,
    wasDrag,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
    },
  };
}
