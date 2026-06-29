export interface SelectedTextReaderOptions {
  readonly documentRef?: Document;
  readonly windowRef?: Window;
  readonly maxLength?: number;
}

const DEFAULT_MAX_LENGTH = 8000;

export function readDomSelectedText(options: SelectedTextReaderOptions = {}): string | null {
  const windowRef = options.windowRef ?? globalThis.window;
  const documentRef = options.documentRef ?? windowRef.document;
  const selection = documentRef.getSelection?.() ?? windowRef.getSelection?.();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const text = normalizeSelectedText(selection.toString(), options.maxLength ?? DEFAULT_MAX_LENGTH);

  return text.length > 0 ? text : null;
}

export function normalizeSelectedText(text: string, maxLength: number = DEFAULT_MAX_LENGTH): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .slice(0, Math.max(0, maxLength));
}
