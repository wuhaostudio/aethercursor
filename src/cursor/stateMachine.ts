import type { Intent } from "../shared/agent";
import { createLassoBounds, isLassoPathValid } from "../selection/lassoGeometry";

export const cursorStatuses = [
  "normal",
  "armed",
  "smart_cursor",
  "inspecting",
  "selecting",
  "resolving",
  "action_pending",
  "confirming",
  "thinking",
  "result",
  "error"
] as const;

export type CursorStatus = (typeof cursorStatuses)[number];

export interface SelectionDraft {
  readonly start_x: number;
  readonly start_y: number;
  readonly current_x: number;
  readonly current_y: number;
}

export type SelectionShapeMode = "focus" | "rect" | "lasso" | "object_snap";

export interface SelectionShapePoint {
  readonly x: number;
  readonly y: number;
}

export interface SelectionShape {
  readonly mode: SelectionShapeMode;
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly path?: readonly SelectionShapePoint[];
  readonly confidence?: number;
}

export interface CursorState {
  readonly status: CursorStatus;
  readonly selection?: SelectionDraft;
  readonly selection_shape?: SelectionShape;
  readonly intent?: Intent;
  readonly agent_id?: string;
  readonly result_id?: string;
  readonly error?: string;
}

export const FOCUS_SELECTION_WIDTH = 20;
export const FOCUS_SELECTION_HEIGHT = 15;

export type CursorEvent =
  | { readonly type: "activation.pressed"; readonly x?: number; readonly y?: number }
  | { readonly type: "activation.released" }
  | { readonly type: "pointer.down"; readonly x: number; readonly y: number }
  | { readonly type: "pointer.move"; readonly x: number; readonly y: number }
  | { readonly type: "pointer.up"; readonly x: number; readonly y: number; readonly valid_selection: boolean }
  | { readonly type: "selection.drag.started"; readonly x: number; readonly y: number }
  | { readonly type: "selection.drag.updated"; readonly x: number; readonly y: number }
  | { readonly type: "selection.drag.completed"; readonly x: number; readonly y: number; readonly valid_selection: boolean }
  | { readonly type: "selection.confirmed" }
  | { readonly type: "selection.mode.next" }
  | { readonly type: "selection.lasso.started"; readonly x: number; readonly y: number }
  | { readonly type: "selection.lasso.updated"; readonly x: number; readonly y: number }
  | { readonly type: "selection.lasso.completed"; readonly x: number; readonly y: number }
  | { readonly type: "context.resolved" }
  | { readonly type: "action.selected"; readonly intent: Intent; readonly agent_id?: string; readonly requires_confirmation: boolean }
  | { readonly type: "policy.blocked"; readonly message: string }
  | { readonly type: "permission.granted" }
  | { readonly type: "permission.denied" }
  | { readonly type: "agent.started" }
  | { readonly type: "agent.succeeded"; readonly result_id: string }
  | { readonly type: "agent.failed"; readonly message: string }
  | { readonly type: "agent.switch_requested" }
  | { readonly type: "result.closed" }
  | { readonly type: "cancel" };

export const initialCursorState: CursorState = {
  status: "normal"
};

export function cursorReducer(state: CursorState, event: CursorEvent): CursorState {
  if (event.type === "cancel") {
    return initialCursorState;
  }

  switch (state.status) {
    case "normal":
      return reduceNormal(event);
    case "armed":
      return reduceArmed(event);
    case "smart_cursor":
      return reduceSmartCursor(state, event);
    case "inspecting":
      return reduceInspecting(state, event);
    case "selecting":
      return reduceSelecting(state, event);
    case "resolving":
      return reduceResolving(state, event);
    case "action_pending":
      return reduceActionPending(state, event);
    case "confirming":
      return reduceConfirming(state, event);
    case "thinking":
      return reduceThinking(state, event);
    case "result":
      return reduceResult(state, event);
    case "error":
      return reduceError(state, event);
    default:
      return state;
  }
}

function reduceNormal(event: CursorEvent): CursorState {
  if (event.type === "activation.pressed") {
    return createSmartCursorState(event.x ?? 0, event.y ?? 0);
  }

  return initialCursorState;
}

function reduceArmed(event: CursorEvent): CursorState {
  if (event.type === "activation.pressed") {
    return createSmartCursorState(event.x ?? 0, event.y ?? 0);
  }

  if (event.type === "activation.released") {
    return initialCursorState;
  }

  if (event.type === "pointer.move") {
    return { status: "inspecting" };
  }

  if (event.type === "pointer.down" || event.type === "selection.drag.started") {
    return {
      status: "selecting",
      selection: {
        start_x: event.x,
        start_y: event.y,
        current_x: event.x,
        current_y: event.y
      },
      selection_shape: createRectSelectionShape(event.x, event.y, event.x, event.y)
    };
  }

  return { status: "armed" };
}

