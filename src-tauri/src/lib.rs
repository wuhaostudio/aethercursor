use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, thread, time::Duration};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

const GLOBAL_SHORTCUT: &str = "Alt+Shift+S";

#[derive(Debug, Clone, Serialize)]
struct GlobalShortcutEvent {
    shortcut: String,
    state: String,
    cursor_x: Option<f64>,
    cursor_y: Option<f64>,
    selected_text: Option<String>,
    overlay_metrics: Option<OverlayWindowMetrics>,
}

#[tauri::command]
fn app_status() -> &'static str {
    "p11-ready"
}

#[tauri::command]
fn read_selected_text() -> Result<Option<String>, String> {
    read_selected_text_native()
}

fn setup_global_shortcut(app: &AppHandle) -> Result<(), String> {
    let shortcut: Shortcut = GLOBAL_SHORTCUT
        .parse()
        .map_err(|e| format!("invalid shortcut: {}", e))?;

    let app_handle = app.clone();

    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            let pressed = matches!(event.state, ShortcutState::Pressed);
            let state = if pressed { "pressed" } else { "released" };

            let cursor_position = if pressed {
                app_handle.cursor_position().ok()
            } else {
                None
            };
            let selected_text = if pressed {
                read_selected_text_native().ok().flatten()
            } else {
                None
            };
            let (cursor_x, cursor_y) = cursor_position
                .map(|position| (Some(position.x), Some(position.y)))
                .unwrap_or((None, None));
            let overlay_metrics = if pressed {
                show_overlay_window_for_app(&app_handle, cursor_x, cursor_y).ok()
            } else {
                None
            };

            let _ = app_handle.emit(
                "global-shortcut",
                GlobalShortcutEvent {
                    shortcut: GLOBAL_SHORTCUT.to_string(),
                    state: state.to_string(),
                    cursor_x,
                    cursor_y,
                    selected_text,
                    overlay_metrics,
                },
            );
        })
        .map_err(|e| format!("failed to register shortcut: {}", e))?;

    Ok(())
}

#[tauri::command]
fn register_global_shortcut(app: AppHandle) -> Result<String, String> {
    setup_global_shortcut(&app)?;
    Ok(format!("registered {}", GLOBAL_SHORTCUT))
}

#[tauri::command]
fn unregister_global_shortcut(app: AppHandle) -> Result<String, String> {
    let shortcut: Shortcut = GLOBAL_SHORTCUT
        .parse()
        .map_err(|e| format!("invalid shortcut: {}", e))?;

    app.global_shortcut()
        .unregister(shortcut)
        .map_err(|e| format!("failed to unregister shortcut: {}", e))?;

    Ok(format!("unregistered {}", GLOBAL_SHORTCUT))
}

#[derive(Debug, Serialize)]
struct OverlayWindowStatus {
    label: String,
    visible: bool,
    metrics: Option<OverlayWindowMetrics>,
}

#[derive(Debug, Clone, Serialize)]
struct OverlayWindowMetrics {
    origin_x: i32,
    origin_y: i32,
    width: u32,
    height: u32,
    scale_factor: f64,
}

#[derive(Debug, Deserialize)]
struct OverlayWindowMetricsRequest {
    cursor_x: Option<f64>,
    cursor_y: Option<f64>,
}

#[tauri::command]
fn get_overlay_window_metrics(
    app: AppHandle,
    request: OverlayWindowMetricsRequest,
) -> Result<OverlayWindowMetrics, String> {
    overlay_metrics_for_app(&app, request.cursor_x, request.cursor_y)
}

#[tauri::command]
fn show_overlay_window(app: AppHandle) -> Result<OverlayWindowStatus, String> {
    let cursor_position = app.cursor_position().ok();
    let (cursor_x, cursor_y) = cursor_position
        .map(|position| (Some(position.x), Some(position.y)))
        .unwrap_or((None, None));

    show_overlay_window_for_app(&app, cursor_x, cursor_y).map(|metrics| OverlayWindowStatus {
        label: "overlay".to_string(),
        visible: true,
        metrics: Some(metrics),
    })
}

