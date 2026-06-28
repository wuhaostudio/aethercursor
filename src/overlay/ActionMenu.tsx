import type { RoutedAgent } from "../agents/agentRegistry";
import type { OverlaySelectionBox } from "./overlayModel";
import { positionFloatingNearSelection } from "./floatingPosition";

interface ActionMenuProps {
  readonly selectionBox: OverlaySelectionBox;
  readonly actions: readonly RoutedAgent[];
  readonly onSelect: (action: RoutedAgent) => void;
}

export function ActionMenu({ selectionBox, actions, onSelect }: ActionMenuProps) {
  return (
    <div
      className="action-menu"
      style={positionFloatingNearSelection(selectionBox, { width: 360, height: 52 })}
      aria-label="Action menu"
    >
      {actions.length > 0 ? (
        actions.map((action) => (
          <button
            key={`${action.intent}:${action.manifest.id}`}
            type="button"
            title={action.manifest.name}
            onClick={() => onSelect(action)}
          >
            {formatIntent(action.intent)}
            {formatPolicyStatus(action)}
          </button>
        ))
      ) : (
        <span className="action-menu__empty">未启用可用能力</span>
      )}
    </div>
  );
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
