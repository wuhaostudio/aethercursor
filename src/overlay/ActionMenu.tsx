import type { CSSProperties } from "react";
import type { RoutedAgent } from "../agents/agentRegistry";
import type { OverlaySelectionBox } from "./overlayModel";

interface ActionMenuProps {
  readonly selectionBox: OverlaySelectionBox;
  readonly actions: readonly RoutedAgent[];
  readonly onSelect: (action: RoutedAgent) => void;
}

export function ActionMenu({ selectionBox, actions, onSelect }: ActionMenuProps) {
  return (
    <div className="action-menu" style={positionMenu(selectionBox)} aria-label="Action menu">
      {actions.map((action) => (
        <button
          key={`${action.intent}:${action.manifest.id}`}
          type="button"
          title={action.manifest.name}
          onClick={() => onSelect(action)}
        >
          {formatIntent(action.intent)}
          {formatPolicyStatus(action)}
        </button>
      ))}
    </div>
  );
}

function positionMenu(selectionBox: OverlaySelectionBox): CSSProperties {
  return {
    left: `${selectionBox.left}px`,
    top: `${selectionBox.top + selectionBox.height + 10}px`
  };
}

function formatIntent(intent: string): string {
  return intent
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatPolicyStatus(action: RoutedAgent): string {
  if (action.policy_decision.status === "block") {
    return " Blocked";
  }

  if (action.requires_confirmation) {
    return " Cloud";
  }

  return "";
}
