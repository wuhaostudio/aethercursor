import type { CSSProperties } from "react";
import type { OverlaySelectionBox } from "./overlayModel";

export interface FloatingViewport {
  readonly width: number;
  readonly height: number;
}

export interface FloatingSize {
  readonly width: number;
  readonly height: number;
}

const DEFAULT_PADDING = 16;
const DEFAULT_GAP = 12;

export function positionFloatingNearSelection(
  selectionBox: OverlaySelectionBox | null,
  size: FloatingSize,
  viewport: FloatingViewport = getViewportSize(),
  padding = DEFAULT_PADDING,
  gap = DEFAULT_GAP
): CSSProperties {
  const anchorLeft = selectionBox?.left ?? padding;
  const anchorTop = selectionBox ? selectionBox.top + selectionBox.height + gap : 64;
  const preferredTop = anchorTop;
  const fallbackTop = selectionBox ? selectionBox.top - size.height - gap : padding;
  const maxLeft = Math.max(padding, viewport.width - size.width - padding);
  const maxTop = Math.max(padding, viewport.height - size.height - padding);
  const hasRoomBelow = preferredTop + size.height + padding <= viewport.height;
  const top = hasRoomBelow ? preferredTop : fallbackTop;

  return {
    left: `${clamp(anchorLeft, padding, maxLeft)}px`,
    top: `${clamp(top, padding, maxTop)}px`
  };
}

function getViewportSize(): FloatingViewport {
  if (typeof window === "undefined") {
    return {
      width: 1280,
      height: 720
    };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
