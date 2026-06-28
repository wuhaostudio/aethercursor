const interactivePointerSelector = [
  "button",
  "input",
  "textarea",
  "select",
  "a",
  "[role='button']",
  ".action-menu",
  ".result-canvas",
  ".permission-prompt"
].join(", ");

export function isInteractivePointerTarget(target: EventTarget | null): boolean {
  if (!target || !hasClosest(target)) {
    return false;
  }

  return target.closest(interactivePointerSelector) !== null;
}

function hasClosest(target: EventTarget): target is EventTarget & {
  closest: (selectors: string) => unknown;
} {
  return typeof (target as { closest?: unknown }).closest === "function";
}
