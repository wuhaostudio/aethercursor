import type { CSSProperties } from "react";
import type { SelectionRegion } from "./selectionGeometry";
import { isRegionRenderable, isRegionTooSmall } from "./selectionGeometry";
import "./SelectionLayer.css";

interface SelectionLayerProps {
  readonly region: SelectionRegion;
  readonly active: boolean;
}

export function SelectionLayer({ region, active }: SelectionLayerProps) {
  if (!isRegionRenderable(region)) {
    return null;
  }

  const className = [
    "selection-layer",
    active ? "selection-layer--active" : "",
    isRegionTooSmall(region) ? "selection-layer--small" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} style={selectionStyle(region)}>
      <span className="selection-layer__corner selection-layer__corner--tl" />
      <span className="selection-layer__corner selection-layer__corner--tr" />
      <span className="selection-layer__corner selection-layer__corner--bl" />
      <span className="selection-layer__corner selection-layer__corner--br" />
    </div>
  );
}

function selectionStyle(region: SelectionRegion): CSSProperties {
  return {
    left: `${region.left}px`,
    top: `${region.top}px`,
    width: `${region.width}px`,
    height: `${region.height}px`
  };
}
