import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriRuntime } from "../capture/nativeCapture";

export type DesktopWindowRole = "main" | "overlay" | "browser";

export interface OverlayWindowStatus {
  readonly label: string;
  readonly visible: boolean;
  readonly metrics?: OverlayWindowMetrics | null;
}

export interface OverlayWindowMetrics {
  readonly origin_x: number;
  readonly origin_y: number;
  readonly width: number;
  readonly height: number;
  readonly scale_factor: number;
}

export function getDesktopWindowRole(): DesktopWindowRole {
  if (!isTauriRuntime()) {
    return "browser";
  }

  return getCurrentWebviewWindow().label === "overlay" ? "overlay" : "main";
}

export async function showDesktopOverlay(): Promise<OverlayWindowStatus | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  return invoke<OverlayWindowStatus>("show_overlay_window");
}

export async function hideDesktopOverlay(): Promise<OverlayWindowStatus | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  return invoke<OverlayWindowStatus>("hide_overlay_window");
}

export async function getDesktopOverlayMetrics(
  cursor?: { readonly x: number; readonly y: number } | null
): Promise<OverlayWindowMetrics | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  return invoke<OverlayWindowMetrics>("get_overlay_window_metrics", {
    request: {
      cursor_x: cursor?.x ?? null,
      cursor_y: cursor?.y ?? null
    }
  });
}
