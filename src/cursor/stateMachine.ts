import type { Intent } from "../shared/agent";

export const cursorStatuses = [
  "normal",
  "armed",
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

export interface CursorState {
  readonly status: CursorStatus;
  readonly selection?: SelectionDraft;
  readonly intent?: Intent;
  readonly agent_id?: string;
  readonly result_id?: string;
  readonly error?: string;
}

export type CursorEvent =
  | { readonly type: "activation.pressed" }
  | { readonly type: "activation.released" }
  | { readonly type: "pointer.down"; readonly x: number; readonly y: number }
  | { readonly type: "pointer.move"; readonly x: number; readonly y: number }
  | { readonly type: "pointer.up"; readonly x: number; readonly y: number; readonly valid_selection: boolean }
  | { readonly type: "selection.drag.started"; readonly x: number; readonly y: number }
  | { readonly type: "selection.drag.updated"; readonly x: number; readonly y: number }
  | { readonly type: "selection.drag.completed"; readonly x: number; readonly y: number; readonly valid_selection: boolean }
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
    return { status: "armed" };
  }

  return initialCursorState;
}

function reduceArmed(event: CursorEvent): CursorState {
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
      }
    };
  }

  return { status: "armed" };
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
      }
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

  if (event.type === "pointer.move" || event.type === "selection.drag.updated") {
    return {
      ...state,
      selection: updateSelection(state.selection, event.x, event.y)
    };
  }

  if (event.type === "pointer.up" || event.type === "selection.drag.completed") {
    if (!event.valid_selection) {
      return { status: "armed" };
    }

    return {
      status: "resolving",
      selection: updateSelection(state.selection, event.x, event.y)
    };
  }

  return state;
}

function reduceResolving(state: CursorState, event: CursorEvent): CursorState {
  if (event.type === "context.resolved") {
    return {
      status: "action_pending",
      selection: state.selection
    };
  }

  if (event.type === "agent.failed") {
    return {
      status: "error",
      error: event.message
    };
  }

  return state;
}

function reduceActionPending(state: CursorState, event: CursorEvent): CursorState {
  if (event.type === "action.selected") {
    const nextState = {
      selection: state.selection,
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
      selection: state.selection
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
      selection: state.selection
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
