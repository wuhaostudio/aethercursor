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
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  initialInputSession,
  type InputSession,
  type InputTransition
} from "./input/inputEvents";
import { appendInputDebugLog, formatPointerDetail, type InputDebugEntry } from "./input/inputDebugLog";
import { ttsPlayer, type TtsPlaybackState } from "./tts/ttsPlayer";
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
  const [ttsState, setTtsState] = useState<TtsPlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentText: null
  });
  const availableActions = latestContext
    ? getAvailableAgentActions(builtInAgentRegistry.manifests, latestContext)
    : [];

  const moreAgents = latestResult && latestContext
    ? availableActions.filter(
        (action) => !(action.manifest.id === latestResult.agent_id && action.intent === latestResult.intent)
      )
    : availableActions;

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
    const text = latestResult?.output.text ?? latestContext?.content.ocr_text ?? latestContext?.content.selected_text;

    if (!text) {
      setInputLog((entries) => appendInputDebugLog(entries, { type: "result.read_aloud.skipped", detail: "empty" }));
      return;
    }

    if (ttsState.isPlaying && !ttsState.isPaused) {
      ttsPlayer.pause();
      setInputLog((entries) => appendInputDebugLog(entries, { type: "result.read_aloud.paused", detail: text.slice(0, 20) }));
      return;
    }

    if (ttsState.isPaused) {
      ttsPlayer.resume();
      setInputLog((entries) => appendInputDebugLog(entries, { type: "result.read_aloud.resumed", detail: text.slice(0, 20) }));
      return;
    }

    ttsPlayer.speak(text).catch((error) => {
      setInputLog((entries) => appendInputDebugLog(entries, { type: "result.read_aloud.failed", detail: error.message }));
    });
    setInputLog((entries) => appendInputDebugLog(entries, { type: "result.read_aloud.started", detail: text.slice(0, 20) }));
  }, [latestResult, latestContext, ttsState]);

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

  const handleSelectAgent = useCallback((agent: RoutedAgent) => {
    setMoreAgentsOpen(false);
    setPendingAction(agent);
    setLatestResult(null);
    setInputLog((entries) =>
      appendInputDebugLog(entries, {
        type: "result.select_agent",
        detail: `${agent.intent}:${agent.manifest.id}`
      })
    );

    if (agent.policy_decision.status === "block") {
      dispatchCursorEvent({
        type: "policy.blocked",
        message: agent.policy_decision.reason
      });
      return;
    }

    if (agent.policy_decision.requires_confirmation) {
      dispatchCursorEvent({
        type: "action.selected",
        intent: agent.intent,
        agent_id: agent.manifest.id,
        requires_confirmation: true
      });
      return;
    }

    dispatchCursorEvent({
      type: "action.selected",
      intent: agent.intent,
      agent_id: agent.manifest.id,
      requires_confirmation: false
    });
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
      if (event.key === "Escape") {
        event.preventDefault();
        dispatchCursorEvent({ type: "cancel" });
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [dispatchCursorEvent]);

  useEffect(() => {
    const unsubscribe = ttsPlayer.subscribe((state) => {
      setTtsState(state);
    });

    return unsubscribe;
  }, []);

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
        if (result.intent === "extract_text" && typeof result.output.ocr_text === "string") {
          setLatestContext((currentContext) => {
            if (!currentContext || currentContext.context_id !== result.context_id) {
              return currentContext;
            }

            return {
              ...currentContext,
              content: {
                ...currentContext.content,
                ocr_text: result.output.ocr_text as string
              },
              metadata: {
                ...currentContext.metadata,
                content_guess: ["text", "image"],
                confidence: Math.max(currentContext.metadata.confidence, 0.8)
              }
            };
          });
        }

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
      event.currentTarget.setPointerCapture(event.pointerId);

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
        moreAgents={moreAgents}
        isReading={ttsState.isPlaying}
        isReadingPaused={ttsState.isPaused}
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
        onSelectAgent={handleSelectAgent}
        onCloseResult={handleCloseResult}
      />
      <section className="debug-window" aria-labelledby="app-title">
        <div className="status-row">
          <span className="status-dot" aria-hidden="true" />
          <span>调试窗口</span>
        </div>
        <h1 id="app-title">AetherCursor 灵犀光标</h1>
        <p className="summary">
          桌面智能光标层框架，支持显式激活、本地上下文捕获、隐私策略检查、代理路由和空间结果渲染。
        </p>
        <section className="input-debug" aria-label="输入调试面板">
          <div className="input-debug__status">
            <span>状态: {cursorState.status}</span>
            <span>代理数: {builtInAgentRegistry.manifests.length}</span>
            <span>可用路由: {availableActions.length}</span>
            <span>固定数: {pinnedResults.length}</span>
            <span>
              指针:{" "}
              {inputSession.lastPointer
                ? formatPointerDetail(inputSession.lastPointer.x, inputSession.lastPointer.y)
                : "无"}
            </span>
          </div>
          <div className="input-debug__actions">
            <button
              type="button"
              onClick={() => dispatchSyntheticEvent({ type: "context.resolved" }, "debug.context.resolved", "手动")}
            >
              解析
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
                  "手动"
                )
              }
            >
              本地操作
            </button>
            <button
              type="button"
              onClick={() => dispatchSyntheticEvent({ type: "cancel" }, "debug.cancel", "手动")}
            >
              取消
            </button>
          </div>
          <ol className="input-debug__log" aria-label="最近输入事件">
            {inputLog.map((entry) => (
              <li key={entry.id}>
                <code>{entry.type}</code>
                <span>{entry.detail}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="context-debug" aria-label="最新上下文调试面板">
          <div className="context-debug__header">
            <h2>最新上下文</h2>
            <span>{latestContext ? latestContext.context_id : "无"}</span>
          </div>
          {latestContext ? (
            <dl className="context-debug__grid">
              <div>
                <dt>边界</dt>
                <dd>
                  {latestContext.selection.bounds.x}, {latestContext.selection.bounds.y},{" "}
                  {latestContext.selection.bounds.width}x{latestContext.selection.bounds.height}
                </dd>
              </div>
              <div>
                <dt>图像</dt>
                <dd>{latestContext.content.image_ref}</dd>
              </div>
              <div>
                <dt>本地文件</dt>
                <dd>{nativeCapturePath ?? "待处理或不可用"}</dd>
              </div>
              <div>
                <dt>隐私</dt>
                <dd>{latestContext.privacy.cloud_allowed ? "允许云端" : "仅本地"}</dd>
              </div>
            </dl>
          ) : (
            <p>按 Alt+Shift+S 激活并拖动选择区域以生成本地上下文对象。</p>
          )}
        </section>
        {pinnedResults.length > 0 ? (
          <section className="context-debug" aria-label="固定结果调试面板">
            <div className="context-debug__header">
              <h2>固定结果</h2>
              <span>{pinnedResults.length}</span>
            </div>
            <ol className="input-debug__log" aria-label="会话固定结果">
              {pinnedResults.map((result) => (
                <li key={result.result_id}>
                  <code>{result.intent}</code>
                  <span>{result.output.text}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        <div className="module-grid" aria-label="阶段零模块边界">
          {phaseZeroModules.map((module) => (
            <article className="module-tile" key={module.name}>
              <h2>{module.name}</h2>
              <p>{module.description}</p>
            </article>
          ))}
        </div>
        <div className="overlay-preview-grid" aria-label="覆盖层状态预览">
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
