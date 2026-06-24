import type { CSSProperties } from "react";
import type { AgentResult } from "../shared/result";
import type { ContextProtocol } from "../shared/context";
import type { OverlaySelectionBox } from "./overlayModel";
import type { RoutedAgent } from "../agents/agentRegistry";

interface ResultCanvasProps {
  readonly selectionBox: OverlaySelectionBox | null;
  readonly context: ContextProtocol | null;
  readonly result: AgentResult | null;
  readonly errorMessage?: string | null;
  readonly moreAgentsOpen: boolean;
  readonly moreAgents: readonly RoutedAgent[];
  readonly isReading: boolean;
  readonly isReadingPaused: boolean;
  readonly onReadAloud: () => void;
  readonly onCopy: () => void;
  readonly onPin: () => void;
  readonly onSwitchAgent: () => void;
  readonly onMoreAgents: () => void;
  readonly onSelectAgent: (agent: RoutedAgent) => void;
  readonly onClose: () => void;
}

export function ResultCanvas({
  selectionBox,
  context,
  result,
  errorMessage = null,
  moreAgentsOpen,
  moreAgents,
  isReading,
  isReadingPaused,
  onReadAloud,
  onCopy,
  onPin,
  onSwitchAgent,
  onMoreAgents,
  onSelectAgent,
  onClose
}: ResultCanvasProps) {
  const sourceText = context?.content.selected_text ?? context?.content.ocr_text ?? "选中的屏幕区域";
  const translation = getOutputText(result, "translation");
  const explanation = getOutputText(result, "explanation");

  return (
    <section className="result-canvas" style={positionCanvas(selectionBox)} aria-label="结果画布">
      <header className="result-canvas__header">
        <span>{errorMessage || (result && result.status !== "success") ? "错误" : "结果画布"}</span>
        <div className="result-canvas__tools" aria-label="结果工具">
          <button type="button" title={isReadingPaused ? "继续朗读" : isReading ? "暂停朗读" : "朗读"} onClick={onReadAloud}>
            {isReadingPaused ? "继续" : isReading ? "暂停" : "朗读"}
          </button>
          <button type="button" title="复制结果" onClick={onCopy}>
            复制
          </button>
          <button type="button" title="固定结果" onClick={onPin}>
            固定
          </button>
          <button type="button" title="切换代理" onClick={onSwitchAgent}>
            代理
          </button>
          <button type="button" title="关闭" onClick={onClose}>
            关闭
          </button>
        </div>
      </header>
      {errorMessage ? (
        <div className="result-canvas__block result-canvas__block--error">
          <h3>错误</h3>
          <p>{errorMessage}</p>
        </div>
      ) : null}
      <div className="result-canvas__block">
        <h3>来源</h3>
        <p>{sourceText}</p>
      </div>
      <div className="result-canvas__block">
        <h3>翻译</h3>
        <p>{translation ?? "选中区域的翻译结果。"}</p>
      </div>
      <div className="result-canvas__block">
        <h3>解释</h3>
        <p>{explanation ?? result?.output.text ?? "选中区域的解释说明。"}</p>
      </div>
      <footer className="result-canvas__footer">
        <button type="button" onClick={onMoreAgents}>
          {moreAgentsOpen ? "收起代理" : "更多代理"}
        </button>
        {moreAgentsOpen ? (
          <div className="result-canvas__more" aria-label="更多兼容代理">
            {moreAgents.length > 0 ? (
              moreAgents.map((agent) => (
                <button
                  key={`${agent.manifest.id}:${agent.intent}`}
                  type="button"
                  onClick={() => onSelectAgent(agent)}
                >
                  {agent.manifest.name}
                </button>
              ))
            ) : (
              <p>暂无其他可用代理。</p>
            )}
          </div>
        ) : null}
      </footer>
    </section>
  );
}

function getOutputText(result: AgentResult | null, key: string): string | null {
  const value = result?.output[key];

  return typeof value === "string" && value.length > 0 ? value : null;
}

function positionCanvas(selectionBox: OverlaySelectionBox | null): CSSProperties {
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