fn show_overlay_window_for_app(
    app: &AppHandle,
    cursor_x: Option<f64>,
    cursor_y: Option<f64>,
) -> Result<OverlayWindowMetrics, String> {
    let overlay = app
        .get_webview_window("overlay")
        .ok_or_else(|| "overlay window was not found".to_string())?;

    let metrics = overlay_metrics_for_app(app, cursor_x, cursor_y)?;

    overlay
        .set_position(PhysicalPosition::new(metrics.origin_x, metrics.origin_y))
        .map_err(|error| format!("failed to position overlay window: {error}"))?;
    overlay
        .set_size(PhysicalSize::new(metrics.width, metrics.height))
        .map_err(|error| format!("failed to size overlay window: {error}"))?;

    overlay
        .set_always_on_top(true)
        .map_err(|error| format!("failed to raise overlay window: {error}"))?;
    overlay
        .set_ignore_cursor_events(false)
        .map_err(|error| format!("failed to enable overlay pointer events: {error}"))?;
    overlay
        .show()
        .map_err(|error| format!("failed to show overlay window: {error}"))?;
    overlay
        .set_focus()
        .map_err(|error| format!("failed to focus overlay window: {error}"))?;

    Ok(metrics)
}

#[tauri::command]
fn hide_overlay_window(app: AppHandle) -> Result<OverlayWindowStatus, String> {
    let overlay = app
        .get_webview_window("overlay")
        .ok_or_else(|| "overlay window was not found".to_string())?;

    overlay
        .set_ignore_cursor_events(true)
        .map_err(|error| format!("failed to ignore overlay pointer events: {error}"))?;
    overlay
        .hide()
        .map_err(|error| format!("failed to hide overlay window: {error}"))?;

    Ok(OverlayWindowStatus {
        label: "overlay".to_string(),
        visible: false,
        metrics: None,
    })
}

fn overlay_metrics_for_app(
    app: &AppHandle,
    cursor_x: Option<f64>,
    cursor_y: Option<f64>,
) -> Result<OverlayWindowMetrics, String> {
    let monitor = match (cursor_x, cursor_y) {
        (Some(x), Some(y)) => app
            .monitor_from_point(x, y)
            .map_err(|error| format!("failed to read cursor monitor: {error}"))?,
        _ => None,
    }
    .or_else(|| {
        app.primary_monitor()
            .map_err(|error| format!("failed to read primary monitor: {error}"))
            .ok()
            .flatten()
    })
    .ok_or_else(|| "monitor was not found".to_string())?;

    Ok(OverlayWindowMetrics {
        origin_x: monitor.position().x,
        origin_y: monitor.position().y,
        width: monitor.size().width,
        height: monitor.size().height,
        scale_factor: monitor.scale_factor(),
    })
}

#[derive(Debug, Deserialize)]
struct CaptureRegionRequest {
    context_id: String,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
}

#[derive(Debug, Serialize)]
struct CaptureRegionResponse {
    context_id: String,
    image_ref: String,
    file_path: String,
    width: i32,
    height: i32,
    overlay_hidden: bool,
}

#[tauri::command]
fn capture_region(
    app: AppHandle,
    request: CaptureRegionRequest,
) -> Result<CaptureRegionResponse, String> {
    if request.context_id.trim().is_empty() {
        return Err("context_id is required".to_string());
    }

    if request.width <= 0 || request.height <= 0 {
        return Err("capture region must have positive width and height".to_string());
    }

    let path = capture_path(&request.context_id)?;
    let overlay_was_hidden = hide_overlay_for_capture(&app)?;

    let capture_result = capture_region_to_file(&request, &path);
    let restore_result = restore_overlay_after_capture(&app, overlay_was_hidden);

    capture_result?;
    restore_result?;

    Ok(CaptureRegionResponse {
        context_id: request.context_id,
        image_ref: format!(
            "local://capture/{}.bmp",
            path.file_stem().unwrap().to_string_lossy()
        ),
        file_path: path.to_string_lossy().into_owned(),
        width: request.width,
        height: request.height,
        overlay_hidden: overlay_was_hidden,
    })
}

