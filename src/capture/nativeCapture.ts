import { invoke } from "@tauri-apps/api/core";
import type { ContextProtocol } from "../shared/context";

export interface NativeCaptureArtifact {
  readonly context_id: string;
  readonly image_ref: string;
  readonly file_path: string;
  readonly width: number;
  readonly height: number;
}

export interface ReadCaptureFileResult {
  readonly context_id: string;
  readonly data_base64: string;
  readonly file_path: string;
  readonly size_bytes: number;
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

export async function readCaptureFile(contextId: string): Promise<ReadCaptureFileResult | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  return invoke<ReadCaptureFileResult>("read_capture_file", {
    request: {
      context_id: contextId
    }
  });
}

export async function readCaptureFileAsBlob(contextId: string): Promise<Blob | null> {
  const result = await readCaptureFile(contextId);

  if (!result) {
    return null;
  }

  const binary = atob(result.data_base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: "image/bmp" });
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
