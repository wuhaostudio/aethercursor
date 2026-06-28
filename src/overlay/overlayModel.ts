import type { CursorState, CursorStatus, SelectionDraft, SelectionShapeMode } from "../cursor/stateMachine";
import { createSelectionRegion } from "../selection/selectionGeometry";
import type { SelectionPoint } from "../selection/selectionGeometry";

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
  readonly selectionMode: SelectionShapeMode | null;
  readonly selectionPath: readonly SelectionPoint[];
  readonly showCursorRing: boolean;
  readonly showTargetHint: boolean;
  readonly showActivity: boolean;
}

const labels: Record<CursorStatus, string> = {
  normal: "",
  armed: "已激活",
  smart_cursor: "智能光标",
  inspecting: "检测中",
  selecting: "选择中",
  resolving: "解析中",
  action_pending: "待选择",
  confirming: "待确认",
  thinking: "思考中",
  result: "结果",
  error: "错误"
};

export function createOverlayViewModel(state: CursorState): OverlayViewModel {
  const visible = state.status !== "normal";

  return {
    visible,
    status: state.status,
    label: labels[state.status],
    selectionBox: state.selection_shape ? toShapeSelectionBox(state.selection_shape) : state.selection ? toSelectionBox(state.selection) : null,
    selectionMode: state.selection_shape?.mode ?? null,
    selectionPath: state.selection_shape?.path ?? [],
    showCursorRing: state.status === "armed" || state.status === "smart_cursor" || state.status === "inspecting",
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

function toShapeSelectionBox(shape: NonNullable<CursorState["selection_shape"]>): OverlaySelectionBox {
  return {
    left: shape.bounds.x,
    top: shape.bounds.y,
    width: shape.bounds.width,
    height: shape.bounds.height
  };
}