fn hide_overlay_for_capture(app: &AppHandle) -> Result<bool, String> {
    let Some(overlay) = app.get_webview_window("overlay") else {
        return Ok(false);
    };

    let visible = overlay
        .is_visible()
        .map_err(|error| format!("failed to read overlay visibility: {error}"))?;

    if !visible {
        return Ok(false);
    }

    overlay
        .set_ignore_cursor_events(true)
        .map_err(|error| format!("failed to ignore overlay pointer events: {error}"))?;
    overlay
        .hide()
        .map_err(|error| format!("failed to hide overlay before capture: {error}"))?;

    thread::sleep(Duration::from_millis(80));

    Ok(true)
}

fn restore_overlay_after_capture(app: &AppHandle, should_restore: bool) -> Result<(), String> {
    if !should_restore {
        return Ok(());
    }

    let overlay = app
        .get_webview_window("overlay")
        .ok_or_else(|| "overlay window was not found after capture".to_string())?;

    overlay
        .set_always_on_top(true)
        .map_err(|error| format!("failed to restore overlay z-order: {error}"))?;
    overlay
        .set_ignore_cursor_events(false)
        .map_err(|error| format!("failed to restore overlay pointer events: {error}"))?;
    overlay
        .show()
        .map_err(|error| format!("failed to restore overlay after capture: {error}"))?;
    overlay
        .set_focus()
        .map_err(|error| format!("failed to refocus overlay after capture: {error}"))?;

    Ok(())
}

fn capture_path(context_id: &str) -> Result<PathBuf, String> {
    let safe_context_id = context_id
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || character == '_' || character == '-' {
                character
            } else {
                '_'
            }
        })
        .collect::<String>();
    let capture_dir = std::env::temp_dir().join("aethercursor").join("capture");

    fs::create_dir_all(&capture_dir)
        .map_err(|error| format!("failed to create capture dir: {error}"))?;

    Ok(capture_dir.join(format!("{safe_context_id}.bmp")))
}

#[cfg(target_os = "windows")]
fn capture_region_to_file(request: &CaptureRegionRequest, path: &PathBuf) -> Result<(), String> {
    windows_capture::capture_region_to_bmp(
        request.x,
        request.y,
        request.width,
        request.height,
        path,
    )
}

#[cfg(not(target_os = "windows"))]
fn capture_region_to_file(_request: &CaptureRegionRequest, _path: &PathBuf) -> Result<(), String> {
    Err("native region capture is only implemented on Windows".to_string())
}

#[derive(Debug, Deserialize)]
struct ReadCaptureFileRequest {
    context_id: String,
}

#[derive(Debug, Serialize)]
struct ReadCaptureFileResponse {
    context_id: String,
    data_base64: String,
    file_path: String,
    size_bytes: u64,
}

#[tauri::command]
fn read_capture_file(request: ReadCaptureFileRequest) -> Result<ReadCaptureFileResponse, String> {
    if request.context_id.trim().is_empty() {
        return Err("context_id is required".to_string());
    }

    let path = capture_path(&request.context_id)?;

    let metadata = fs::metadata(&path)
        .map_err(|error| format!("failed to read capture file metadata: {error}"))?;
    let bytes = fs::read(&path).map_err(|error| format!("failed to read capture file: {error}"))?;

    Ok(ReadCaptureFileResponse {
        context_id: request.context_id,
        data_base64: base64_encode(&bytes),
        file_path: path.to_string_lossy().into_owned(),
        size_bytes: metadata.len(),
    })
}

fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = Vec::with_capacity((data.len() + 2) / 3 * 4);

    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;

        result.push(CHARS[((triple >> 18) & 0x3F) as usize]);
        result.push(CHARS[((triple >> 12) & 0x3F) as usize]);

        if chunk.len() > 1 {
            result.push(CHARS[((triple >> 6) & 0x3F) as usize]);
        } else {
            result.push(b'=');
        }

        if chunk.len() > 2 {
            result.push(CHARS[(triple & 0x3F) as usize]);
        } else {
            result.push(b'=');
        }
    }

    String::from_utf8(result).unwrap_or_default()
}

#[cfg(target_os = "windows")]
fn read_selected_text_native() -> Result<Option<String>, String> {
    windows_selected_text::read_selected_text()
}

