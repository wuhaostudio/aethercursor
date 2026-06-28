import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDesktopWindowRole,
  getDesktopOverlayMetrics,
  hideDesktopOverlay,
  showDesktopOverlay
} from "./desktopOverlay";

const invokeMock = vi.hoisted(() => vi.fn());
const getCurrentWebviewWindowMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock
}));

vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: getCurrentWebviewWindowMock
}));

describe("desktop overlay bridge", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    getCurrentWebviewWindowMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("treats the browser dev surface as a browser role", async () => {
    expect(getDesktopWindowRole()).toBe("browser");
    expect(await showDesktopOverlay()).toBeNull();
    expect(await hideDesktopOverlay()).toBeNull();
    expect(await getDesktopOverlayMetrics()).toBeNull();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("detects the overlay webview window by label", () => {
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
    getCurrentWebviewWindowMock.mockReturnValue({ label: "overlay" });

    expect(getDesktopWindowRole()).toBe("overlay");
  });

  it("detects non-overlay Tauri windows as main role", () => {
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
    getCurrentWebviewWindowMock.mockReturnValue({ label: "main" });

    expect(getDesktopWindowRole()).toBe("main");
  });

  it("invokes native overlay visibility commands in Tauri", async () => {
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
    invokeMock
      .mockResolvedValueOnce({ label: "overlay", visible: true })
      .mockResolvedValueOnce({ label: "overlay", visible: false });

    await expect(showDesktopOverlay()).resolves.toEqual({ label: "overlay", visible: true });
    await expect(hideDesktopOverlay()).resolves.toEqual({ label: "overlay", visible: false });
    expect(invokeMock).toHaveBeenNthCalledWith(1, "show_overlay_window");
    expect(invokeMock).toHaveBeenNthCalledWith(2, "hide_overlay_window");
  });

  it("reads native overlay metrics for the cursor position in Tauri", async () => {
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
    invokeMock.mockResolvedValueOnce({
      origin_x: 0,
      origin_y: 0,
      width: 1920,
      height: 1080,
      scale_factor: 1.25
    });

    await expect(getDesktopOverlayMetrics()).resolves.toEqual({
      origin_x: 0,
      origin_y: 0,
      width: 1920,
      height: 1080,
      scale_factor: 1.25
    });
    expect(invokeMock).toHaveBeenCalledWith("get_overlay_window_metrics", {
      request: {
        cursor_x: null,
        cursor_y: null
      }
    });
  });

  it("passes cursor coordinates when reading overlay metrics", async () => {
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
    invokeMock.mockResolvedValueOnce({
      origin_x: -1920,
      origin_y: 0,
      width: 1920,
      height: 1080,
      scale_factor: 1
    });

    await getDesktopOverlayMetrics({ x: -120, y: 300 });

    expect(invokeMock).toHaveBeenCalledWith("get_overlay_window_metrics", {
      request: {
        cursor_x: -120,
        cursor_y: 300
      }
    });
  });
});
