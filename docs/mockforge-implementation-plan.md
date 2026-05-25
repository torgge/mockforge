# MockForge — Implementation Plan

**Version:** 1.1.0  
**Status:** Final  
**Last Updated:** 2026-05-25  
**Parent Document:** [MockForge SDD](mockforge-sdd.md)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Conventions](#2-conventions)
3. [Phase 1 — Foundation](#3-phase-1--foundation)
4. [Phase 2 — Core Features](#4-phase-2--core-features)
5. [Phase 3 — Generator Engine](#5-phase-3--generator-engine)
6. [Phase 4 — Polish & Distribution](#6-phase-4--polish--distribution)
7. [Phase 5 — CI/CD Pipeline](#7-phase-5--cicd-pipeline)
8. [Phase 6 — Product Enhancements](#8-phase-6--product-enhancements)
9. [Phase 7 — Quality & Testing Expansion](#9-phase-7--quality--testing-expansion)
10. [Dependency Graph](#10-dependency-graph)

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

## 7. Phase 5 — CI/CD Pipeline

**Goal:** Automatizar o empacotamento e a publicação de releases via GitHub Actions, produzindo instaladores para as três plataformas em cada tag de versão.

**Phase exit criteria:** Ao fazer push de uma tag `v*.*.*`, o pipeline é disparado e uma GitHub Release é criada com os artefatos `.dmg`, `.exe` NSIS, `.AppImage` e `.deb` anexados. `workflow_dispatch` permite builds manuais sob demanda.

---

### P5-T01 — GitHub Actions Release Pipeline

**Dependencies:** P4-T04  
**Branch:** `feat/p5-t01-cicd`

| # | Subtask | Details |
|---|---|---|
| P5-T01.1 | Create workflow file | Create `.github/workflows/release.yml`. Configure `on.push.tags: ['v*.*.*']` and `on.workflow_dispatch` triggers. The `workflow_dispatch` input is parameter-free; the version is derived from `GITHUB_REF_NAME`. |
| P5-T01.2 | Configure `build` job matrix | Define a `build` job with `strategy.matrix.os: [macos-latest, windows-latest, ubuntu-latest]`. All three legs run in parallel with `fail-fast: false` so a single platform failure does not cancel the others. |
| P5-T01.3 | Set up Node 20 and npm cache | Use `actions/setup-node@v4` with `node-version: '20'` and `cache: 'npm'` on each runner. Pin Node to the same major version used in local development. |
| P5-T01.4 | Install and rebuild native deps | Run `npm ci` then `npx electron-builder install-app-deps` to rebuild `better-sqlite3` against the Electron ABI for each platform. This replaces any pre-built binary with a platform-native one. |
| P5-T01.5 | TypeScript compile check | Run `npm run typecheck` (or `npm run build:ts`) before packaging to catch type errors in CI before invoking `electron-builder`. Fail fast on any TypeScript error. |
| P5-T01.6 | Run platform build | Execute `npm run build:mac` on `macos-latest`, `npm run build:win` on `windows-latest`, `npm run build:linux` on `ubuntu-latest`. Each script invokes `electron-builder` with the respective platform target. |
| P5-T01.7 | Configure macOS output | `electron-builder` target: `dmg`. Expected artifact: `MockForge-{version}.dmg`. Optional: populate `CSC_LINK` (base64-encoded `.p12` certificate) and `CSC_KEY_PASSWORD` GitHub repository secrets to enable Apple code signing; if secrets are absent, the build proceeds unsigned. |
| P5-T01.8 | Configure Windows output | `electron-builder` target: `nsis`. Expected artifact: `MockForge-Setup-{version}.exe`. Optional: populate `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD` secrets for Authenticode signing; unsigned build proceeds if absent. |
| P5-T01.9 | Configure Linux output | `electron-builder` targets: `AppImage`, `deb`. Expected artifacts: `MockForge-{version}.AppImage`, `mockforge_{version}_amd64.deb`. No signing required for Linux targets. |
| P5-T01.10 | Upload per-platform artifacts | Use `actions/upload-artifact@v4` at the end of each matrix leg to pass installer files to the `release` job. Name each artifact by platform (e.g., `release-macos`, `release-windows`, `release-linux`). |
| P5-T01.11 | Configure `release` job | Add a `release` job with `needs: build` and `runs-on: ubuntu-latest`. Use `actions/download-artifact@v4` to collect all platform artifacts. Create a GitHub Release with `softprops/action-gh-release@v2`: attach all installers, set `generate_release_notes: true` to auto-populate the body from commit history, and mark as draft when triggered by `workflow_dispatch` for review before publishing. |

**Acceptance Criteria:**
- Pushing a tag matching `v*.*.*` triggers the workflow automatically; no manual step required
- `workflow_dispatch` allows an on-demand build from any branch; resulting release is created as a draft
- `build` job runs all three platform legs in parallel via matrix strategy
- macOS leg produces a `.dmg` installer and uploads it as an artifact
- Windows leg produces an NSIS `.exe` installer and uploads it as an artifact
- Linux leg produces both `.AppImage` and `.deb` installers and uploads them as artifacts
- All four artifact types are attached to the GitHub Release by the `release` job
- `release` job does not run if any `build` leg fails (`needs: build` enforces this)
- `better-sqlite3` is rebuilt against the Electron ABI on each platform via `install-app-deps`
- TypeScript compile step fails the pipeline before packaging if type errors are present
- macOS signing is configurable via `CSC_LINK` + `CSC_KEY_PASSWORD` secrets; absent secrets produce an unsigned build without pipeline failure
- Windows signing is configurable via `WIN_CSC_LINK` + `WIN_CSC_KEY_PASSWORD` secrets; absent secrets produce an unsigned build without pipeline failure
- Pipeline produces no hardcoded paths, tokens, or credentials in the workflow file; all sensitive values are referenced from repository secrets

---

## 8. Phase 6 — Product Enhancements

**Goal:** Elevar a experiência do usuário com ícone de aplicação, atualizações automáticas e suporte completo a schemas Avro reais do Confluent Schema Registry.

**Phase exit criteria:** App exibe ícone nativo em todas as plataformas, verifica e instala atualizações automaticamente, e importa qualquer schema Avro do Confluent sem erros.

---

### P6-T01 — App Icon

**Dependencies:** P4-T04  
**Branch:** `feat/p6-t01-app-icon`

| # | Subtask | Details |
|---|---|---|
| P6-T01.1 | Criar artefatos de ícone | Produzir o ícone nas três resoluções exigidas: `build/icons/icon.icns` (macOS, bundle com 16×16 até 1024×1024), `build/icons/icon.ico` (Windows, multi-resolução 16–256 px), `build/icons/icon.png` (Linux, 512×512 px, fundo transparente). |
| P6-T01.2 | Organizar diretório de build | Criar `build/icons/` na raiz do repositório. Garantir que os três arquivos estejam presentes antes de configurar o builder. |
| P6-T01.3 | Configurar `electron-builder.yml` — macOS | Adicionar `mac.icon: build/icons/icon.icns` e verificar que `mac.target` inclui `dmg`. |
| P6-T01.4 | Configurar `electron-builder.yml` — Windows | Adicionar `win.icon: build/icons/icon.ico` e verificar que `win.target` inclui `nsis`. |
| P6-T01.5 | Configurar `electron-builder.yml` — Linux | Adicionar `linux.icon: build/icons/icon.png` e verificar que `linux.target` inclui `AppImage` e `deb`. |
| P6-T01.6 | Verificar ícone em runtime | Definir `icon` em `BrowserWindow` options apontando para o arquivo correto por plataforma (relevante para Linux e Windows em modo dev). |
| P6-T01.7 | Testar build de cada plataforma | Executar `npm run build:mac`, `npm run build:win` e `npm run build:linux`. Inspecionar visualmente o ícone no instalador gerado e no app instalado. |

**Acceptance Criteria:**
- Ícone aparece no Dock (macOS), Taskbar (Windows) e App Launcher (Linux) após instalação
- Ícone aparece na janela do `.dmg` (macOS) e no wizard do instalador NSIS (Windows)
- `.AppImage` e `.deb` exibem o ícone correto nos gerenciadores de arquivo
- `npm run build` não introduz erros relacionados a assets de ícone ausentes

---

### P6-T02 — Auto-Update (electron-updater)

**Dependencies:** P4-T04, P5-T01  
**Branch:** `feat/p6-t02-auto-update`

| # | Subtask | Details |
|---|---|---|
| P6-T02.1 | Instalar dependência | `npm install electron-updater`. Confirmar que a versão é compatível com a versão do Electron em uso. |
| P6-T02.2 | Configurar publish no `electron-builder.yml` | Adicionar bloco `publish` com `provider: github`, `owner` e `repo`. Isso instrui o builder a gerar os metadados de update (`latest.yml`, `latest-linux.yml`, etc.) junto com cada release. |
| P6-T02.3 | Implementar `UpdateService` | Criar `src/main/services/update.service.ts`. No método `checkForUpdates()`: chamar `autoUpdater.checkForUpdatesAndNotify()` e registrar handlers para `update-available`, `update-downloaded` e `error`. |
| P6-T02.4 | Chamar no startup | Em `src/main/index.ts`, chamar `updateService.checkForUpdates()` depois que `app` estiver pronto e a janela principal for exibida (delay mínimo de 3 s para não impactar cold-start). |
| P6-T02.5 | Expor canais IPC de update | Adicionar ao preload: `onUpdateAvailable(cb)`, `onUpdateDownloaded(cb)` e `installUpdate()`. O renderer usa esses canais para reagir ao estado de update. |
| P6-T02.6 | Implementar UI de notificação | Criar componente `UpdateBanner.tsx` no renderer. Exibe banner não-bloqueante quando `onUpdateAvailable` dispara. Ao clicar em "Instalar agora", chama `installUpdate()` (que reinicia o app); ao clicar em "Depois", dispensa o banner até o próximo startup. |
| P6-T02.7 | Suporte a update silencioso | Ler valor de `settings` `auto_update_silent` (boolean). Se `true`, baixar e instalar automaticamente no próximo encerramento sem exibir o banner. |
| P6-T02.8 | Escrever testes | Mockar `autoUpdater` e testar os casos: update disponível, update baixado, erro de rede, update silencioso. |

**Acceptance Criteria:**
- App verifica updates imediatamente ao iniciar (com delay configurável) nas 3 plataformas
- Quando um update está disponível, o banner é exibido sem bloquear a UI
- Após confirmação do usuário, o update é instalado e o app reinicia automaticamente
- Se nenhum update estiver disponível, nenhum elemento de UI é exibido
- Erros de rede durante a verificação são capturados e não crasham o app
- Modo silencioso instala o update no próximo fechamento sem prompt

---

### P6-T03 — Suporte a Tipos Avro Avançados

**Dependencies:** P2-T03  
**Branch:** `feat/p6-t03-avro-advanced`

| # | Subtask | Details |
|---|---|---|
| P6-T03.1 | Suporte a `record` aninhado multi-nível | Estender `AvroParser` para resolver referências a tipos `record` definidos em qualquer nível do schema, não apenas no nível raiz. Garantir que `parent_field_id` seja atribuído corretamente para qualquer profundidade. |
| P6-T03.2 | Suporte a `union` complexo (múltiplos tipos não-null) | Quando a union contiver mais de um tipo não-null (ex.: `["null", "string", "int"]`), mapear para o tipo mais abrangente ou criar um campo `anyOf` com subtypes. Documentar a estratégia de resolução escolhida. |
| P6-T03.3 | Suporte a `namespace` em tipos customizados | Resolver referências de tipo que incluem namespace qualificado (ex.: `com.example.User`) buscando a definição pelo nome completo e pelo nome simples. Evitar conflitos de nome em schemas com múltiplos namespaces. |
| P6-T03.4 | Suporte a tipos nomeados compartilhados | Tratar tipos `record` e `enum` definidos uma vez e referenciados por nome em múltiplos campos (reuso de schema). |
| P6-T03.5 | Criar fixtures de teste avançados | Adicionar em `test/fixtures/`: `nested-record.avsc`, `complex-union.avsc`, `namespaced-types.avsc`, e pelo menos um schema real exportado do Confluent Schema Registry. |
| P6-T03.6 | Escrever testes de regressão | Garantir que todos os schemas das fixtures novas importam sem erro e produzem a árvore de campos esperada. Garantir que os testes da tarefa `P2-T03` continuam passando. |

**Acceptance Criteria:**
- Schemas Avro reais do Confluent Schema Registry importam sem erro (testado com pelo menos 3 schemas distintos)
- `record` aninhado em qualquer profundidade gera a árvore de campos correta
- `union` com múltiplos tipos não-null é resolvido de forma determinística e documentada
- Tipos referenciados por namespace qualificado são resolvidos corretamente
- Todos os testes existentes da tarefa P2-T03 continuam passando após as mudanças

---

## 9. Phase 7 — Quality & Testing Expansion

**Goal:** Ampliar a cobertura de testes e fechar o loop de qualidade com CI automático em Pull Requests, testes de componentes React e indicadores de status visíveis no repositório.

**Phase exit criteria:** PRs para `main` são bloqueados automaticamente se typecheck ou testes falharem; cobertura de componentes React ≥ 60%; badge de status visível no README.

---

### P7-T01 — Pipeline de CI para Pull Requests

**Dependencies:** P5-T01  
**Branch:** `feat/p7-t01-pr-ci`

| # | Subtask | Details |
|---|---|---|
| P7-T01.1 | Criar `.github/workflows/ci.yml` | Trigger: `on.pull_request.branches: [main]`. Runner: `ubuntu-latest`. Usar `actions/setup-node@v4` com `node-version: '20'` e `cache: 'npm'`. |
| P7-T01.2 | Step de instalação de dependências | `npm ci` sem o rebuild de nativos (CI não empacota; evitar overhead de compilação de `better-sqlite3`). |
| P7-T01.3 | Step `typecheck` | Executar `npm run typecheck` (ou equivalente). Falha bloqueia o merge do PR. |
| P7-T01.4 | Step `test` | Executar `npm test`. Falha bloqueia o merge do PR. Publicar relatório de cobertura como artefato do workflow. |
| P7-T01.5 | Configurar branch protection | Documentar (no README ou no próprio workflow) as regras de proteção de branch a serem ativadas no GitHub: requer o check `ci / typecheck` e `ci / test` antes do merge. |
| P7-T01.6 | Verificar tempo de execução | O workflow completo deve terminar em menos de 5 minutos para não impactar o fluxo de desenvolvimento. |

**Acceptance Criteria:**
- Todo PR aberto para `main` dispara o workflow `ci.yml` automaticamente
- Se `typecheck` falhar, o PR é marcado como bloqueado (check failing)
- Se `test` falhar, o PR é marcado como bloqueado (check failing)
- PRs com typecheck e testes passando recebem check verde e podem ser mergeados
- Relatório de cobertura está disponível como artefato no workflow

---

### P7-T02 — Testes de Componentes React

**Dependencies:** P2-T04, P2-T05, P3-T04  
**Branch:** `feat/p7-t02-component-tests`

| # | Subtask | Details |
|---|---|---|
| P7-T02.1 | Instalar dependências de teste | `npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom`. |
| P7-T02.2 | Configurar Vitest para o renderer | Adicionar configuração de `test` no `vite.config.ts` do renderer: `environment: 'jsdom'`, `setupFiles: ['src/renderer/test/setup.ts']`. Criar `setup.ts` importando `@testing-library/jest-dom`. |
| P7-T02.3 | Mockar `window.mockforge` | Criar `src/renderer/test/mocks/ipc.mock.ts` com mock completo de `window.mockforge` usando `vi.fn()`. Esse mock é importado no `setup.ts`. |
| P7-T02.4 | Escrever testes de `ProjectsPage` | Cobrir: renderização da lista de projetos, criação via formulário, busca por nome, confirmação de exclusão, navegação para Schema Editor. |
| P7-T02.5 | Escrever testes de `SchemaEditorPage` | Cobrir: renderização da árvore de campos, seleção de regra por tipo de campo, trigger de importação Avro, persistência de regra após save. |
| P7-T02.6 | Escrever testes de `GeneratorPage` | Cobrir: input de quantidade, clique em "Generate", renderização do JSON viewer, botão de copiar, botão de exportar. |
| P7-T02.7 | Configurar relatório de cobertura | Adicionar `coverage: { provider: 'v8', reporter: ['text', 'lcov'] }` na config do Vitest. Executar com `npm run test:coverage`. Meta: ≥ 60% nas três páginas. |

**Acceptance Criteria:**
- `npm test` executa os testes de componentes junto com os testes de serviço existentes
- Cobertura de `ProjectsPage`, `SchemaEditorPage` e `GeneratorPage` é ≥ 60% cada
- Testes de componente não dependem de Electron ou SQLite (mocks isolam o IPC)
- Todos os testes passam em ambiente CI (ubuntu-latest, sem display)

---

### P7-T03 — Badge de CI no README

**Dependencies:** P7-T01  
**Branch:** `feat/p7-t03-readme-badge`

| # | Subtask | Details |
|---|---|---|
| P7-T03.1 | Adicionar badge do workflow de release | Inserir no `README.md`, logo abaixo do título: badge de status do workflow `release.yml` usando a sintaxe oficial do GitHub (`![Release](https://github.com/{owner}/{repo}/actions/workflows/release.yml/badge.svg)`). |
| P7-T03.2 | Adicionar badge do workflow de CI | Inserir ao lado do badge de release: badge de status do workflow `ci.yml` (`![CI](https://github.com/{owner}/{repo}/actions/workflows/ci.yml/badge.svg)`). |
| P7-T03.3 | Verificar badges ao vivo | Após merge do PR no GitHub, confirmar que ambos os badges carregam corretamente e refletem o status real das últimas execuções. |

**Acceptance Criteria:**
- Badge do workflow `release.yml` aparece no README e reflete o status da última build de release
- Badge do workflow `ci.yml` aparece no README e reflete o status do último CI em PR
- Badges são visíveis no GitHub sem autenticação (repositório público ou permissão correta)
- Links dos badges apontam para a página correta do workflow no GitHub Actions

---

## 10. Dependency Graph

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

P4-T04 + P4-T05 ──→ P5-T01 (CI/CD Release Pipeline)

P4-T04 ──→ P6-T01 (App Icon)
P4-T04 + P5-T01 ──→ P6-T02 (Auto-Update)
P2-T03 ──→ P6-T03 (Advanced Avro Types)

P5-T01 ──→ P7-T01 (PR CI Pipeline)
P2-T04 + P2-T05 + P3-T04 ──→ P7-T02 (Component Tests)
P7-T01 ──→ P7-T03 (README Badge)
```
