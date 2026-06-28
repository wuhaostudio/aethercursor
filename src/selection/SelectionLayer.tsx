import type { CSSProperties } from "react";
import type { SelectionShapeMode } from "../cursor/stateMachine";
import type { SelectionPoint, SelectionRegion } from "./selectionGeometry";
import { isRegionRenderable, isRegionTooSmall } from "./selectionGeometry";
import "./SelectionLayer.css";

interface SelectionLayerProps {
  readonly region: SelectionRegion;
  readonly active: boolean;
  readonly mode?: SelectionShapeMode | null;
  readonly path?: readonly SelectionPoint[];
}

export function SelectionLayer({ region, active, mode = "rect", path = [] }: SelectionLayerProps) {
  if (!isRegionRenderable(region)) {
    return null;
  }

  const className = createSelectionLayerClassName({
    mode,
    active,
    small: isRegionTooSmall(region)
  });

  return (
    <div className={className} style={selectionStyle(region)}>
      {mode === "focus" ? <span className="selection-layer__focus-core" /> : null}
      {mode === "lasso" && path.length > 1 ? (
        <svg className="selection-layer__lasso-path" viewBox={`0 0 ${region.width} ${region.height}`} aria-hidden="true">
          <polyline points={toRelativePathPoints(path, region)} />
        </svg>
      ) : null}
      {mode !== "focus" ? (
        <>
          <span className="selection-layer__corner selection-layer__corner--tl" />
          <span className="selection-layer__corner selection-layer__corner--tr" />
          <span className="selection-layer__corner selection-layer__corner--bl" />
          <span className="selection-layer__corner selection-layer__corner--br" />
        </>
      ) : null}
    </div>
  );
}

export function createSelectionLayerClassName(options: {
  readonly mode?: SelectionShapeMode | null;
  readonly active: boolean;
  readonly small: boolean;
}): string {
  return [
    "selection-layer",
    `selection-layer--${options.mode ?? "rect"}`,
    options.active ? "selection-layer--active" : "",
    options.small ? "selection-layer--small" : ""
  ]
    .filter(Boolean)
    .join(" ");
}

export function toRelativePathPoints(path: readonly SelectionPoint[], region: SelectionRegion): string {
  return path.map((point) => `${point.x - region.left},${point.y - region.top}`).join(" ");
}

function selectionStyle(region: SelectionRegion): CSSProperties {
  return {
    left: `${region.left}px`,
    top: `${region.top}px`,
    width: `${region.width}px`,
    height: `${region.height}px`
  };
}
