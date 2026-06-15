# P0 Validation

This file records the commands used to verify the project skeleton.

## Expected Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run dev
```

Desktop shell validation requires Rust and Cargo:

```bash
npm run dev:desktop
```

## 2026-06-13 Result

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 1 test file and 2 tests.
- `npm run build`: passed.
- `npm run dev`: Vite starts successfully at `http://127.0.0.1:1420/` when run in the foreground. The managed shell used for this session does not keep a background dev server alive after the command exits.
- `cargo check`: passed after Rust/Cargo installation, Tsinghua Cargo mirror configuration, and development icon setup.

Notes:

- PowerShell blocks `npm.ps1` on this machine, so validation used `npm.cmd`.
- Dependency installation used a workspace-local npm cache: `npm.cmd install --ignore-scripts --cache .\.npm-cache`.
- Install scripts were skipped because the first full install timed out during package setup. Re-run `npm.cmd install --cache .\.npm-cache` after Rust/Cargo and Tauri prerequisites are available.
- `Start-Process` cannot launch the dev server in this environment because the process environment contains duplicate `Path`/`PATH` keys.
- `npm audit --audit-level=high --cache .\.npm-cache` could not reach the npm audit endpoint and failed with `EACCES`.
- The desktop shell dependency graph is now validated with `cargo check`. The interactive GUI command `npm.cmd run dev:desktop` is intentionally not kept running from this managed terminal.
