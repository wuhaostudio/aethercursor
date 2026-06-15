import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import "./App.css";
import {
  getAvailableAgentActions,
  loadBuiltInAgentManifests,
  type RoutedAgent
} from "./agents/agentRegistry";
import { createContextFromSelection } from "./capture/contextCapture";
import { captureNativeRegion } from "./capture/nativeCapture";
import { OverlayRoot } from "./overlay/OverlayRoot";
import { confirmCloudUpload } from "./policy/policy";
import { executeAgentRuntime } from "./runtime/agentRuntime";
import { cursorReducer, initialCursorState, type CursorEvent, type CursorState } from "./cursor/stateMachine";
import {
  handleKeyDown,
  handleKeyUp,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  initialInputSession,
  type InputSession,
  type InputTransition
} from "./input/inputEvents";
import { appendInputDebugLog, formatPointerDetail, type InputDebugEntry } from "./input/inputDebugLog";
import type { ContextProtocol } from "./shared/context";
import { phaseZeroModules } from "./shared/project";
import type { AgentResult } from "./shared/result";

const builtInAgentRegistry = loadBuiltInAgentManifests();

const overlayPreviewStates: readonly CursorState[] = [
  { status: "normal" },
  { status: "armed" },
  {
    status: "selecting",
    selection: {
      start_x: 72,
      start_y: 54,
      current_x: 284,
      current_y: 158
    }
  },
  {
    status: "thinking",
    selection: {
      start_x: 90,
      start_y: 70,
      current_x: 316,
      current_y: 176
    },
    intent: "explain",
    agent_id: "agent.text.explainer.basic"
  }
];

