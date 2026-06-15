# P5 Validation

P5 implements the region selection layer for `Alt + drag`.

## Deliverables

- `src/selection/selectionGeometry.ts`
- `src/selection/SelectionLayer.tsx`
- `src/selection/SelectionLayer.css`
- `src/selection/selectionGeometry.test.ts`
- Shared minimum selection size between input mapping and selection rendering.
- Pointer capture during Alt-drag inside the WebView.

## Expected Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Manual Validation

- Hold `Alt` and drag: selection rectangle follows the pointer.
- Drag in any direction: rectangle coordinates normalize correctly.
- Very small drag: selection is visually marked too small and does not proceed to resolving on release.
- Release after a valid drag: state enters `resolving`.
- Press `Esc`: selection clears and state returns to `normal`.

## 2026-06-13 Result

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run test`: passed, 6 test files and 27 tests.
- `npm.cmd run build`: passed.

Desktop shell dependency check:

- `cargo --version`: passed with `cargo 1.96.0`.
- `rustc --version`: passed with `rustc 1.96.0`.
- `.\node_modules\.bin\tauri.cmd --version`: passed with `tauri-cli 2.11.2`.
- `cargo check`: passed after adding project-level Tsinghua mirror config and a development `icons/icon.ico`.

Rust dependencies resolved by Cargo:

- `tauri`
- `tauri-build`
- `serde`
- `serde_json`

Original Cargo error before switching to the project-level Tsinghua mirror:

```text
error: failed to get `serde` as a dependency of package `aethercursor v0.1.0 (C:\project\aethercursor\src-tauri)`
Caused by:
  failed to load source for dependency `serde`
Caused by:
  unable to update registry `crates-io`
Caused by:
  download of config.json failed
Caused by:
  curl failed
Caused by:
  [35] SSL connect error (schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS (0x8009030e) - 安全包中没有可用的凭证)
```

Mirror config:

- `.cargo/config.toml`
- Source: `sparse+https://mirrors.tuna.tsinghua.edu.cn/crates.io-index/`