#[cfg(not(target_os = "windows"))]
fn read_selected_text_native() -> Result<Option<String>, String> {
    Ok(None)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            app_status,
            capture_region,
            get_overlay_window_metrics,
            hide_overlay_window,
            read_capture_file,
            read_selected_text,
            register_global_shortcut,
            show_overlay_window,
            unregister_global_shortcut
        ])
        .setup(|app| {
            if let Err(e) = setup_global_shortcut(app.handle()) {
                eprintln!("global shortcut setup failed: {}", e);
            }
            if let Some(overlay) = app.get_webview_window("overlay") {
                let _ = overlay.set_ignore_cursor_events(true);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running AetherCursor");
}

#[cfg(target_os = "windows")]
mod windows_capture {
    use std::{fs, mem::size_of, path::Path};
    use windows::Win32::Graphics::Gdi::{
        BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits,
        GetWindowDC, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
        HBITMAP, HDC, SRCCOPY,
    };
    use windows::Win32::UI::WindowsAndMessaging::GetDesktopWindow;

    pub fn capture_region_to_bmp(
        x: i32,
        y: i32,
        width: i32,
        height: i32,
        path: &Path,
    ) -> Result<(), String> {
        let width_u32 = width as u32;
        let height_u32 = height as u32;
        let mut pixels = vec![0_u8; width as usize * height as usize * 4];

        unsafe {
            let desktop_window = GetDesktopWindow();
            let screen_dc = GetWindowDC(Some(desktop_window));
            if screen_dc.0.is_null() {
                return Err("failed to get desktop device context".to_string());
            }

            let memory_dc = CreateCompatibleDC(Some(screen_dc));
            if memory_dc.0.is_null() {
                ReleaseDC(Some(desktop_window), screen_dc);
                return Err("failed to create compatible device context".to_string());
            }

            let bitmap = CreateCompatibleBitmap(screen_dc, width, height);
            if bitmap.0.is_null() {
                cleanup(desktop_window, screen_dc, memory_dc, bitmap);
                return Err("failed to create capture bitmap".to_string());
            }

            let previous_object = SelectObject(memory_dc, bitmap.into());
            if previous_object.0.is_null() {
                cleanup(desktop_window, screen_dc, memory_dc, bitmap);
                return Err("failed to select capture bitmap".to_string());
            }

            if BitBlt(
                memory_dc,
                0,
                0,
                width,
                height,
                Some(screen_dc),
                x,
                y,
                SRCCOPY,
            )
            .is_err()
            {
                SelectObject(memory_dc, previous_object);
                cleanup(desktop_window, screen_dc, memory_dc, bitmap);
                return Err("failed to copy screen region".to_string());
            }

            let mut bitmap_info = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: width,
                    biHeight: -height,
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB.0,
                    biSizeImage: (pixels.len()) as u32,
                    ..Default::default()
                },
                ..Default::default()
            };

            let scan_lines = GetDIBits(
                memory_dc,
                bitmap,
                0,
                height_u32,
                Some(pixels.as_mut_ptr().cast()),
                &mut bitmap_info,
                DIB_RGB_COLORS,
            );

            SelectObject(memory_dc, previous_object);
            cleanup(desktop_window, screen_dc, memory_dc, bitmap);

            if scan_lines == 0 {
                return Err("failed to read captured pixels".to_string());
            }
        }

        write_bmp(path, width_u32, height_u32, &pixels)
    }

    unsafe fn cleanup(
        desktop_window: windows::Win32::Foundation::HWND,
        screen_dc: HDC,
        memory_dc: HDC,
        bitmap: HBITMAP,
    ) {
        if !bitmap.0.is_null() {
            let _ = DeleteObject(bitmap.into());
        }

        if !memory_dc.0.is_null() {
            let _ = DeleteDC(memory_dc);
        }

        if !screen_dc.0.is_null() {
            ReleaseDC(Some(desktop_window), screen_dc);
        }
    }

    fn write_bmp(path: &Path, width: u32, height: u32, pixels: &[u8]) -> Result<(), String> {
        let pixel_offset = 14_u32 + 40_u32;
        let file_size = pixel_offset + pixels.len() as u32;
        let mut bytes = Vec::with_capacity(file_size as usize);

        bytes.extend_from_slice(b"BM");
        bytes.extend_from_slice(&file_size.to_le_bytes());
        bytes.extend_from_slice(&0_u16.to_le_bytes());
        bytes.extend_from_slice(&0_u16.to_le_bytes());
        bytes.extend_from_slice(&pixel_offset.to_le_bytes());

        bytes.extend_from_slice(&40_u32.to_le_bytes());
        bytes.extend_from_slice(&(width as i32).to_le_bytes());
        let top_down_height = -(height as i32);
        bytes.extend_from_slice(&top_down_height.to_le_bytes());
        bytes.extend_from_slice(&1_u16.to_le_bytes());
        bytes.extend_from_slice(&32_u16.to_le_bytes());
        bytes.extend_from_slice(&BI_RGB.0.to_le_bytes());
        bytes.extend_from_slice(&(pixels.len() as u32).to_le_bytes());
        bytes.extend_from_slice(&0_i32.to_le_bytes());
        bytes.extend_from_slice(&0_i32.to_le_bytes());
        bytes.extend_from_slice(&0_u32.to_le_bytes());
        bytes.extend_from_slice(&0_u32.to_le_bytes());
        bytes.extend_from_slice(pixels);

        fs::write(path, bytes).map_err(|error| format!("failed to write capture bitmap: {error}"))
    }
}

