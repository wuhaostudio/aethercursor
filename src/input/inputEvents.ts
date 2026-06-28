import type { CursorEvent } from "../cursor/stateMachine";
import { isSelectionValid } from "../selection/selectionGeometry";

export interface PointerPosition {
  readonly x: number;
  readonly y: number;
}

export interface InputSession {
  readonly pointerDown: PointerPosition | null;
  readonly lastPointer: PointerPosition | null;
}

export const initialInputSession: InputSession = {
  pointerDown: null,
  lastPointer: null
};

export interface InputTransition {
  readonly session: InputSession;
  readonly event: CursorEvent | null;
  readonly logType: string;
}

export type InputKey = "Escape" | string;

export function handleKeyDown(session: InputSession, key: InputKey): InputTransition {
  if (key === "Escape") {
    return {
      session,
      event: { type: "cancel" },
      logType: "key.escape"
    };
  }

  if (key === "Alt") {
    return {
      session,
      event: {
        type: "activation.pressed",
        x: session.lastPointer?.x,
        y: session.lastPointer?.y
      },
      logType: "key.alt.down"
    };
  }

  if (key === "Enter") {
    return {
      session,
      event: { type: "selection.confirmed" },
      logType: "key.enter"
    };
  }

  if (key === "Tab") {
    return {
      session,
      event: { type: "selection.mode.next" },
      logType: "key.tab"
    };
  }

  return {
    session,
    event: null,
    logType: "key.ignored"
  };
}

export function handleKeyUp(session: InputSession, key: InputKey): InputTransition {
  if (key === "Alt") {
    return {
      session,
      event: { type: "activation.released" },
      logType: "key.alt.up"
    };
  }

  return {
    session,
    event: null,
    logType: "key.ignored"
  };
}

export function handlePointerDown(
  session: InputSession,
  position: PointerPosition
): InputTransition {
  return {
    session: {
      ...session,
      pointerDown: position,
      lastPointer: position
    },
    event: {
      type: "pointer.down",
      x: position.x,
      y: position.y
    },
    logType: "pointer.down"
  };
}

export function handlePointerMove(
  session: InputSession,
  position: PointerPosition
): InputTransition {
  return {
    session: {
      ...session,
      lastPointer: position
    },
    event: {
      type: "pointer.move",
      x: position.x,
      y: position.y
    },
    logType: "pointer.move"
  };
}

export function handlePointerUp(
  session: InputSession,
  position: PointerPosition
): InputTransition {
  if (!session.pointerDown) {
    return {
      session: {
        ...session,
        lastPointer: position
      },
      event: null,
      logType: "pointer.up.ignored"
    };
  }

  const validSelection = isValidSelection(session.pointerDown, position);

  return {
    session: {
      ...session,
      pointerDown: null,
      lastPointer: position
    },
    event: {
      type: "pointer.up",
      x: position.x,
      y: position.y,
      valid_selection: validSelection
    },
    logType: validSelection ? "pointer.up" : "pointer.up.small"
  };
}

export function isValidSelection(start: PointerPosition, end: PointerPosition): boolean {
  return isSelectionValid(start, end);
}