function App() {
  const [cursorState, dispatchCursorEvent] = useReducer(cursorReducer, initialCursorState);
  const inputSessionRef = useRef<InputSession>(initialInputSession);
  const lastResolvedSelectionKeyRef = useRef<string | null>(null);
  const lastRuntimeKeyRef = useRef<string | null>(null);
  const [inputSession, setInputSession] = useState<InputSession>(initialInputSession);
  const [inputLog, setInputLog] = useState<readonly InputDebugEntry[]>([]);
  const [latestContext, setLatestContext] = useState<ContextProtocol | null>(null);
  const [latestResult, setLatestResult] = useState<AgentResult | null>(null);
  const [pinnedResults, setPinnedResults] = useState<readonly AgentResult[]>([]);
  const [nativeCapturePath, setNativeCapturePath] = useState<string | null>(null);
  const [moreAgentsOpen, setMoreAgentsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<RoutedAgent | null>(null);
  const availableActions = latestContext
    ? getAvailableAgentActions(builtInAgentRegistry.manifests, latestContext)
    : [];

  const commitTransition = useCallback((transition: InputTransition, detail: string) => {
    inputSessionRef.current = transition.session;
    setInputSession(transition.session);
    setInputLog((entries) =>
      appendInputDebugLog(entries, {
        type: transition.logType,
        detail
      })
    );

    if (transition.event) {
      dispatchCursorEvent(transition.event);
    }
  }, []);

  const dispatchSyntheticEvent = useCallback((event: CursorEvent, type: string, detail: string) => {
    setInputLog((entries) => appendInputDebugLog(entries, { type, detail }));
    dispatchCursorEvent(event);
  }, []);

  const handleActionSelect = useCallback((action: RoutedAgent) => {
    setMoreAgentsOpen(false);
    setPendingAction(action);
    setLatestResult(null);
    setInputLog((entries) =>
      appendInputDebugLog(entries, {
        type: "action.selected",
        detail: `${action.intent}:${action.manifest.id}`
      })
    );

    if (action.policy_decision.status === "block") {
      dispatchCursorEvent({
        type: "policy.blocked",
        message: action.policy_decision.reason
      });
      return;
    }

    dispatchCursorEvent({
      type: "action.selected",
      intent: action.intent,
      agent_id: action.manifest.id,
      requires_confirmation: action.policy_decision.requires_confirmation
    });
  }, []);

  const handlePermissionConfirm = useCallback(() => {
    setLatestContext((context) => (context ? confirmCloudUpload(context) : context));
    setInputLog((entries) => appendInputDebugLog(entries, { type: "permission.granted", detail: "cloud_upload" }));
    dispatchCursorEvent({ type: "permission.granted" });
  }, []);

  const handlePermissionCancel = useCallback(() => {
    setPendingAction(null);
    setInputLog((entries) => appendInputDebugLog(entries, { type: "permission.denied", detail: "cloud_upload" }));
    dispatchCursorEvent({ type: "permission.denied" });
  }, []);

  const handleReadAloud = useCallback(() => {
    setInputLog((entries) => appendInputDebugLog(entries, { type: "result.read_aloud", detail: "mock" }));
  }, []);

  const handleCopyResult = useCallback(() => {
    const text = latestResult?.output.text ?? latestContext?.content.ocr_text ?? latestContext?.content.selected_text;

    if (!text) {
      setInputLog((entries) => appendInputDebugLog(entries, { type: "result.copy.skipped", detail: "empty" }));
      return;
    }

    void navigator.clipboard?.writeText(text).catch(() => {
      setInputLog((entries) => appendInputDebugLog(entries, { type: "result.copy.failed", detail: "clipboard" }));
    });
    setInputLog((entries) => appendInputDebugLog(entries, { type: "result.copy", detail: "text" }));
  }, [latestContext, latestResult]);

  const handlePinResult = useCallback(() => {
    if (latestResult) {
      setPinnedResults((results) =>
        results.some((result) => result.result_id === latestResult.result_id)
          ? results
          : [latestResult, ...results].slice(0, 5)
      );
    }

    setInputLog((entries) => appendInputDebugLog(entries, { type: "result.pin", detail: "session" }));
  }, [latestResult]);

  const handleSwitchAgent = useCallback(() => {
    setMoreAgentsOpen(false);
    setLatestResult(null);
    setPendingAction(null);
    setInputLog((entries) => appendInputDebugLog(entries, { type: "result.switch_agent", detail: "action_menu" }));
    dispatchCursorEvent({ type: "agent.switch_requested" });
  }, []);

  const handleMoreAgents = useCallback(() => {
    setMoreAgentsOpen((open) => !open);
    setInputLog((entries) => appendInputDebugLog(entries, { type: "result.more_agents", detail: "toggle" }));
  }, []);

  const handleCloseResult = useCallback(() => {
    setMoreAgentsOpen(false);
    setPendingAction(null);
    dispatchCursorEvent({ type: "result.closed" });
  }, []);

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Alt" || event.key === "Escape") {
        event.preventDefault();
      }

      commitTransition(handleKeyDown(inputSessionRef.current, event.key), event.key);
    };

    const handleWindowKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") {
        event.preventDefault();
      }

      commitTransition(handleKeyUp(inputSessionRef.current, event.key), event.key);
    };

    window.addEventListener("keydown", handleWindowKeyDown);
    window.addEventListener("keyup", handleWindowKeyUp);

    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
      window.removeEventListener("keyup", handleWindowKeyUp);
    };
  }, [commitTransition]);

  useEffect(() => {
    if (cursorState.status !== "resolving" || !cursorState.selection) {
      lastResolvedSelectionKeyRef.current = null;
      return;
    }

    const selectionKey = [
      cursorState.selection.start_x,
      cursorState.selection.start_y,
      cursorState.selection.current_x,
      cursorState.selection.current_y
    ].join(":");

    if (lastResolvedSelectionKeyRef.current === selectionKey) {
      return;
    }

    lastResolvedSelectionKeyRef.current = selectionKey;

    const context = createContextFromSelection({
      selection: cursorState.selection,
      source: {
        app_name: "AetherCursor",
        window_title: document.title,
        url: window.location.protocol === "file:" ? null : window.location.href
      }
    });

    setLatestContext(context);
    setLatestResult(null);
    setNativeCapturePath(null);
    setInputLog((entries) =>
      appendInputDebugLog(entries, {
        type: "context.captured",
        detail: `${context.selection.bounds.width}x${context.selection.bounds.height}`
      })
    );
    dispatchCursorEvent({ type: "context.resolved" });

    void captureNativeRegion(context)
      .then((artifact) => {
        if (!artifact) {
          return;
        }

        setLatestContext((currentContext) => {
          if (!currentContext || currentContext.context_id !== artifact.context_id) {
            return currentContext;
          }

          return {
            ...currentContext,
            content: {
              ...currentContext.content,
              image_ref: artifact.image_ref
            }
          };
        });
        setNativeCapturePath(artifact.file_path);
        setInputLog((entries) =>
          appendInputDebugLog(entries, {
            type: "capture.native",
            detail: `${artifact.width}x${artifact.height}`
          })
        );
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);

        setInputLog((entries) =>
          appendInputDebugLog(entries, {
            type: "capture.native.failed",
            detail: message
          })
        );
      });
  }, [cursorState]);

  useEffect(() => {
    if (cursorState.status !== "thinking" || !cursorState.intent || !latestContext) {
      lastRuntimeKeyRef.current = null;
      return;
    }

    const manifest = builtInAgentRegistry.manifests.find((agent) => agent.id === cursorState.agent_id);

    if (!manifest) {
      dispatchCursorEvent({ type: "agent.failed", message: "Selected agent manifest was not found." });
      return;
    }

    const runtimeKey = [
      latestContext.context_id,
      cursorState.intent,
      manifest.id,
      latestContext.privacy.cloud_allowed,
      latestContext.privacy.user_confirmed_upload
    ].join(":");

    if (lastRuntimeKeyRef.current === runtimeKey) {
      return;
    }

    lastRuntimeKeyRef.current = runtimeKey;

    let active = true;

    void executeAgentRuntime({
      manifest,
      context: latestContext,
      intent: cursorState.intent,
      timeout_ms: 5000
    }).then((result) => {
      if (!active) {
        return;
      }

      setLatestResult(result);
      setInputLog((entries) =>
        appendInputDebugLog(entries, {
          type: `agent.runtime.${result.status}`,
          detail: `${result.intent}:${result.agent_id}`
        })
      );

      if (result.status === "success") {
        dispatchCursorEvent({ type: "agent.succeeded", result_id: result.result_id });
        return;
      }

      dispatchCursorEvent({
        type: "agent.failed",
        message: result.error?.message ?? result.output.text
      });
    });

    return () => {
      active = false;
    };
  }, [cursorState, latestContext]);

  const handlePointerDownCapture = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (inputSessionRef.current.altActive) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      commitTransition(
        handlePointerDown(inputSessionRef.current, { x: event.clientX, y: event.clientY }),
        formatPointerDetail(event.clientX, event.clientY)
      );
    },
    [commitTransition]
  );

  const handlePointerMoveCapture = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      commitTransition(
        handlePointerMove(inputSessionRef.current, { x: event.clientX, y: event.clientY }),
        formatPointerDetail(event.clientX, event.clientY)
      );
    },
    [commitTransition]
  );

  const handlePointerUpCapture = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      commitTransition(
        handlePointerUp(inputSessionRef.current, { x: event.clientX, y: event.clientY }),
        formatPointerDetail(event.clientX, event.clientY)
      );
    },
    [commitTransition]
  );

  return (
    <main
      className="app-shell"
      onPointerDownCapture={handlePointerDownCapture}
      onPointerMoveCapture={handlePointerMoveCapture}
      onPointerUpCapture={handlePointerUpCapture}
    >
      <OverlayRoot
        state={cursorState}
        context={latestContext}
        result={latestResult}
        actions={availableActions}
        moreAgentsOpen={moreAgentsOpen}
        onActionSelect={handleActionSelect}
        pendingAction={pendingAction}
        errorMessage={cursorState.error ?? null}
        onPermissionConfirm={handlePermissionConfirm}
        onPermissionCancel={handlePermissionCancel}
        onReadAloud={handleReadAloud}
        onCopyResult={handleCopyResult}
        onPinResult={handlePinResult}
        onSwitchAgent={handleSwitchAgent}
        onMoreAgents={handleMoreAgents}
        onCloseResult={handleCloseResult}
      />
      <section className="debug-window" aria-labelledby="app-title">
        <div className="status-row">
          <span className="status-dot" aria-hidden="true" />
          <span>P0 Debug Window</span>
        </div>
        <h1 id="app-title">AetherCursor</h1>
        <p className="summary">
          Smart cursor framework scaffold for explicit activation, local context capture,
          privacy policy checks, agent routing, and spatial result rendering.
        </p>
        <section className="input-debug" aria-label="Input debug panel">
          <div className="input-debug__status">
            <span>Status: {cursorState.status}</span>
            <span>Alt: {inputSession.altActive ? "active" : "inactive"}</span>
            <span>Agents: {builtInAgentRegistry.manifests.length}</span>
            <span>Routes: {availableActions.length}</span>
            <span>Pins: {pinnedResults.length}</span>
            <span>
              Pointer:{" "}
              {inputSession.lastPointer
                ? formatPointerDetail(inputSession.lastPointer.x, inputSession.lastPointer.y)
                : "none"}
            </span>
          </div>
          <div className="input-debug__actions">
            <button
              type="button"
              onClick={() => dispatchSyntheticEvent({ type: "context.resolved" }, "debug.context.resolved", "manual")}
            >
              Resolve
            </button>
            <button
              type="button"
              onClick={() =>
                dispatchSyntheticEvent(
                  {
                    type: "action.selected",
                    intent: "extract_text",
                    agent_id: "agent.local.ocr",
                    requires_confirmation: false
                  },
                  "debug.action.extract_text",
                  "manual"
                )
              }
            >
              Local Action
            </button>
            <button
              type="button"
              onClick={() => dispatchSyntheticEvent({ type: "cancel" }, "debug.cancel", "manual")}
            >
              Cancel
            </button>
          </div>
          <ol className="input-debug__log" aria-label="Recent input events">
            {inputLog.map((entry) => (
              <li key={entry.id}>
                <code>{entry.type}</code>
                <span>{entry.detail}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="context-debug" aria-label="Latest context debug panel">
          <div className="context-debug__header">
            <h2>Latest Context</h2>
            <span>{latestContext ? latestContext.context_id : "none"}</span>
          </div>
          {latestContext ? (
            <dl className="context-debug__grid">
              <div>
                <dt>Bounds</dt>
                <dd>
                  {latestContext.selection.bounds.x}, {latestContext.selection.bounds.y},{" "}
                  {latestContext.selection.bounds.width}x{latestContext.selection.bounds.height}
                </dd>
              </div>
              <div>
                <dt>Image</dt>
                <dd>{latestContext.content.image_ref}</dd>
              </div>
              <div>
                <dt>Native file</dt>
                <dd>{nativeCapturePath ?? "pending or unavailable"}</dd>
              </div>
              <div>
                <dt>Privacy</dt>
                <dd>{latestContext.privacy.cloud_allowed ? "cloud allowed" : "local only"}</dd>
              </div>
            </dl>
          ) : (
            <p>Hold Alt and drag a region to generate a local context object.</p>
          )}
        </section>
        {pinnedResults.length > 0 ? (
          <section className="context-debug" aria-label="Pinned results debug panel">
            <div className="context-debug__header">
              <h2>Pinned Results</h2>
              <span>{pinnedResults.length}</span>
            </div>
            <ol className="input-debug__log" aria-label="Session pinned results">
              {pinnedResults.map((result) => (
                <li key={result.result_id}>
                  <code>{result.intent}</code>
                  <span>{result.output.text}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        <div className="module-grid" aria-label="Phase zero module boundaries">
          {phaseZeroModules.map((module) => (
            <article className="module-tile" key={module.name}>
              <h2>{module.name}</h2>
              <p>{module.description}</p>
            </article>
          ))}
        </div>
        <div className="overlay-preview-grid" aria-label="Overlay state preview">
          {overlayPreviewStates.map((state) => (
            <article className="overlay-preview" key={state.status}>
              <OverlayRoot state={state} preview />
              <span>{state.status}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
