import type { CursorState } from "../cursor/stateMachine";
import type { RoutedAgent } from "../agents/agentRegistry";
import type { ContextProtocol } from "../shared/context";
import type { AgentResult } from "../shared/result";
import { ActionMenu } from "./ActionMenu";
import { PermissionPrompt } from "./PermissionPrompt";
import { ResultCanvas } from "./ResultCanvas";
import { SelectionLayer } from "../selection/SelectionLayer";
import { createOverlayCssVariables } from "./tokens";
import { createOverlayViewModel } from "./overlayModel";
import "./OverlayRoot.css";

interface OverlayRootProps {
  readonly state: CursorState;
  readonly context?: ContextProtocol | null;
  readonly result?: AgentResult | null;
  readonly actions?: readonly RoutedAgent[];
  readonly pendingAction?: RoutedAgent | null;
  readonly moreAgentsOpen?: boolean;
  readonly moreAgents?: readonly RoutedAgent[];
  readonly errorMessage?: string | null;
  readonly isReading?: boolean;
  readonly isReadingPaused?: boolean;
  readonly preview?: boolean;
  readonly onActionSelect?: (action: RoutedAgent) => void;
  readonly onPermissionConfirm?: () => void;
  readonly onPermissionCancel?: () => void;
  readonly onReadAloud?: () => void;
  readonly onCopyResult?: () => void;
  readonly onPinResult?: () => void;
  readonly onSwitchAgent?: () => void;
  readonly onMoreAgents?: () => void;
  readonly onSelectAgent?: (agent: RoutedAgent) => void;
  readonly onCloseResult?: () => void;
}

export function OverlayRoot({
  state,
  context = null,
  result = null,
  actions = [],
  pendingAction = null,
  moreAgentsOpen = false,
  moreAgents = [],
  errorMessage = null,
  isReading = false,
  isReadingPaused = false,
  preview = false,
  onActionSelect,
  onPermissionConfirm,
  onPermissionCancel,
  onReadAloud,
  onCopyResult,
  onPinResult,
  onSwitchAgent,
  onMoreAgents,
  onSelectAgent,
  onCloseResult
}: OverlayRootProps) {
  const model = createOverlayViewModel(state);

  if (!model.visible) {
    return null;
  }

  const rootClassName = preview ? "overlay-root overlay-root--preview" : "overlay-root";

  return (
    <div className={rootClassName} data-status={model.status} style={createOverlayCssVariables()}>
      {model.showCursorRing ? <div className="overlay-cursor-ring" aria-hidden="true" /> : null}
      <div className="overlay-mode-pill">{model.label}</div>
      {model.showTargetHint ? <div className="overlay-target-hint">Text</div> : null}
      {model.selectionBox ? (
        <SelectionLayer region={model.selectionBox} active={model.showActivity} />
      ) : null}
      {state.status === "action_pending" && model.selectionBox && onActionSelect ? (
        <ActionMenu selectionBox={model.selectionBox} actions={actions} onSelect={onActionSelect} />
      ) : null}
      {state.status === "confirming" && pendingAction && !preview ? (
        <PermissionPrompt
          selectionBox={model.selectionBox}
          action={pendingAction}
          onConfirm={onPermissionConfirm ?? noop}
          onCancel={onPermissionCancel ?? noop}
        />
      ) : null}
      {(state.status === "result" || state.status === "error") && !preview ? (
        <ResultCanvas
          selectionBox={model.selectionBox}
          context={context}
          result={result}
          errorMessage={errorMessage}
          moreAgentsOpen={moreAgentsOpen}
          moreAgents={moreAgents}
          isReading={isReading}
          isReadingPaused={isReadingPaused}
          onReadAloud={onReadAloud ?? noop}
          onCopy={onCopyResult ?? noop}
          onPin={onPinResult ?? noop}
          onSwitchAgent={onSwitchAgent ?? noop}
          onMoreAgents={onMoreAgents ?? noop}
          onSelectAgent={onSelectAgent ?? noop}
          onClose={onCloseResult ?? noop}
        />
      ) : null}
    </div>
  );
}

function noop() {}
