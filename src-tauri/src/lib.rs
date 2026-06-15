use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};

#[tauri::command]
fn app_status() -> &'static str {
    "p0-ready"
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
}

#[tauri::command]
fn capture_region(request: CaptureRegionRequest) -> Result<CaptureRegionResponse, String> {
    if request.context_id.trim().is_empty() {
        return Err("context_id is required".to_string());
    }

    if request.width <= 0 || request.height <= 0 {
        return Err("capture region must have positive width and height".to_string());
    }

    let path = capture_path(&request.context_id)?;

    capture_region_to_file(&request, &path)?;

    Ok(CaptureRegionResponse {
        context_id: request.context_id,
        image_ref: format!(
            "local://capture/{}.bmp",
            path.file_stem().unwrap().to_string_lossy()
        ),
        file_path: path.to_string_lossy().into_owned(),
        width: request.width,
        height: request.height,
    })
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_status, capture_region])
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
