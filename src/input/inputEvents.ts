import type { CursorEvent } from "../cursor/stateMachine";
import { isSelectionValid } from "../selection/selectionGeometry";

export interface PointerPosition {
  readonly x: number;
  readonly y: number;
}

export interface InputSession {
  readonly altActive: boolean;
  readonly pointerDown: PointerPosition | null;
  readonly lastPointer: PointerPosition | null;
}

export const initialInputSession: InputSession = {
  altActive: false,
  pointerDown: null,
  lastPointer: null
};

export interface InputTransition {
  readonly session: InputSession;
  readonly event: CursorEvent | null;
  readonly logType: string;
}

export type InputKey = "Alt" | "Escape" | string;

export function handleKeyDown(session: InputSession, key: InputKey): InputTransition {
  if (key === "Escape") {
    return {
      session,
      event: { type: "cancel" },
      logType: "key.escape"
    };
  }

  if (key === "Alt" && !session.altActive) {
    return {
      session: {
        ...session,
        altActive: true
      },
      event: { type: "activation.pressed" },
      logType: "activation.pressed"
    };
  }

  return {
    session,
    event: null,
    logType: "key.ignored"
  };
}

export function handleKeyUp(session: InputSession, key: InputKey): InputTransition {
  if (key === "Alt" && session.altActive) {
    return {
      session: {
        ...session,
        altActive: false,
        pointerDown: null
      },
      event: { type: "activation.released" },
      logType: "activation.released"
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
  if (!session.altActive) {
    return {
      session: {
        ...session,
        lastPointer: position
      },
      event: null,
      logType: "pointer.down.ignored"
    };
  }

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
  if (!session.altActive) {
    return {
      session: {
        ...session,
        lastPointer: position
      },
      event: null,
      logType: "pointer.move.ignored"
    };
  }

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
  if (!session.altActive || !session.pointerDown) {
    return {
      session: {
        ...session,
        pointerDown: null,
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
