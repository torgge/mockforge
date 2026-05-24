# MockForge — Implementation Plan

**Version:** 1.0.0  
**Status:** Final  
**Last Updated:** 2026-05-23  
**Parent Document:** [MockForge SDD](mockforge-sdd.md)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Conventions](#2-conventions)
3. [Phase 1 — Foundation](#3-phase-1--foundation)
4. [Phase 2 — Core Features](#4-phase-2--core-features)
5. [Phase 3 — Generator Engine](#5-phase-3--generator-engine)
6. [Phase 4 — Polish & Distribution](#6-phase-4--polish--distribution)
7. [Dependency Graph](#7-dependency-graph)

---

## 1. Overview

This document translates the SDD Implementation Roadmap (Section 11) into an executable, step-by-step plan. Each task is broken into subtasks with explicit ordering, dependencies, and acceptance criteria.

**Notation:**

- Tasks follow the format `P<phase>-T<task>` (e.g., `P1-T01`)
- Subtasks follow the format `P<phase>-T<task>.<subtask>` (e.g., `P1-T01.1`)
- Dependencies reference task or subtask IDs
- Acceptance criteria are verifiable assertions, not descriptions

---

## 2. Conventions

### Branching Strategy

```
main
 └── feat/p1-foundation
      ├── feat/p1-t01-scaffolding
      ├── feat/p1-t02-database
      ├── feat/p1-t03-ipc-bridge
      ├── feat/p1-t04-security
      └── feat/p1-t05-renderer-ui
```

Each phase gets a parent branch. Each task gets a feature branch off the phase branch. Merge into the phase branch on task completion; merge phase branch into `main` when exit criteria are met.

### Commit Convention

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Usage |
|---|---|
| `feat:` | New feature or capability |
| `fix:` | Bug fix |
| `chore:` | Tooling, config, dependencies |
| `docs:` | Documentation only |
| `test:` | Adding or fixing tests |
| `refactor:` | Code change that neither fixes a bug nor adds a feature |

### Definition of Done (per task)

A task is considered done when all of the following are true:

1. All subtasks are completed
2. All acceptance criteria pass
3. Code compiles without errors (`npm run build`)
4. No TypeScript `any` types introduced (strict mode)
5. Commit pushed to task branch
6. Branch merged into phase branch

---

## 3. Phase 1 — Foundation

**Goal:** Working Electron application with database connectivity and typed IPC bridge.

**Phase exit criteria:** App launches, connects to SQLite, and a round-trip IPC call succeeds end-to-end (Renderer → Main → DB → Main → Renderer).

---

### P1-T01 — Project Scaffolding

**Dependencies:** None  
**Branch:** `feat/p1-t01-scaffolding`

| # | Subtask | Details |
|---|---|---|
| P1-T01.1 | Initialize electron-vite project | Run `npm create @quick-start/electron mockforge -- --template react-ts`. Verify generated structure has `src/main`, `src/preload`, `src/renderer`. |
| P1-T01.2 | Configure TypeScript paths | Add path alias `@shared/*` → `src/shared/*` in `tsconfig.json` (all three: main, preload, renderer). Create `src/shared/` directory. |
| P1-T01.3 | Create shared types placeholder | Create `src/shared/ipc.types.ts` with all interfaces from SDD §8.1 (`Project`, `Schema`, `Field`, `FieldType`, `FieldRule`, `GenerateRequest`). |
| P1-T01.4 | Create channel constants | Create `src/shared/ipc.channels.ts` with all 12 channel name constants from SDD §8.2. |
| P1-T01.5 | Verify dev server | Run `npm run dev`. Electron window opens with default React page. |

**Acceptance Criteria:**
- `npm run dev` launches Electron with React renderer
- `src/shared/ipc.types.ts` exports all SDD §8.1 types
- `src/shared/ipc.channels.ts` exports all 12 channel constants
- TypeScript compiles with zero errors

---

### P1-T02 — Database Setup

**Dependencies:** P1-T01  
**Branch:** `feat/p1-t02-database`

| # | Subtask | Details |
|---|---|---|
| P1-T02.1 | Install dependencies | `npm install better-sqlite3 drizzle-orm` and `npm install -D drizzle-kit @types/better-sqlite3` |
| P1-T02.2 | Define Drizzle schema | Create `src/main/db/schema.ts` with all 4 tables from SDD §7.1 (projects, schemas, fields, settings). |
| P1-T02.3 | Create DB client singleton | Create `src/main/db/client.ts`. DB file path: `app.getPath('userData')/mockforge.db`. Initialize with `drizzle(new Database(dbPath))`. |
| P1-T02.4 | Setup migrations | Configure `drizzle-kit` in `drizzle.config.ts`. Generate initial migration. Apply on app startup. |
| P1-T02.5 | Seed default settings | On first launch, insert `max_generation_limit = '1000'` if not exists. |

**Acceptance Criteria:**
- App starts and creates `mockforge.db` in user data directory
- All 4 tables exist after migration
- `settings` table has `max_generation_limit` = `1000`
- DB persists across app restarts

---

### P1-T03 — IPC Bridge

**Dependencies:** P1-T02  
**Branch:** `feat/p1-t03-ipc-bridge`

| # | Subtask | Details |
|---|---|---|
| P1-T03.1 | Create handler registry | Create `src/main/ipc/handlers.ts` with `registerAllHandlers()` function. Register all 12 channels with stub implementations returning mock data. |
| P1-T03.2 | Setup preload bridge | Create `src/preload/index.ts` implementing the full `contextBridge` contract from SDD §8.3. |
| P1-T03.3 | Create window type declaration | Create `src/shared/window.d.ts` declaring `window.mockforge` with full typing. |
| P1-T03.4 | Verify round-trip IPC | Call `window.mockforge.project.list()` from renderer → returns mock data from main process. |

**Acceptance Criteria:**
- All 12 IPC channels registered
- `window.mockforge` fully typed
- Round-trip IPC call succeeds (renderer → main → renderer)

---

### P1-T04 — Security Hardening

**Dependencies:** P1-T03  
**Branch:** `feat/p1-t04-security`

| # | Subtask | Details |
|---|---|---|
| P1-T04.1 | Enforce secure defaults | Verify `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` in BrowserWindow options. |
| P1-T04.2 | Add CSP header | Set Content-Security-Policy via `session.defaultSession.webRequest.onHeadersReceived`. |
| P1-T04.3 | Disable remote module | Ensure `enableRemoteModule: false`. |
| P1-T04.4 | Block navigation | Add `will-navigate` and `new-window` event handlers to prevent external URLs. |

**Acceptance Criteria:**
- DevTools console shows no CSP violations
- `window.require` is undefined in renderer
- Navigation to external URLs is blocked

---

### P1-T05 — Renderer UI Setup

**Dependencies:** P1-T01  
**Branch:** `feat/p1-t05-renderer-ui`

| # | Subtask | Details |
|---|---|---|
| P1-T05.1 | Install UI dependencies | `npm install tailwindcss @tailwindcss/vite` and configure. Install shadcn/ui CLI and init. |
| P1-T05.2 | Configure Tailwind | Setup `tailwind.config.ts` with shadcn/ui presets. |
| P1-T05.3 | Create app layout shell | Create `src/renderer/components/Layout.tsx` with persistent left sidebar and content area. |
| P1-T05.4 | Setup routing | Install and configure React Router. Create placeholder pages for Projects, SchemaEditor, Generator, Settings. |
| P1-T05.5 | Install Zustand | `npm install zustand`. Create initial store slices: `project.slice.ts`, `schema.slice.ts`, `generator.slice.ts`. |

**Acceptance Criteria:**
- Tailwind classes render correctly
- shadcn/ui Button component works
- Sidebar navigates between 4 placeholder pages
- Zustand store structure in place

---

## 4. Phase 2 — Core Features

**Goal:** Full project and schema management working end-to-end.

**Phase exit criteria:** User can create a project, import Avro schema, and configure field rules through the UI.

---

### P2-T01 — Project Repository

**Dependencies:** P1-T02  
**Branch:** `feat/p2-t01-project-repo`

| # | Subtask | Details |
|---|---|---|
| P2-T01.1 | Implement ProjectService | Create `src/main/services/project.service.ts` with `create`, `list`, `update`, `delete`, `search`. |
| P2-T01.2 | Wire IPC handlers | Replace stubs in `handlers.ts` for all 5 project channels. |
| P2-T01.3 | Add cascade delete | Deleting a project cascades to its schema and all fields. |
| P2-T01.4 | Add validation | Validate name is non-empty. Validate project exists on update/delete. |
| P2-T01.5 | Write tests | Unit tests for all CRUD operations and edge cases. |

**Acceptance Criteria:**
- All 5 project IPC channels return real data from SQLite
- Cascade delete removes schema and fields
- Creating a project auto-creates an empty schema

---

### P2-T02 — Schema Repository

**Dependencies:** P2-T01  
**Branch:** `feat/p2-t02-schema-repo`

| # | Subtask | Details |
|---|---|---|
| P2-T02.1 | Implement SchemaService | Create `src/main/services/schema.service.ts` with `getByProject` (returns schema + fields tree). |
| P2-T02.2 | Implement field tree builder | Build nested field tree from flat DB rows (using `parent_field_id`). |
| P2-T02.3 | Implement field rule update | `updateRule(fieldId, rule)` — validates rule against field type before saving. |
| P2-T02.4 | Wire IPC handlers | Replace stubs for `schema:getByProject` and `field:updateRule`. |
| P2-T02.5 | Write tests | Test field tree building, rule validation, type/rule compatibility matrix. |

**Acceptance Criteria:**
- `schema:getByProject` returns schema with nested field tree
- Rule validation rejects invalid type/rule combinations
- Field tree correctly handles any nesting depth

---

### P2-T03 — Avro Import Service

**Dependencies:** P2-T02  
**Branch:** `feat/p2-t03-avro-import`

| # | Subtask | Details |
|---|---|---|
| P2-T03.1 | Install avsc | `npm install avsc`. |
| P2-T03.2 | Implement AvroParser | Create `src/main/services/avro-parser.ts`. Parse Avro JSON → flat field array with parent references. Handle all type mappings from SDD Appendix A. |
| P2-T03.3 | Handle unions | Implement union resolution: 2 types, 3+ types, no-null unions per Appendix A. |
| P2-T03.4 | Implement import flow | Delete existing fields → insert new fields → update `avro_source` on schema. Wrap in transaction. |
| P2-T03.5 | Wire IPC handler | Replace stub for `schema:importAvro`. |
| P2-T03.6 | Write tests | Test with simple, nested, union, and invalid schemas. Use fixture `.avsc` files. |

**Acceptance Criteria:**
- Valid Avro schema produces correct field tree
- Invalid schema returns descriptive error
- Import replaces existing fields atomically (transaction)
- All Avro type mappings from Appendix A are covered

---

### P2-T04 — Projects Page UI

**Dependencies:** P2-T01, P1-T05  
**Branch:** `feat/p2-t04-projects-ui`

| # | Subtask | Details |
|---|---|---|
| P2-T04.1 | Create project list component | Fetch projects via `window.mockforge.project.list()`. Display as cards per SDD Screen 1. |
| P2-T04.2 | Create project form | Modal or inline form with name (required) and description (optional) fields. Uses react-hook-form + Zod. |
| P2-T04.3 | Implement search | Real-time filter using `window.mockforge.project.search()`. Debounced input. |
| P2-T04.4 | Implement edit/delete | Edit via modal. Delete with confirmation dialog (shadcn AlertDialog). |
| P2-T04.5 | Navigation | Clicking a project card navigates to Schema Editor with project ID. |

**Acceptance Criteria:**
- Projects are listed, created, edited, deleted through the UI
- Search filters in real-time
- Delete requires confirmation
- Navigation to Schema Editor works

---

### P2-T05 — Schema Editor Page UI

**Dependencies:** P2-T02, P2-T03, P2-T04  
**Branch:** `feat/p2-t05-schema-editor-ui`

| # | Subtask | Details |
|---|---|---|
| P2-T05.1 | Create field tree component | Recursive tree rendering. Expand/collapse for `object` type fields. Shows field name, type, current rule. |
| P2-T05.2 | Create rule configurator | Side panel or inline form. Dynamically shows valid rule options based on field type. Uses react-hook-form + Zod. |
| P2-T05.3 | Implement Avro import UI | "Import Avro" button → OS file picker. Confirmation dialog if fields exist. Call `schema:importAvro`. |
| P2-T05.4 | Implement rule save | Call `field:updateRule` on save. Show success toast. |
| P2-T05.5 | Navigation | Breadcrumb back to Projects. "Go to Generator" button. |

**Acceptance Criteria:**
- Field tree renders correctly for nested schemas
- Rule configurator validates by field type
- Avro import works end-to-end through UI
- Changes persist across navigation

---

## 5. Phase 3 — Generator Engine

**Goal:** Complete data generation pipeline from schema to JSON output.

**Phase exit criteria:** Full end-to-end flow — generate, view, copy, export.

---

### P3-T01 — Generation Strategies

**Dependencies:** P2-T02  
**Branch:** `feat/p3-t01-strategies`

| # | Subtask | Details |
|---|---|---|
| P3-T01.1 | Create strategy interface | Define `GenerationStrategy` interface: `generate(field: Field): unknown`. |
| P3-T01.2 | Implement RangeStrategy | Uses `faker.number.int({ min, max })` for integers, `faker.number.float()` for decimals. |
| P3-T01.3 | Implement EnumStrategy | Uses `faker.helpers.arrayElement(values)`. |
| P3-T01.4 | Implement FormatStrategy | Handles `uuid`, `date`, `datetime` subtypes using Faker. |
| P3-T01.5 | Implement DefaultStrategy | No-rule fallback: string → `faker.lorem.word()`, number → `faker.number.int()`, boolean → `faker.datatype.boolean()`. |
| P3-T01.6 | Create strategy factory | `getStrategy(field: Field): GenerationStrategy` — selects based on rule kind. |
| P3-T01.7 | Write tests | Each strategy tested independently. Edge cases: empty enum, min=max, etc. |

**Acceptance Criteria:**
- Each strategy produces values within specified constraints
- Factory correctly maps rule kinds to strategies
- Default strategy covers all primitive types

---

### P3-T02 — Nested Field Resolver

**Dependencies:** P3-T01  
**Branch:** `feat/p3-t02-nested-resolver`

| # | Subtask | Details |
|---|---|---|
| P3-T02.1 | Implement recursive resolver | Given a field tree, recursively generate JSON objects respecting nesting. |
| P3-T02.2 | Handle object fields | Generate child fields as nested object properties. |
| P3-T02.3 | Handle array fields | Generate 1-5 elements, each using child field definitions. |
| P3-T02.4 | Handle empty object | Object with no children → `{}`. |
| P3-T02.5 | Write tests | Test flat, nested (2+ levels), array, empty object, mixed schemas. |

**Acceptance Criteria:**
- Nested objects generate correctly to any depth
- Arrays generate variable-length child elements
- Empty objects produce `{}`

---

### P3-T03 — Generator Engine

**Dependencies:** P3-T01, P3-T02  
**Branch:** `feat/p3-t03-generator-engine`

| # | Subtask | Details |
|---|---|---|
| P3-T03.1 | Implement GeneratorService | Create `src/main/services/generator.service.ts`. Accepts `GenerateRequest`, fetches field tree, generates N objects. |
| P3-T03.2 | Wire IPC handler | Replace stub for `generator:run`. |
| P3-T03.3 | Validate quantity | Check `1 ≤ quantity ≤ max_generation_limit`. Read limit from settings table. |
| P3-T03.4 | Performance test | Generate 1,000 records < 2 seconds, 10,000 records < 10 seconds. |

**Acceptance Criteria:**
- Generator produces correct JSON arrays
- Quantity validation works against dynamic settings
- Performance targets met (NFR-01, NFR-02)

---

### P3-T04 — JSON Viewer UI

**Dependencies:** P3-T03, P2-T05  
**Branch:** `feat/p3-t04-json-viewer`

| # | Subtask | Details |
|---|---|---|
| P3-T04.1 | Install JSON viewer | `npm install react-json-view-lite`. |
| P3-T04.2 | Create Generator page | Implement Screen 3 from SDD. Quantity input + Generate button. |
| P3-T04.3 | Render JSON output | Display generated data in collapsible tree viewer. |
| P3-T04.4 | Implement copy to clipboard | Copy button → `navigator.clipboard.writeText()`. Toast confirmation. |
| P3-T04.5 | Wire to Zustand | Store generated data in `generator.slice.ts`. |

**Acceptance Criteria:**
- JSON viewer renders with syntax highlighting
- Copy to clipboard works
- 1,000 objects render without jank

---

### P3-T05 — Export Service

**Dependencies:** P3-T04  
**Branch:** `feat/p3-t05-export`

| # | Subtask | Details |
|---|---|---|
| P3-T05.1 | Implement ExportService | Create `src/main/services/export.service.ts`. Uses `dialog.showSaveDialog()` + `fs.writeFileSync()`. |
| P3-T05.2 | Wire IPC handler | Replace stub for `export:toFile`. |
| P3-T05.3 | Default filename | Pattern: `{project-name}-{timestamp}.json`. |
| P3-T05.4 | Add export button to Generator page | Call `export:toFile` with current generated data. |

**Acceptance Criteria:**
- Export opens native save dialog
- File is written with correct JSON content
- Default filename follows the pattern
- Cancelled dialog returns null gracefully

---

## 6. Phase 4 — Polish & Distribution

**Goal:** Production-ready application with full quality assurance.

**Phase exit criteria:** Distributable installers for 3 platforms, all FR/NFR verified.

---

### P4-T01 — Settings Screen

**Dependencies:** P1-T03, P1-T05  
**Branch:** `feat/p4-t01-settings`

| # | Subtask | Details |
|---|---|---|
| P4-T01.1 | Create Settings page | Implement Screen 4 from SDD. Numeric input for `max_generation_limit`. |
| P4-T01.2 | Load current value | Fetch from `settings:get` on mount. |
| P4-T01.3 | Save with validation | Validate range 1–10000. Call `settings:set`. Show toast. |

**Acceptance Criteria:**
- Settings page displays and saves correctly
- Validation prevents invalid values
- Changes affect generator immediately

---

### P4-T02 — Error Handling

**Dependencies:** P3-T03, P2-T03  
**Branch:** `feat/p4-t02-error-handling`

| # | Subtask | Details |
|---|---|---|
| P4-T02.1 | Create useIpc hook | Wraps `window.mockforge.*` calls with try/catch, loading state, and error state. |
| P4-T02.2 | Global error boundary | React error boundary with user-friendly fallback. |
| P4-T02.3 | IPC error display | Toast notifications for IPC errors. |
| P4-T02.4 | Edge case handling | Empty schema generation, max limit, deep nesting (5+ levels). |

**Acceptance Criteria:**
- All IPC errors display user-friendly messages
- App doesn't crash on malformed data
- Edge cases handled gracefully

---

### P4-T03 — Keyboard Navigation

**Dependencies:** P2-T04, P2-T05, P3-T04  
**Branch:** `feat/p4-t03-keyboard`

| # | Subtask | Details |
|---|---|---|
| P4-T03.1 | Focus management | Tab order follows logical flow on each screen. |
| P4-T03.2 | Keyboard shortcuts | Enter to submit forms, Escape to close modals. |
| P4-T03.3 | Tree navigation | Arrow keys to navigate field tree in Schema Editor. |

**Acceptance Criteria:**
- All screens are fully navigable via keyboard
- Focus indicators are visible
- NFR-04 verified

---

### P4-T04 — Packaging

**Dependencies:** All previous  
**Branch:** `feat/p4-t04-packaging`

| # | Subtask | Details |
|---|---|---|
| P4-T04.1 | Configure electron-builder | Setup `electron-builder.yml` with targets for macOS (.dmg), Windows (.exe/.msi), Linux (.AppImage/.deb). |
| P4-T04.2 | App metadata | Name, version, icons, bundle ID. |
| P4-T04.3 | Build scripts | `npm run build:mac`, `npm run build:win`, `npm run build:linux`. |
| P4-T04.4 | Native dependency handling | Ensure `better-sqlite3` is rebuilt for each platform. |
| P4-T04.5 | Cold start verification | Verify < 3 seconds on each platform (NFR-03). |

**Acceptance Criteria:**
- Installers generated for all 3 platforms
- App installs and runs without errors
- Cold start < 3 seconds

---

### P4-T05 — Final QA

**Dependencies:** All previous  
**Branch:** `feat/p4-t05-qa`

| # | Subtask | Details |
|---|---|---|
| P4-T05.1 | Full walkthrough | Execute every user story (US-01 through US-10) end-to-end. |
| P4-T05.2 | FR verification | Verify all functional requirements (FR-01 through FR-06). |
| P4-T05.3 | Edge case testing | Empty schema generation, max limit generation (10,000), re-import over existing fields, rapid consecutive generates, very deep nesting (5 levels). |
| P4-T05.4 | Cross-platform verification | Run walkthrough on macOS, Windows, and Linux. Verify DB path, file dialogs, and clipboard all work per platform. |

**Acceptance Criteria:**
- All functional requirements (FR-01 through FR-06) verified
- All non-functional requirements (NFR-01 through NFR-10) verified
- No data loss on unexpected app exit (NFR-07)
- All edge cases handled gracefully

---

## 7. Dependency Graph

```
P1-T01 (Scaffolding)
  ├──→ P1-T02 (Database)
  │       └──→ P1-T03 (IPC Bridge)
  │               └──→ P1-T04 (Security)
  └──→ P1-T05 (Renderer UI)

P1-T02 ──→ P2-T01 (Project Repo)
              └──→ P2-T02 (Schema Repo)
                      └──→ P2-T03 (Avro Import)

P2-T01 + P1-T05 ──→ P2-T04 (Projects UI)
P2-T02 + P2-T03 + P2-T04 ──→ P2-T05 (Schema Editor UI)

P2-T02 ──→ P3-T01 (Strategies)
              └──→ P3-T02 (Nested Resolver)

P3-T01 + P3-T02 ──→ P3-T03 (Generator Engine)
P3-T03 + P2-T05 ──→ P3-T04 (JSON Viewer UI)
P3-T04 ──→ P3-T05 (Export)

P1-T03 + P1-T05 ──→ P4-T01 (Settings)
P3-T03 + P2-T03 ──→ P4-T02 (Error Handling)
P2-T04 + P2-T05 + P3-T04 ──→ P4-T03 (Keyboard)
All ──→ P4-T04 (Packaging)
All ──→ P4-T05 (Final QA)
```
