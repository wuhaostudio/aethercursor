import type { CSSProperties } from "react";
import type { RoutedAgent } from "../agents/agentRegistry";
import type { OverlaySelectionBox } from "./overlayModel";

interface PermissionPromptProps {
  readonly selectionBox: OverlaySelectionBox | null;
  readonly action: RoutedAgent;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function PermissionPrompt({ selectionBox, action, onConfirm, onCancel }: PermissionPromptProps) {
  return (
    <section className="permission-prompt" style={positionPrompt(selectionBox)} aria-label="Permission prompt">
      <header>
        <span>Cloud Permission</span>
        <small>Level {action.policy_decision.privacy_level}</small>
      </header>
      <p>{action.manifest.name} needs cloud processing for {formatIntent(action.intent)}.</p>
      <p className="permission-prompt__reason">{action.policy_decision.reason}</p>
      <div className="permission-prompt__actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </section>
  );
}

function positionPrompt(selectionBox: OverlaySelectionBox | null): CSSProperties {
  if (!selectionBox) {
    return {
      left: "24px",
      top: "64px"
    };
  }

  return {
    left: `${selectionBox.left}px`,
    top: `${selectionBox.top + selectionBox.height + 12}px`
  };
}

function formatIntent(intent: string): string {
  return intent
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
