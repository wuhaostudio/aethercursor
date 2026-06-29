import { describe, expect, it } from "vitest";
import { normalizeSelectedText, readDomSelectedText } from "./selectedText";

describe("selected text capture", () => {
  it("normalizes selected text whitespace", () => {
    expect(normalizeSelectedText("  First   line \r\n\r\n Second\tline  ")).toBe("First line\nSecond line");
  });

  it("truncates selected text to the requested max length", () => {
    expect(normalizeSelectedText("abcdef", 3)).toBe("abc");
  });

  it("returns null for collapsed selections", () => {
    expect(
      readDomSelectedText({
        documentRef: {
          getSelection: () => ({
            rangeCount: 1,
            isCollapsed: true,
            toString: () => "Ignored"
          })
        } as unknown as Document,
        windowRef: {} as Window
      })
    ).toBeNull();
  });

  it("reads current DOM selection text", () => {
    expect(
      readDomSelectedText({
        documentRef: {
          getSelection: () => ({
            rangeCount: 1,
            isCollapsed: false,
            toString: () => " Selected   browser text "
          })
        } as unknown as Document,
        windowRef: {} as Window
      })
    ).toBe("Selected browser text");
  });
});
