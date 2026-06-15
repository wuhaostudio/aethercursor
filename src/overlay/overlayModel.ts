import type { CursorState, CursorStatus, SelectionDraft } from "../cursor/stateMachine";
import { createSelectionRegion } from "../selection/selectionGeometry";

export interface OverlaySelectionBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface OverlayViewModel {
  readonly visible: boolean;
  readonly status: CursorStatus;
  readonly label: string;
  readonly selectionBox: OverlaySelectionBox | null;
  readonly showCursorRing: boolean;
  readonly showTargetHint: boolean;
  readonly showActivity: boolean;
}

const labels: Record<CursorStatus, string> = {
  normal: "",
  armed: "Armed",
  inspecting: "Inspecting",
  selecting: "Selecting",
  resolving: "Resolving",
  action_pending: "Action pending",
  confirming: "Confirming",
  thinking: "Thinking",
  result: "Result",
  error: "Error"
};

export function createOverlayViewModel(state: CursorState): OverlayViewModel {
  const visible = state.status !== "normal";

  return {
    visible,
    status: state.status,
    label: labels[state.status],
    selectionBox: state.selection ? toSelectionBox(state.selection) : null,
    showCursorRing: state.status === "armed" || state.status === "inspecting",
    showTargetHint: state.status === "inspecting",
    showActivity: state.status === "resolving" || state.status === "thinking"
  };
}

export function toSelectionBox(selection: SelectionDraft): OverlaySelectionBox {
  return createSelectionRegion(
    {
      x: selection.start_x,
      y: selection.start_y
    },
    {
      x: selection.current_x,
      y: selection.current_y
    }
  );
}