#[cfg(target_os = "windows")]
mod windows_selected_text {
    use windows::Win32::Foundation::{RPC_E_CHANGED_MODE, S_FALSE, S_OK};
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER,
        COINIT_APARTMENTTHREADED,
    };
    use windows::Win32::UI::Accessibility::{
        CUIAutomation, IUIAutomation, IUIAutomationTextPattern, UIA_TextPatternId,
    };

    const MAX_SELECTED_TEXT_LENGTH: i32 = 8000;

    pub fn read_selected_text() -> Result<Option<String>, String> {
        let _com = ComApartment::initialize()?;

        unsafe {
            let automation: IUIAutomation =
                CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER)
                    .map_err(|error| format!("failed to create UI Automation: {error}"))?;
            let focused = automation
                .GetFocusedElement()
                .map_err(|error| format!("failed to read focused element: {error}"))?;
            let text_pattern: IUIAutomationTextPattern = focused
                .GetCurrentPatternAs(UIA_TextPatternId)
                .map_err(|error| format!("focused element has no text pattern: {error}"))?;
            let ranges = text_pattern
                .GetSelection()
                .map_err(|error| format!("failed to read text selection: {error}"))?;
            let length = ranges
                .Length()
                .map_err(|error| format!("failed to read selection range count: {error}"))?;

            let mut parts = Vec::new();

            for index in 0..length {
                let range = ranges
                    .GetElement(index)
                    .map_err(|error| format!("failed to read selection range: {error}"))?;
                let text = range
                    .GetText(MAX_SELECTED_TEXT_LENGTH)
                    .map_err(|error| format!("failed to read selected text: {error}"))?
                    .to_string();
                let normalized = normalize_selected_text(&text);

                if !normalized.is_empty() {
                    parts.push(normalized);
                }
            }

            let text = parts.join("\n");

            if text.is_empty() {
                Ok(None)
            } else {
                Ok(Some(text))
            }
        }
    }

    struct ComApartment {
        should_uninitialize: bool,
    }

    impl ComApartment {
        fn initialize() -> Result<Self, String> {
            let result = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };

            if result == S_OK || result == S_FALSE {
                return Ok(Self {
                    should_uninitialize: true,
                });
            }

            if result == RPC_E_CHANGED_MODE {
                return Ok(Self {
                    should_uninitialize: false,
                });
            }

            Err(format!("failed to initialize COM: {result:?}"))
        }
    }

    impl Drop for ComApartment {
        fn drop(&mut self) {
            if self.should_uninitialize {
                unsafe {
                    CoUninitialize();
                }
            }
        }
    }

    fn normalize_selected_text(text: &str) -> String {
        text.replace("\r\n", "\n")
            .replace('\r', "\n")
            .lines()
            .map(|line| line.split_whitespace().collect::<Vec<_>>().join(" "))
            .filter(|line| !line.is_empty())
            .collect::<Vec<_>>()
            .join("\n")
    }
}
