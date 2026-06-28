import type { RoutedAgent } from "../agents/agentRegistry";
import type { OverlaySelectionBox } from "./overlayModel";
import { positionFloatingNearSelection } from "./floatingPosition";

interface PermissionPromptProps {
  readonly selectionBox: OverlaySelectionBox | null;
  readonly action: RoutedAgent;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function PermissionPrompt({ selectionBox, action, onConfirm, onCancel }: PermissionPromptProps) {
  return (
    <section
      className="permission-prompt"
      style={positionFloatingNearSelection(selectionBox, { width: 340, height: 180 })}
      aria-label="权限提示"
    >
      <header>
        <span>云端权限</span>
        <small>级别 {action.policy_decision.privacy_level}</small>
      </header>
      <p>{action.manifest.name} 需要云端处理以执行{formatIntent(action.intent)}。</p>
      <p className="permission-prompt__reason">{action.policy_decision.reason}</p>
      <div className="permission-prompt__actions">
        <button type="button" onClick={onCancel}>
          取消
        </button>
        <button type="button" onClick={onConfirm}>
          确认
        </button>
      </div>
    </section>
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
