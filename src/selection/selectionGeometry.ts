export const MIN_SELECTION_SIZE = 8;

export interface SelectionPoint {
  readonly x: number;
  readonly y: number;
}

export interface SelectionRegion {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export function createSelectionRegion(start: SelectionPoint, current: SelectionPoint): SelectionRegion {
  return {
    left: Math.min(start.x, current.x),
    top: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y)
  };
}

export function isSelectionValid(start: SelectionPoint, end: SelectionPoint): boolean {
  return (
    Math.abs(end.x - start.x) >= MIN_SELECTION_SIZE &&
    Math.abs(end.y - start.y) >= MIN_SELECTION_SIZE
  );
}

export function isRegionRenderable(region: SelectionRegion): boolean {
  return region.width > 0 || region.height > 0;
}

export function isRegionTooSmall(region: SelectionRegion): boolean {
  return region.width > 0 && region.height > 0 && (region.width < MIN_SELECTION_SIZE || region.height < MIN_SELECTION_SIZE);
}
