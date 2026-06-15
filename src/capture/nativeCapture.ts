import { invoke } from "@tauri-apps/api/core";
import type { ContextProtocol } from "../shared/context";

export interface NativeCaptureArtifact {
  readonly context_id: string;
  readonly image_ref: string;
  readonly file_path: string;
  readonly width: number;
  readonly height: number;
}

export async function captureNativeRegion(context: ContextProtocol): Promise<NativeCaptureArtifact | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  return invoke<NativeCaptureArtifact>("capture_region", {
    request: {
      context_id: context.context_id,
      x: Math.round(context.selection.bounds.x),
      y: Math.round(context.selection.bounds.y),
      width: Math.round(context.selection.bounds.width),
      height: Math.round(context.selection.bounds.height)
    }
  });
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
