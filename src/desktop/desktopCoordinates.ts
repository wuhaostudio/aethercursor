import type { SelectionDraft, SelectionShape } from "../cursor/stateMachine";
import type { OverlayWindowMetrics } from "./desktopOverlay";

export interface DesktopSelectionCoordinates {
  readonly selection: SelectionDraft;
  readonly selectionShape?: SelectionShape;
  readonly displayScale: number;
}

export interface LogicalPoint {
  readonly x: number;
  readonly y: number;
}

export function toOverlayLogicalPoint(
  desktopX: number,
  desktopY: number,
  metrics: OverlayWindowMetrics | null
): LogicalPoint {
  if (!metrics) {
    return {
      x: desktopX,
      y: desktopY
    };
  }

  return {
    x: (desktopX - metrics.origin_x) / metrics.scale_factor,
    y: (desktopY - metrics.origin_y) / metrics.scale_factor
  };
}

export function toDesktopSelectionCoordinates(
  selection: SelectionDraft,
  selectionShape: SelectionShape | undefined,
  metrics: OverlayWindowMetrics | null
): DesktopSelectionCoordinates {
  if (!metrics) {
    return {
      selection,
      selectionShape,
      displayScale: globalThis.devicePixelRatio || 1
    };
  }

  return {
    selection: {
      start_x: toDesktopX(selection.start_x, metrics),
      start_y: toDesktopY(selection.start_y, metrics),
      current_x: toDesktopX(selection.current_x, metrics),
      current_y: toDesktopY(selection.current_y, metrics)
    },
    selectionShape: selectionShape ? toDesktopSelectionShape(selectionShape, metrics) : undefined,
    displayScale: metrics.scale_factor
  };
}

function toDesktopSelectionShape(shape: SelectionShape, metrics: OverlayWindowMetrics): SelectionShape {
  return {
    ...shape,
    bounds: {
      x: toDesktopX(shape.bounds.x, metrics),
      y: toDesktopY(shape.bounds.y, metrics),
      width: shape.bounds.width * metrics.scale_factor,
      height: shape.bounds.height * metrics.scale_factor
    },
    path: shape.path?.map((point) => ({
      x: toDesktopX(point.x, metrics),
      y: toDesktopY(point.y, metrics)
    }))
  };
}

function toDesktopX(x: number, metrics: OverlayWindowMetrics): number {
  return metrics.origin_x + x * metrics.scale_factor;
}

function toDesktopY(y: number, metrics: OverlayWindowMetrics): number {
  return metrics.origin_y + y * metrics.scale_factor;
}