function reduceSmartCursor(state: CursorState, event: CursorEvent): CursorState {
  if (event.type === "activation.released") {
    return state;
  }

  if (event.type === "pointer.move") {
    return createSmartCursorState(event.x, event.y);
  }

  if (event.type === "selection.mode.next") {
    return cycleSmartCursorSelectionMode(state);
  }

  if (event.type === "selection.confirmed") {
    return {
      status: "resolving",
      selection: state.selection,
      selection_shape: state.selection_shape
    };
  }

  if (event.type === "selection.lasso.started") {
    return createLassoSelectionState(event.x, event.y);
  }

  if (event.type === "pointer.down" || event.type === "selection.drag.started") {
    if (state.selection_shape?.mode === "lasso") {
      return createLassoSelectionState(event.x, event.y);
    }

    return {
      status: "selecting",
      selection: {
        start_x: event.x,
        start_y: event.y,
        current_x: event.x,
        current_y: event.y
      },
      selection_shape: createRectSelectionShape(event.x, event.y, event.x, event.y)
    };
  }

  return state;
}

function reduceInspecting(state: CursorState, event: CursorEvent): CursorState {
  if (event.type === "activation.released") {
    return initialCursorState;
  }

  if (event.type === "pointer.down" || event.type === "selection.drag.started") {
    return {
      status: "selecting",
      selection: {
        start_x: event.x,
        start_y: event.y,
        current_x: event.x,
        current_y: event.y
      },
      selection_shape: createRectSelectionShape(event.x, event.y, event.x, event.y)
    };
  }

  if (event.type === "pointer.move") {
    return state;
  }

  return state;
}

function reduceSelecting(state: CursorState, event: CursorEvent): CursorState {
  if (event.type === "activation.released") {
    return initialCursorState;
  }

  if (event.type === "selection.lasso.updated") {
    return updateLassoSelectionState(state, event.x, event.y);
  }

  if (event.type === "selection.lasso.completed") {
    const nextState = updateLassoSelectionState(state, event.x, event.y);
    const path = nextState.selection_shape?.path ?? [];

    if (!isLassoPathValid(path)) {
      return createSmartCursorState(event.x, event.y);
    }

    return {
      status: "resolving",
      selection: nextState.selection,
      selection_shape: nextState.selection_shape
    };
  }

  if (event.type === "pointer.move" || event.type === "selection.drag.updated") {
    if (state.selection_shape?.mode === "lasso") {
      return updateLassoSelectionState(state, event.x, event.y);
    }

    const selection = updateSelection(state.selection, event.x, event.y);

    return {
      ...state,
      selection,
      selection_shape: createShapeFromSelection(selection)
    };
  }

  if (event.type === "pointer.up" || event.type === "selection.drag.completed") {
    if (state.selection_shape?.mode === "lasso") {
      const nextState = updateLassoSelectionState(state, event.x, event.y);
      const path = nextState.selection_shape?.path ?? [];

      if (!isLassoPathValid(path)) {
        return createSmartCursorState(event.x, event.y);
      }

      return {
        status: "resolving",
        selection: nextState.selection,
        selection_shape: nextState.selection_shape
      };
    }

    if (!event.valid_selection) {
      return { status: "armed" };
    }

    const selection = updateSelection(state.selection, event.x, event.y);

    return {
      status: "resolving",
      selection,
      selection_shape: createShapeFromSelection(selection)
    };
  }

  return state;
}

function reduceResolving(state: CursorState, event: CursorEvent): CursorState {
  if (event.type === "context.resolved") {
    return {
      status: "action_pending",
      selection: state.selection,
      selection_shape: state.selection_shape
    };
  }

  if (event.type === "agent.failed") {
    return {
      status: "error",
      selection: state.selection,
      selection_shape: state.selection_shape,
      error: event.message
    };
  }

  return state;
}

function reduceActionPending(state: CursorState, event: CursorEvent): CursorState {
  if (event.type === "action.selected") {
    const nextState = {
      selection: state.selection,
      selection_shape: state.selection_shape,
      intent: event.intent,
      agent_id: event.agent_id
    };

    if (event.requires_confirmation) {
      return {
        status: "confirming",
        ...nextState
      };
    }

    return {
      status: "thinking",
      ...nextState
    };
  }

  if (event.type === "policy.blocked") {
    return {
      status: "error",
      selection: state.selection,
      selection_shape: state.selection_shape,
      error: event.message
    };
  }

  if (event.type === "activation.released") {
    return state;
  }

  return state;
}

