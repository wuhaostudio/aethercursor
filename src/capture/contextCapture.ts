import type { SelectionDraft } from "../cursor/stateMachine";
import { createSelectionRegion } from "../selection/selectionGeometry";
import type { ContextProtocol, ContextSource } from "../shared/context";

export interface CaptureContextOptions {
  readonly selection: SelectionDraft;
  readonly source?: Partial<ContextSource>;
  readonly displayScale?: number;
  readonly selectedText?: string | null;
  readonly ocrText?: string | null;
  readonly contentGuess?: readonly string[];
  readonly confidence?: number;
  readonly now?: () => Date;
  readonly createContextId?: () => string;
  readonly createImageRef?: (contextId: string) => string | null;
}

export interface CaptureCleanupRequest {
  readonly image_ref: string;
}

const defaultSource: ContextSource = {
  app_name: "AetherCursor",
  window_title: "AetherCursor Debug Window",
  url: null
};

export function createContextFromSelection(options: CaptureContextOptions): ContextProtocol {
  const contextId = options.createContextId?.() ?? createDefaultContextId();
  const region = createSelectionRegion(
    {
      x: options.selection.start_x,
      y: options.selection.start_y
    },
    {
      x: options.selection.current_x,
      y: options.selection.current_y
    }
  );

  return {
    context_id: contextId,
    created_at: (options.now?.() ?? new Date()).toISOString(),
    source: {
      ...defaultSource,
      ...options.source
    },
    selection: {
      type: "screen_region",
      bounds: {
        x: region.left,
        y: region.top,
        width: region.width,
        height: region.height
      },
      display_scale: options.displayScale ?? getDefaultDisplayScale()
    },
    content: {
      selected_text: options.selectedText ?? null,
      ocr_text: options.ocrText ?? null,
      image_ref: options.createImageRef?.(contextId) ?? createLocalCaptureImageRef(contextId)
    },
    metadata: {
      language: "auto",
      content_guess: options.contentGuess ?? inferContentGuess(options),
      confidence: options.confidence ?? inferConfidence(options)
    },
    privacy: {
      cloud_allowed: false,
      contains_sensitive_guess: false,
      user_confirmed_upload: false
    }
  };
}

export function createLocalCaptureImageRef(contextId: string): string {
  return `local://capture/${contextId}.png`;
}

export function createCaptureCleanupRequest(context: ContextProtocol): CaptureCleanupRequest | null {
  if (!context.content.image_ref) {
    return null;
  }

  return {
    image_ref: context.content.image_ref
  };
}

function createDefaultContextId(): string {
  const randomId = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

  return `ctx_${randomId}`;
}

function getDefaultDisplayScale(): number {
  return globalThis.devicePixelRatio || 1;
}

function inferContentGuess(options: CaptureContextOptions): readonly string[] {
  if (options.selectedText || options.ocrText) {
    return ["text", "image"];
  }

  return ["image"];
}

function inferConfidence(options: CaptureContextOptions): number {
  if (options.selectedText || options.ocrText) {
    return 0.72;
  }

  return 0.35;
}
