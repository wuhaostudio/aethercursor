import type { CSSProperties } from "react";

export const overlayTokens = {
  background: "rgba(12, 18, 28, 0.58)",
  border: "rgba(120, 220, 255, 0.42)",
  highlight: "rgba(80, 210, 255, 0.86)",
  text: "rgba(245, 248, 255, 0.96)",
  mutedText: "rgba(210, 220, 235, 0.68)",
  blur: "18px",
  radiusPx: 8,
  shadow: "0 18px 48px rgba(0, 0, 0, 0.34)"
} as const;

export function createOverlayCssVariables(): CSSProperties {
  return {
    "--overlay-background": overlayTokens.background,
    "--overlay-border": overlayTokens.border,
    "--overlay-highlight": overlayTokens.highlight,
    "--overlay-text": overlayTokens.text,
    "--overlay-muted-text": overlayTokens.mutedText,
    "--overlay-blur": overlayTokens.blur,
    "--overlay-radius": `${overlayTokens.radiusPx}px`,
    "--overlay-shadow": overlayTokens.shadow
  } as CSSProperties;
}
