# AetherCursor

AetherCursor is a desktop smart cursor framework prototype. Phase 1 focuses on the explicit interaction loop:

```text
activate -> select region -> capture local context -> choose intent -> apply policy -> route agent -> render result
```

## Development

Prerequisites:

- Node.js 22 or newer
- npm
- Rust and Cargo for desktop/Tauri commands

Install dependencies:

```bash
npm install
```

Run the frontend debug window:

```bash
npm run dev
```

Run the Tauri desktop shell after Rust/Cargo is installed:

```bash
npm run dev:desktop
```

Quality checks:

```bash
npm run typecheck
npm run lint
npm run test
```

## Project Layout

- `src/` - React UI, shared protocols, and framework modules.
- `src-tauri/` - Tauri desktop shell and Rust command layer.
- `schemas/` - JSON schemas for context, agent manifests, and results.
- `agents/` - built-in and development agent manifests.
- `docs/` - implementation notes and validation records.

## Protocols

Phase 1 core data boundaries are defined in:

- `schemas/context.schema.json` and `src/shared/context.ts`
- `schemas/agent-manifest.schema.json` and `src/shared/agent.ts`
- `schemas/agent-result.schema.json` and `src/shared/result.ts`
