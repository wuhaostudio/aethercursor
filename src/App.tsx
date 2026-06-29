import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import "./App.css";
import { listen } from "@tauri-apps/api/event";
import {
  getAvailableAgentActions,
  loadBuiltInAgentManifests,
  type RoutedAgent
} from "./agents/agentRegistry";
import { createContextFromSelection } from "./capture/contextCapture";
import { createContextResolutionErrorResult, resolveContextForAgent } from "./capture/contextResolver";
import { captureNativeRegion, isTauriRuntime } from "./capture/nativeCapture";
import {
  createCapabilitySettings,
  filterEnabledManifests,
  loadEnabledCapabilityIds,
  saveEnabledCapabilityIds,
  toggleCapabilityId
} from "./capabilities/capabilitySettings";
import { toDesktopSelectionCoordinates, toOverlayLogicalPoint } from "./desktop/desktopCoordinates";
import {
  getDesktopOverlayMetrics,
  getDesktopWindowRole,
  hideDesktopOverlay,
  type OverlayWindowMetrics
} from "./desktop/desktopOverlay";
import { shouldResetOverlaySession } from "./desktop/overlaySession";
import { OverlayRoot } from "./overlay/OverlayRoot";
import { confirmCloudUpload } from "./policy/policy";
import { executeAgentRuntime } from "./runtime/agentRuntime";
import { cursorReducer, initialCursorState, type CursorEvent, type CursorState } from "./cursor/stateMachine";
import {
  handlePointerDown,
  handleKeyDown,
  handleKeyUp,
  handlePointerMove,
  handlePointerUp,
  initialInputSession,
  type InputSession,
  type InputTransition
} from "./input/inputEvents";
import { appendInputDebugLog, formatPointerDetail, type InputDebugEntry } from "./input/inputDebugLog";
import { isInteractivePointerTarget } from "./input/pointerTargets";
import { ttsPlayer, type TtsPlaybackState } from "./tts/ttsPlayer";
import type { AgentManifest, Intent } from "./shared/agent";
import type { ContextProtocol } from "./shared/context";
import { phaseZeroModules } from "./shared/project";
import type { AgentResult } from "./shared/result";

const builtInAgentRegistry = loadBuiltInAgentManifests();

interface GlobalShortcutEventPayload {
  readonly shortcut: string;
  readonly state: "pressed" | "released";
  readonly cursor_x?: number;
  readonly cursor_y?: number;
  readonly overlay_metrics?: OverlayWindowMetrics | null;
}

