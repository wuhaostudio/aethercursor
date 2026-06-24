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
  const intentMap: Record<string, string> = {
    extract_text: "提取文字",
    explain: "解释",
    translate: "翻译",
    summarize: "总结",
    ask_ai: "问AI",
    send_to_agent: "发送到代理"
  };

  return intentMap[intent] ?? intent;
}

function formatPolicyStatus(action: RoutedAgent): string {
  if (action.policy_decision.status === "block") {
    return " · 已阻止";
  }

  if (action.requires_confirmation) {
    return " · 云端";
  }

  return "";
}
