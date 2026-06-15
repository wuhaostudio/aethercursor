import type { CSSProperties } from "react";
import type { AgentResult } from "../shared/result";
import type { ContextProtocol } from "../shared/context";
import type { OverlaySelectionBox } from "./overlayModel";

interface ResultCanvasProps {
  readonly selectionBox: OverlaySelectionBox | null;
  readonly context: ContextProtocol | null;
  readonly result: AgentResult | null;
  readonly errorMessage?: string | null;
  readonly moreAgentsOpen: boolean;
  readonly onReadAloud: () => void;
  readonly onCopy: () => void;
  readonly onPin: () => void;
  readonly onSwitchAgent: () => void;
  readonly onMoreAgents: () => void;
  readonly onClose: () => void;
}

export function ResultCanvas({
  selectionBox,
  context,
  result,
  errorMessage = null,
  moreAgentsOpen,
  onReadAloud,
  onCopy,
  onPin,
  onSwitchAgent,
  onMoreAgents,
  onClose
}: ResultCanvasProps) {
  const sourceText = context?.content.selected_text ?? context?.content.ocr_text ?? "Selected screen region";
  const translation = getOutputText(result, "translation");
  const explanation = getOutputText(result, "explanation");

  return (
    <section className="result-canvas" style={positionCanvas(selectionBox)} aria-label="Result canvas">
      <header className="result-canvas__header">
        <span>{errorMessage || (result && result.status !== "success") ? "Error" : "Result Canvas"}</span>
        <div className="result-canvas__tools" aria-label="Result tools">
          <button type="button" title="Read aloud" onClick={onReadAloud}>
            Read
          </button>
          <button type="button" title="Copy result" onClick={onCopy}>
            Copy
          </button>
          <button type="button" title="Pin result" onClick={onPin}>
            Pin
          </button>
          <button type="button" title="Switch agent" onClick={onSwitchAgent}>
            Agent
          </button>
          <button type="button" title="Close" onClick={onClose}>
            Close
          </button>
        </div>
      </header>
      {errorMessage ? (
        <div className="result-canvas__block result-canvas__block--error">
          <h3>Error</h3>
          <p>{errorMessage}</p>
        </div>
      ) : null}
      <div className="result-canvas__block">
        <h3>Source</h3>
        <p>{sourceText}</p>
      </div>
      <div className="result-canvas__block">
        <h3>Translation</h3>
        <p>{translation ?? "Mock translation for the selected region."}</p>
      </div>
      <div className="result-canvas__block">
        <h3>Explanation</h3>
        <p>{explanation ?? result?.output.text ?? "Mock explanation for the selected region."}</p>
      </div>
      <footer className="result-canvas__footer">
        <button type="button" onClick={onMoreAgents}>
          More agents
        </button>
        {moreAgentsOpen ? (
          <div className="result-canvas__more" aria-label="More compatible agents">
            <button type="button" onClick={onSwitchAgent}>
              Deep explain
            </button>
            <button type="button" onClick={onSwitchAgent}>
              Table extract
            </button>
            <button type="button" onClick={onSwitchAgent}>
              Vision analyze
            </button>
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