function reduceConfirming(state: CursorState, event: CursorEvent): CursorState {
  if (event.type === "permission.granted") {
    return {
      ...state,
      status: "thinking"
    };
  }

  if (event.type === "permission.denied") {
    return {
      status: "action_pending",
      selection: state.selection,
      selection_shape: state.selection_shape
    };
  }

  return state;
}

function reduceThinking(state: CursorState, event: CursorEvent): CursorState {
  if (event.type === "agent.succeeded") {
    return {
      ...state,
      status: "result",
      result_id: event.result_id
    };
  }

  if (event.type === "agent.failed") {
    return {
      ...state,
      status: "error",
      error: event.message
    };
  }

  return state;
}

function reduceResult(state: CursorState, event: CursorEvent): CursorState {
  if (event.type === "result.closed") {
    return initialCursorState;
  }

  if (event.type === "agent.switch_requested") {
    return {
      status: "action_pending",
      selection: state.selection,
      selection_shape: state.selection_shape
    };
  }

  return state;
}

function reduceError(state: CursorState, event: CursorEvent): CursorState {
  if (event.type === "result.closed" || event.type === "activation.released") {
    return initialCursorState;
  }

  return state;
}

function updateSelection(selection: SelectionDraft | undefined, x: number, y: number): SelectionDraft {
  if (!selection) {
    return {
      start_x: x,
      start_y: y,
      current_x: x,
      current_y: y
    };
  }

  return {
    ...selection,
    current_x: x,
    current_y: y
  };
}

function createSmartCursorState(x: number, y: number): CursorState {
  const left = x - FOCUS_SELECTION_WIDTH / 2;
  const top = y - FOCUS_SELECTION_HEIGHT / 2;

  return {
    status: "smart_cursor",
    selection: {
      start_x: left,
      start_y: top,
      current_x: left + FOCUS_SELECTION_WIDTH,
      current_y: top + FOCUS_SELECTION_HEIGHT
    },
    selection_shape: {
      mode: "focus",
      bounds: {
        x: left,
        y: top,
        width: FOCUS_SELECTION_WIDTH,
        height: FOCUS_SELECTION_HEIGHT
      },
      confidence: 0.5
    }
  };
}

function createRectSelectionShape(startX: number, startY: number, currentX: number, currentY: number): SelectionShape {
  return {
    mode: "rect",
    bounds: {
      x: Math.min(startX, currentX),
      y: Math.min(startY, currentY),
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY)
    },
    confidence: 1
  };
}

function createShapeFromSelection(selection: SelectionDraft): SelectionShape {
  return createRectSelectionShape(selection.start_x, selection.start_y, selection.current_x, selection.current_y);
}

function cycleSmartCursorSelectionMode(state: CursorState): CursorState {
  const currentMode = state.selection_shape?.mode ?? "focus";

  if (currentMode === "focus") {
    return createModePreviewState(state, "lasso");
  }

  if (currentMode === "lasso") {
    return createModePreviewState(state, "rect");
  }

  return createModePreviewState(state, "focus");
}

function createModePreviewState(state: CursorState, mode: SelectionShapeMode): CursorState {
  if (!state.selection || !state.selection_shape) {
    return state;
  }

  return {
    ...state,
    selection_shape: {
      ...state.selection_shape,
      mode,
      path: mode === "lasso" ? state.selection_shape.path : undefined,
      confidence: mode === "focus" ? 0.5 : 1
    }
  };
}

function createLassoSelectionState(x: number, y: number): CursorState {
  const path = [{ x, y }];

  return {
    status: "selecting",
    selection: {
      start_x: x,
      start_y: y,
      current_x: x,
      current_y: y
    },
    selection_shape: createLassoSelectionShape(path)
  };
}

function updateLassoSelectionState(state: CursorState, x: number, y: number): CursorState {
  const existingPath = state.selection_shape?.mode === "lasso" ? state.selection_shape.path ?? [] : [];
  const path = [...existingPath, { x, y }];
  const shape = createLassoSelectionShape(path);

  return {
    ...state,
    selection: {
      start_x: shape.bounds.x,
      start_y: shape.bounds.y,
      current_x: shape.bounds.x + shape.bounds.width,
      current_y: shape.bounds.y + shape.bounds.height
    },
    selection_shape: shape
  };
}

function createLassoSelectionShape(path: readonly SelectionShapePoint[]): SelectionShape {
  const bounds = createLassoBounds(path);

  return {
    mode: "lasso",
    bounds: {
      x: bounds.left,
      y: bounds.top,
      width: bounds.width,
      height: bounds.height
    },
    path,
    confidence: 1
  };
}
