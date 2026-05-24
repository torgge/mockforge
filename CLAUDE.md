# CLAUDE.md — MockForge Project Instructions

## Project Overview

MockForge is an offline desktop application (Electron + TypeScript) for generating structured mock JSON data from user-defined schemas. Full specification is in `docs/mockforge-sdd.md`.

## Key Documents

- **SDD:** `docs/mockforge-sdd.md` — authoritative reference for all architecture, data model, IPC, and UI decisions
- **Implementation Plan:** `docs/mockforge-implementation-plan.md` — 20 tasks, 85+ subtasks across 4 phases
- **Parallel Execution Plan:** `docs/mockforge-parallel-execution-plan.md` — wave-based parallel strategy with 3 agents

Always read the relevant document sections before implementing. The SDD is the source of truth for any ambiguity.

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Desktop runtime | Electron | 33.x |
| Build tool | electron-vite | 3.x |
| Language | TypeScript | 5.x (strict mode, no `any`) |
| UI framework | React | 19.x |
| UI components | shadcn/ui | latest |
| CSS | Tailwind CSS | 4.x |
| State | Zustand | 5.x (slices pattern) |
| Forms | react-hook-form + Zod | latest |
| Database | better-sqlite3 + Drizzle ORM | latest |
| Schema import | Custom Avro parser (JSON.parse) | built-in |
| Data generation | @faker-js/faker | 9.x |
| JSON viewer | react-json-view-lite | latest |
| Packaging | electron-builder | latest |

## Architecture

```
Renderer (React) → contextBridge (IPC) → Main (Node.js) → SQLite (Drizzle)
```

- **Main process:** business logic, DB, file system, IPC handlers
- **Preload:** typed contextBridge exposing `window.mockforge`
- **Renderer:** React UI only, calls `window.mockforge.*` for all data
- **Shared:** types, channel constants, Zod validation — frozen after Wave 0

## Directory Structure

```
src/
├── main/               # Electron main process
│   ├── index.ts         # App entry, window creation
│   ├── db/              # Drizzle schema + client
│   ├── ipc/             # Handler registry + stubs
│   └── services/        # Business logic
├── preload/             # contextBridge setup
│   └── index.ts
├── shared/              # Shared contracts (FROZEN after Wave 0)
│   ├── ipc.types.ts     # All interfaces (Project, Schema, Field, etc.)
│   ├── ipc.channels.ts  # 12 channel name constants
│   ├── window.d.ts      # window.mockforge type declaration
│   └── validation.ts    # Zod schemas
└── renderer/            # React UI
    ├── App.tsx
    ├── components/
    ├── pages/
    ├── hooks/
    │   └── useIpc.ts
    └── store/
        ├── project.slice.ts
        ├── schema.slice.ts
        └── generator.slice.ts
test/
└── fixtures/            # Avro test schemas (.avsc)
```

## Coding Conventions

### TypeScript
- Strict mode always enabled
- No `any` types — use `unknown` and narrow
- All IPC payloads validated with Zod before processing
- Prefer interfaces over types for objects
- Use `as const` for string literal unions

### Naming
- Files: `kebab-case.ts` for modules, `PascalCase.tsx` for React components
- Variables/functions: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE` for channel names, `camelCase` for everything else
- DB columns: `snake_case`

### Imports
- Use `@shared/` path alias for shared modules
- Prefer named exports over default exports
- Group imports: external libs → shared → local

### Error Handling
- Main process: throw `Error` with descriptive message from IPC handlers
- Renderer: `useIpc` hook catches errors and exposes them via state
- Never swallow errors silently

## Git Conventions

### Branching

```
main
 ├── wave-0/bootstrap
 ├── wave-1/backend       (Agent A)
 ├── wave-1/frontend      (Agent B)
 ├── wave-1/generator     (Agent C)
 ├── wave-2/integration
 └── wave-3/release
```

Feature branches off wave branches: `feat/project-service`, `feat/strategies`, etc.

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add project CRUD service
fix: handle empty schema on generation
chore: install shadcn/ui dependencies
test: add Avro union parsing tests
refactor: extract field tree builder
docs: update SDD with settings screen
```

Keep commits atomic — one logical change per commit. Prefer many small commits over one large commit.

### Definition of Done (per task)

1. All subtasks completed
2. All acceptance criteria pass
3. `npm run build` succeeds with zero errors
4. No TypeScript `any` types introduced
5. Committed and pushed to correct branch

## File Ownership (Wave 1)

During parallel development, agents own specific directories:

| Agent | Owns | Read-only |
|---|---|---|
| A (Backend) | `src/main/services/`, `src/main/ipc/handlers.ts` | `src/main/db/`, `src/shared/` |
| B (Frontend) | `src/renderer/` | `src/main/`, `src/preload/`, `src/shared/` |
| C (Generator) | `src/main/services/generator.service.ts`, `src/main/services/strategies/`, `src/main/services/nested-resolver.ts` | everything else |

**`src/shared/` is frozen after Wave 0.** If a contract change is needed, file an issue — do not edit in place.

## IPC Channels Reference

12 channels total:

```
project:create    project:list    project:update
project:delete    project:search
schema:getByProject    schema:importAvro
field:updateRule
generator:run
export:toFile
settings:get    settings:set
```

All handlers: success returns result directly, error throws `Error` with message.

## Testing

- Unit tests for services and strategies
- Test fixtures in `test/fixtures/` (`.avsc` files)
- Run with: `npm test`
- Performance targets: 1,000 records < 2s, 10,000 records < 10s

## Common Pitfalls

- **Electron security:** Always keep `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`
- **better-sqlite3:** Needs native rebuild per platform — use `electron-builder` rebuild config
- **Tailwind v4:** Different config format from v3 — use `@import "tailwindcss"` in CSS, not `@tailwind` directives
- **Zustand slices:** Each domain gets its own file to avoid merge conflicts
- **IPC return types:** Always match the types in `src/shared/ipc.types.ts` exactly
- **DB path:** Use `app.getPath('userData')` — never hardcode paths
