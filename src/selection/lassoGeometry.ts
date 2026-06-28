import { MIN_SELECTION_SIZE, type SelectionPoint, type SelectionRegion } from "./selectionGeometry";

export const MIN_LASSO_POINTS = 3;

export function createLassoBounds(points: readonly SelectionPoint[]): SelectionRegion {
  if (points.length === 0) {
    return {
      left: 0,
      top: 0,
      width: 0,
      height: 0
    };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);

  return {
    left,
    top,
    width: right - left,
    height: bottom - top
  };
}

export function isLassoPathValid(points: readonly SelectionPoint[]): boolean {
  const bounds = createLassoBounds(points);

  return points.length >= MIN_LASSO_POINTS && bounds.width >= MIN_SELECTION_SIZE && bounds.height >= MIN_SELECTION_SIZE;
}