const overlayPreviewStates: readonly CursorState[] = [
  { status: "normal" },
  {
    status: "smart_cursor",
    selection: {
      start_x: 110,
      start_y: 72.5,
      current_x: 130,
      current_y: 87.5
    },
    selection_shape: {
      mode: "focus",
      bounds: {
        x: 110,
        y: 72.5,
        width: 20,
        height: 15
      },
      confidence: 0.5
    }
  },
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
  const [nativeCapturePending, setNativeCapturePending] = useState(false);
  const [moreAgentsOpen, setMoreAgentsOpen] = useState(false);
  const [capabilityManagerOpen, setCapabilityManagerOpen] = useState(false);
  const [overlayMetrics, setOverlayMetrics] = useState<OverlayWindowMetrics | null>(null);
  const [windowRole] = useState(() => getDesktopWindowRole());
  const [enabledCapabilityIds, setEnabledCapabilityIds] = useState<readonly string[]>(() => loadEnabledCapabilityIds());
  const [pendingAction, setPendingAction] = useState<RoutedAgent | null>(null);
  const [ttsState, setTtsState] = useState<TtsPlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentText: null
  });
  const enabledManifests = useMemo(
    () => filterEnabledManifests(builtInAgentRegistry.manifests, enabledCapabilityIds),
    [enabledCapabilityIds]
  );
  const capabilitySettings = useMemo(
    () => createCapabilitySettings(builtInAgentRegistry.manifests, enabledCapabilityIds),
    [enabledCapabilityIds]
  );
  const availableActions = latestContext ? getAvailableAgentActions(enabledManifests, latestContext) : [];
  const isOverlayWindow = windowRole === "overlay";

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

  const handleToggleCapability = useCallback((id: string) => {
    setEnabledCapabilityIds((currentIds) => {
      const nextIds = saveEnabledCapabilityIds(toggleCapabilityId(currentIds, id));

      setInputLog((entries) =>
        appendInputDebugLog(entries, {
          type: "capability.toggle",
          detail: id
        })
      );

      return nextIds;
    });
  }, []);

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.key !== "Alt" && event.key !== "Enter" && event.key !== "Tab") {
        return;
      }

      if (event.repeat) {
        return;
      }

      if (event.key === "Escape" || event.key === "Alt" || event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
      }

      commitTransition(handleKeyDown(inputSessionRef.current, event.key), event.key);
    };

    const handleWindowKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Alt") {
        return;
      }

      event.preventDefault();
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
    if (!isTauriRuntime()) {
      return;
    }

    let disposed = false;
    let cleanup: (() => void) | null = null;

    void listen<GlobalShortcutEventPayload>("global-shortcut", (event) => {
      if (event.payload.shortcut !== "Alt+Shift+S") {
        return;
      }

      setInputLog((entries) =>
        appendInputDebugLog(entries, {
          type: `shortcut.${event.payload.state}`,
          detail: event.payload.shortcut
        })
      );

      if (event.payload.state === "pressed") {
        if (windowRole !== "overlay") {
          return;
        }

        const activeOverlayMetrics = event.payload.overlay_metrics ?? overlayMetrics;

        if (event.payload.overlay_metrics) {
          setOverlayMetrics(event.payload.overlay_metrics);
        }

        const shortcutPoint =
          typeof event.payload.cursor_x === "number" && typeof event.payload.cursor_y === "number"
            ? toOverlayLogicalPoint(event.payload.cursor_x, event.payload.cursor_y, activeOverlayMetrics)
            : inputSessionRef.current.lastPointer;

        dispatchCursorEvent({
          type: "activation.pressed",
          x: shortcutPoint?.x,
          y: shortcutPoint?.y
        });
      }
    }).then((unlisten) => {
      if (disposed) {
        unlisten();
        return;
      }

      cleanup = unlisten;
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [overlayMetrics, windowRole]);

  useEffect(() => {
    if (windowRole === "browser") {
      return;
    }

    void getDesktopOverlayMetrics()
      .then((metrics) => {
        setOverlayMetrics(metrics);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);

        setInputLog((entries) =>
          appendInputDebugLog(entries, {
            type: "overlay.metrics.failed",
            detail: message
          })
        );
      });
  }, [windowRole]);

  useEffect(() => {
    if (
      !shouldResetOverlaySession(cursorState.status, {
        hasContext: latestContext !== null,
        hasResult: latestResult !== null,
        hasPendingAction: pendingAction !== null,
        moreAgentsOpen,
        nativeCapturePath,
        nativeCapturePending
      })
    ) {
      return;
    }

    setLatestContext(null);
    setLatestResult(null);
    setPendingAction(null);
    setMoreAgentsOpen(false);
    setNativeCapturePath(null);
    setNativeCapturePending(false);
    lastResolvedSelectionKeyRef.current = null;
    lastRuntimeKeyRef.current = null;
  }, [
    cursorState.status,
    latestContext,
    latestResult,
    moreAgentsOpen,
    nativeCapturePath,
    nativeCapturePending,
    pendingAction
  ]);

  useEffect(() => {
    if (windowRole !== "overlay") {
      return;
    }

    const shouldHide = cursorState.status === "normal";

    if (!shouldHide) {
      return;
    }

    void hideDesktopOverlay().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);

      setInputLog((entries) =>
        appendInputDebugLog(entries, {
          type: "overlay.hide.failed",
          detail: message
        })
      );
    });
  }, [cursorState.status, windowRole]);

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

    const desktopCoordinates = toDesktopSelectionCoordinates(
      cursorState.selection,
      cursorState.selection_shape,
      isOverlayWindow ? overlayMetrics : null
    );

    const context = createContextFromSelection({
      selection: desktopCoordinates.selection,
      selectionShape: desktopCoordinates.selectionShape,
      displayScale: desktopCoordinates.displayScale,
      source: {
        app_name: "AetherCursor",
        window_title: document.title,
        url: window.location.protocol === "file:" ? null : window.location.href
      }
    });

    setLatestContext(context);
    setLatestResult(null);
    setNativeCapturePath(null);
    setNativeCapturePending(false);
    setInputLog((entries) =>
      appendInputDebugLog(entries, {
        type: "context.resolved",
        detail: `${context.selection.bounds.width}x${context.selection.bounds.height}`
      })
    );
    dispatchCursorEvent({ type: "context.resolved" });
  }, [cursorState, isOverlayWindow, overlayMetrics]);

  useEffect(() => {
    if (cursorState.status !== "thinking" || !cursorState.intent || !latestContext) {
      lastRuntimeKeyRef.current = null;
      return;
    }

    const manifest = enabledManifests.find((agent) => agent.id === cursorState.agent_id);

    if (!manifest) {
      dispatchCursorEvent({ type: "agent.failed", message: "Selected agent manifest was not found." });
      return;
    }

    if (nativeCapturePending) {
      setInputLog((entries) =>
        appendInputDebugLog(entries, {
          type: "agent.runtime.waiting",
          detail: "context_resolution"
        })
      );
      return;
    }

    const runtimeKey = [
      latestContext.context_id,
      cursorState.intent,
      manifest.id,
      latestContext.privacy.cloud_allowed,
      latestContext.privacy.user_confirmed_upload,
      latestContext.content.selected_text ?? "no-selected-text",
      latestContext.content.ocr_text ?? "no-ocr-text",
      latestContext.content.image_ref ?? "no-image",
      nativeCapturePending ? "capture-pending" : "capture-ready"
    ].join(":");

    if (lastRuntimeKeyRef.current === runtimeKey) {
      return;
    }

    lastRuntimeKeyRef.current = runtimeKey;

    let active = true;
    const startedAt = performance.now();

    void resolveContextAndExecuteAgent({
      manifest,
      context: latestContext,
      intent: cursorState.intent,
      timeout_ms: 5000,
      onCaptureStart: (reason) => {
        setNativeCapturePending(true);
        setInputLog((entries) =>
          appendInputDebugLog(entries, {
            type: "context.capture.required",
            detail: reason
          })
        );
      },
      onCaptureSuccess: (context, detail) => {
        setLatestContext(context);
        setNativeCapturePath(detail.file_path);
        setInputLog((entries) =>
          appendInputDebugLog(entries, {
            type: "capture.native",
            detail: detail.overlay_hidden
              ? `${detail.width}x${detail.height}:overlay_hidden`
              : `${detail.width}x${detail.height}`
          })
        );
      },
      onCaptureFailure: (message) => {
        setInputLog((entries) =>
          appendInputDebugLog(entries, {
            type: "capture.native.failed",
            detail: message
          })
        );
      },
      startedAt
    }).then((result) => {
      if (!active) {
        return;
      }

      setNativeCapturePending(false);

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
  }, [cursorState, latestContext, nativeCapturePending, enabledManifests]);

  const handlePointerDownCapture = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (isInteractivePointerTarget(event.target)) {
        return;
      }

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
      if (isInteractivePointerTarget(event.target)) {
        return;
      }

      commitTransition(
        handlePointerMove(inputSessionRef.current, { x: event.clientX, y: event.clientY }),
        formatPointerDetail(event.clientX, event.clientY)
      );
    },
    [commitTransition]
  );

  const handlePointerUpCapture = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (isInteractivePointerTarget(event.target)) {
        return;
      }

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
      className={isOverlayWindow ? "app-shell app-shell--overlay-window" : "app-shell"}
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
      {isOverlayWindow ? null : (
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
            <span>启用能力: {enabledManifests.length}</span>
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
            <button
              type="button"
              onClick={() => setCapabilityManagerOpen((open) => !open)}
            >
              管理能力
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
        {capabilityManagerOpen ? (
          <section className="capability-manager" aria-label="能力管理">
            <div className="context-debug__header">
              <h2>管理能力</h2>
              <span>{enabledManifests.length} / {builtInAgentRegistry.manifests.length}</span>
            </div>
            <div className="capability-manager__list">
              {capabilitySettings.map((setting) => (
                <label className="capability-manager__item" key={setting.manifest.id}>
                  <input
                    type="checkbox"
                    checked={setting.enabled}
                    onChange={() => handleToggleCapability(setting.manifest.id)}
                  />
                  <span>
                    <strong>{setting.manifest.name}</strong>
                    <small>
                      {formatExecutionMode(setting.manifest.execution_mode)} · {setting.manifest.capabilities.join(", ")}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </section>
        ) : null}
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
                <dd>{nativeCapturePending ? "捕获中" : nativeCapturePath ?? "待处理或不可用"}</dd>
              </div>
              <div>
                <dt>隐私</dt>
                <dd>{latestContext.privacy.cloud_allowed ? "允许云端" : "仅本地"}</dd>
              </div>
            </dl>
          ) : (
            <p>按 Alt+Shift+S 激活智能光标，按 Enter 使用焦点选区，或拖动生成区域上下文。</p>
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
      )}
    </main>
  );
}

async function resolveContextAndExecuteAgent(options: {
  readonly manifest: AgentManifest;
  readonly context: ContextProtocol;
  readonly intent: Intent;
  readonly timeout_ms: number;
  readonly startedAt: number;
  readonly onCaptureStart: (reason: string) => void;
  readonly onCaptureSuccess: (
    context: ContextProtocol,
    detail: { readonly file_path: string; readonly width: number; readonly height: number; readonly overlay_hidden?: boolean }
  ) => void;
  readonly onCaptureFailure: (message: string) => void;
}): Promise<AgentResult> {
  let resolved = resolveContextForAgent({
    manifest: options.manifest,
    context: options.context,
    intent: options.intent
  });

  if (resolved.status === "requires_capture") {
    options.onCaptureStart(resolved.reason);

    try {
      const artifact = await captureNativeRegion(options.context);

      if (!artifact) {
        resolved = {
          status: "error",
          code: "capture_unavailable",
          message: "Selected-region capture is unavailable in this runtime."
        };
      } else {
        const capturedContext: ContextProtocol = {
          ...options.context,
          content: {
            ...options.context.content,
            image_ref: artifact.image_ref
          }
        };

        options.onCaptureSuccess(capturedContext, artifact);
        resolved = resolveContextForAgent({
          manifest: options.manifest,
          context: capturedContext,
          intent: options.intent
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      options.onCaptureFailure(message);
      resolved = {
        status: "error",
        code: "capture_failed",
        message
      };
    }
  }

  if (resolved.status === "error") {
    return createContextResolutionErrorResult(
      {
        manifest: options.manifest,
        context: options.context,
        intent: options.intent
      },
      resolved,
      options.startedAt
    );
  }

  if (resolved.status !== "ready") {
    return createContextResolutionErrorResult(
      {
        manifest: options.manifest,
        context: options.context,
        intent: options.intent
      },
      {
        status: "error",
        code: "context_unavailable",
        message: resolved.reason
      },
      options.startedAt
    );
  }

  return executeAgentRuntime({
    manifest: options.manifest,
    context: resolved.context,
    intent: options.intent,
    timeout_ms: options.timeout_ms
  });
}

function formatExecutionMode(mode: string): string {
  if (mode === "local") {
    return "本地";
  }

  if (mode === "cloud") {
    return "云端";
  }

  return "混合";
}

export default App;
