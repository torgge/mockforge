# MockForge — Review & Parallel Execution Plan

**Version:** 1.0.0  
**Status:** Final  
**Last Updated:** 2026-05-23  
**Input Documents:** [SDD](mockforge-sdd.md) | [Implementation Plan](mockforge-implementation-plan.md)

---

## Table of Contents

1. [Review Findings](#1-review-findings)
2. [Parallel Execution Strategy](#2-parallel-execution-strategy)
3. [Wave 0 — Bootstrap](#3-wave-0--bootstrap)
4. [Wave 1 — Parallel Development](#4-wave-1--parallel-development)
5. [Wave 2 — Integration](#5-wave-2--integration)
6. [Wave 3 — Release](#6-wave-3--release)
7. [Agent Coordination Rules](#7-agent-coordination-rules)
8. [Shared Contracts Manifest](#8-shared-contracts-manifest)

---

## 1. Review Findings

### 1.1 SDD Issues

| ID | Severity | Location | Finding | Resolution |
|---|---|---|---|---|
| R-01 | 🔴 High | §10 Tech Stack | Tailwind CSS listed as `3.x`, but shadcn/ui latest requires **Tailwind v4**. | Updated to `4.x`. |
| R-02 | 🔴 High | §10 Tech Stack | React listed as `18.x`, but electron-vite template default is **React 19**. | Updated to `19.x`. |
| R-04 | 🟡 Medium | §8.2 IPC Channels | Channel count stated as 10 but actual count is **12**. | Corrected to 12. |

### 1.2 Implementation Plan Issues

| ID | Severity | Location | Finding | Resolution |
|---|---|---|---|---|
| R-07 | 🔴 High | §2 Branching | Sequential phase-based branching doesn't support parallel agents. Multiple agents would share the same `feat/p1-foundation` branch. | Restructured to **wave-based branching** with one branch per agent. See §2 below. |
| R-08 | 🔴 High | Missing | No IPC stub layer with realistic mock data. Frontend agent cannot develop UI without backend responses. | Add **Wave 0 deliverable**: IPC stub factory returning typed mock data for all 12 channels. |
| R-09 | 🔴 High | Missing | No `useIpc` hook defined until P4-T02 (error handling), but all UI tasks need it from P2-T04 onwards. | Move `useIpc` hook creation to **Wave 0**. It wraps `window.mockforge.*` calls with error handling and loading state. |
| R-10 | 🔴 High | Missing | No test fixture files (`.avsc`) defined anywhere. Both backend agent (Avro parser tests) and frontend agent (UI development with sample data) need them. | Add **Avro test fixtures** as Wave 0 deliverable. |
| R-11 | 🟡 Medium | P1-T04 | Security hardening is a separate task with 4 subtasks, but `nodeIntegration: false` and `contextIsolation: true` should be set at scaffolding time. Separating it creates a window where the app is insecure. | Merge P1-T04 into P1-T01 (scaffolding). Security is not optional — it's a default. |
| R-12 | 🟡 Medium | P3-T05 | Export task depends entirely on P3-T04 (JSON Viewer). But the export service (Main process) is independent of the viewer. Only the UI button needs the viewer. | Split: export **service** runs in Wave 1 (backend agent), export **button** runs in Wave 2 (integration). |
| R-13 | 🟡 Medium | P4-T01 | Settings screen placed in Phase 4 (Polish), but it's a simple CRUD screen with the same patterns as Projects. Low complexity, high parallelization opportunity. | Move to **Wave 1** (frontend agent). It's independent of all other features. |
| R-14 | 🟢 Low | P2-T04.1 | Zustand store design creates one monolithic `app.store.ts`. With parallel agents, this becomes a merge conflict hotspot. | Use **Zustand slices pattern**: each domain gets its own slice file (`project.slice.ts`, `schema.slice.ts`, `generator.slice.ts`). |

---

### 1.3 Cross-Document Consistency

| Check | Status | Notes |
|---|---|---|
| All FR mapped to at least one task | ✅ Pass | FR-01 → P2-T01/T04, FR-02 → P2-T02/T03/T05, FR-03 → P2-T02/T05, FR-04 → P3-T03, FR-05 → P3-T04, FR-06 → P3-T05 |
| All NFR mapped to at least one task | ✅ Pass | NFR-01/02 → P3-T03.4, NFR-03 → P4-T04.5, NFR-04 → P4-T03, NFR-05 → P2-T04/T05, NFR-06 → P4-T04, NFR-07 → P1-T02, NFR-08 → P1-T04, NFR-09 → P1-T03, NFR-10 → P1-T02 |
| All US covered by FR | ✅ Pass | US-01→FR-01-1, US-02→FR-01-5, US-03→FR-02-2, US-04→FR-03-*, US-05→FR-02-4, US-06→FR-04-1, US-07→FR-04-3, US-08→FR-05-2, US-09→FR-06-1, US-10→FR-01-4 |
| IPC channels match contextBridge | ✅ Pass | All 12 channels in §8.2 are in §8.3 contract |
| Data model supports all FR | ✅ Pass | 4 tables cover all CRUD + rules + settings |
| UI screens cover all user flows | ✅ Pass | 4 screens: Projects, Schema Editor, Generator, Settings |

---

## 2. Parallel Execution Strategy

### 2.1 Core Principle

The key to parallelizing this project is **contract-first development**. All shared interfaces, types, IPC channels, and mock data are defined upfront in a bootstrap wave. After that, agents work against contracts — not against each other's code.

```
                    ┌──────────────┐
                    │   Wave 0     │
                    │  Bootstrap   │
                    │  (1 agent)   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
        │  Wave 1A  │ │Wave 1B│ │  Wave 1C  │
        │  Backend  │ │  UI   │ │ Generator │
        │ (Agent A) │ │(Ag. B)│ │ (Agent C) │
        └─────┬─────┘ └───┬───┘ └─────┬─────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────▼───────┐
                    │   Wave 2     │
                    │ Integration  │
                    │ (1-2 agents) │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   Wave 3     │
                    │   Release    │
                    │  (1 agent)   │
                    └──────────────┘
```

### 2.2 Branching Strategy (revised for parallel agents)

```
main
 ├── wave-0/bootstrap           ← single agent, merges to main when done
 │
 ├── wave-1/backend             ← Agent A (long-lived during Wave 1)
 │    ├── feat/project-service
 │    ├── feat/schema-service
 │    ├── feat/avro-parser
 │    └── feat/export-service
 │
 ├── wave-1/frontend            ← Agent B (long-lived during Wave 1)
 │    ├── feat/projects-page
 │    ├── feat/schema-editor-page
 │    ├── feat/generator-page-shell
 │    └── feat/settings-page
 │
 ├── wave-1/generator           ← Agent C (long-lived during Wave 1)
 │    ├── feat/strategies
 │    ├── feat/nested-resolver
 │    └── feat/generator-engine
 │
 ├── wave-2/integration         ← merges wave-1/* branches, wires everything
 └── wave-3/release             ← packaging + QA
```

**Merge protocol:**
1. Each agent merges feature branches into their wave branch
2. At wave end, wave branches merge into `main` in order: `wave-1/backend` → `wave-1/generator` → `wave-1/frontend`
3. Backend merges first (no UI dependencies), then generator (depends on types only), then frontend (may need minor IPC adjustments)

### 2.3 File Ownership Map

To avoid merge conflicts, each agent owns specific directories. **No agent writes outside their owned directories** during Wave 1.

| Agent | Owned Directories | Forbidden Directories |
|---|---|---|
| **A (Backend)** | `src/main/services/`, `src/main/ipc/handlers.ts` | `src/renderer/`, `src/main/db/` (read-only) |
| **B (Frontend)** | `src/renderer/` | `src/main/`, `src/preload/` |
| **C (Generator)** | `src/main/services/generator.service.ts`, `src/main/services/strategies/`, `src/main/services/nested-resolver.ts` | `src/renderer/`, `src/main/ipc/`, `src/main/db/` |

---

## 3. Wave 0 — Bootstrap

**Agent:** 1 (coordinator)  
**Duration:** 1 session  
**Branch:** `wave-0/bootstrap`

### Deliverables

| # | Deliverable | Details |
|---|---|---|
| W0-01 | Electron scaffold | `electron-vite` + React + TypeScript. Security defaults applied (nodeIntegration: false, contextIsolation: true, CSP). |
| W0-02 | Shared contracts | `src/shared/ipc.types.ts`, `ipc.channels.ts`, `window.d.ts`, `validation.ts` (Zod schemas). |
| W0-03 | Database schema | `src/main/db/schema.ts` (Drizzle tables), `client.ts` (singleton), initial migration. |
| W0-04 | IPC stubs | `src/main/ipc/stubs.ts` — mock data factory returning realistic typed data for all 12 channels. `handlers.ts` wired to stubs. |
| W0-05 | Preload bridge | `src/preload/index.ts` — full `contextBridge` contract from SDD §8.3. |
| W0-06 | Renderer shell | Tailwind v4 + shadcn/ui, `Layout.tsx` with sidebar, React Router, 4 placeholder pages. |
| W0-07 | Zustand slices | `project.slice.ts`, `schema.slice.ts`, `generator.slice.ts` — structure only, minimal logic. |
| W0-08 | useIpc hook | `src/renderer/hooks/useIpc.ts` — wraps `window.mockforge.*` with loading/error/data states. |
| W0-09 | Test fixtures | `test/fixtures/simple.avsc`, `test/fixtures/nested.avsc`, `test/fixtures/unions.avsc`, `test/fixtures/invalid.json`. |

### Exit Criteria

- [ ] `npm run dev` launches Electron with React renderer
- [ ] All 12 IPC channels respond with stub data
- [ ] Round-trip IPC works (renderer → main → renderer)
- [ ] Tailwind + shadcn/ui render correctly
- [ ] TypeScript compiles with zero errors
- [ ] All files in the Shared Contracts Manifest (§8) exist and compile

---

## 4. Wave 1 — Parallel Development

### Wave 1A — Backend (Agent A)

**Branch:** `wave-1/backend`

| # | Task | Origin | Description |
|---|---|---|---|
| W1A-01 | ProjectService | P2-T01 | Full CRUD with cascade delete. Wire IPC handlers (replace stubs). |
| W1A-02 | SchemaService | P2-T02 | `getByProject` with nested field tree builder. `updateRule` with validation. Wire IPC handlers. |
| W1A-03 | AvroParser | P2-T03 | Parse Avro → fields. Handle all union types. Transaction-based import. Wire IPC handler. |
| W1A-04 | ExportService | P3-T05 (service only) | `dialog.showSaveDialog()` + file write. Wire `export:toFile` handler. Default filename pattern. |

### Wave 1B — Frontend (Agent B)

**Branch:** `wave-1/frontend`

| # | Task | Origin | Description |
|---|---|---|---|
| W1B-01 | Projects Page | P2-T04 | Project list, create form, search, edit/delete. All via IPC stubs. |
| W1B-02 | Schema Editor Page | P2-T05 | Field tree component, rule configurator, Avro import UI button. All via IPC stubs. |
| W1B-03 | Generator Page Shell | P3-T04 (UI only) | Quantity input, generate button, JSON viewer component, copy button. Wired to stubs. |
| W1B-04 | Settings Page | P4-T01 | Settings form with validation. Load/save via `settings:get`/`settings:set` stubs. |

### Wave 1C — Generator (Agent C)

**Branch:** `wave-1/generator`

| # | Task | Origin | Description |
|---|---|---|---|
| W1C-01 | Strategies | P3-T01 | Strategy interface, Range/Enum/Format/Default implementations, factory. Full unit tests. |
| W1C-02 | Nested Resolver | P3-T02 | Recursive object/array generation, empty object handling. Full unit tests. |
| W1C-03 | Generator Engine | P3-T03 | Orchestrator service: fetch fields, resolve tree, apply strategies, return array. Performance tests. |

### Wave 1 — Exit Criteria

- [ ] Agent A: All 12 IPC handlers return real data from SQLite (stubs fully replaced)
- [ ] Agent B: All 4 screens functional with stub data
- [ ] Agent C: Generator produces correct JSON for all rule types and nesting depths
- [ ] All agent branches compile independently (`npm run build`)

---

## 5. Wave 2 — Integration

**Agent:** 1–2  
**Duration:** 1 session  
**Branch:** `wave-2/integration`

| # | Task | Description |
|---|---|---|
| W2-01 | Merge branches | Merge `wave-1/backend` → `wave-1/generator` → `wave-1/frontend` into `main`. Resolve conflicts. |
| W2-02 | Wire real IPC | Remove all stub imports. Frontend now calls real backend through IPC. Verify each screen. |
| W2-03 | Export button | Connect export button on Generator page to `export:toFile`. |
| W2-04 | Error handling | Implement `useIpc` error display (toasts), React error boundary, edge case handling. |
| W2-05 | Keyboard navigation | Tab order, Enter/Escape shortcuts, arrow key tree navigation. |

### Wave 2 — Exit Criteria

- [ ] All screens work end-to-end with real data
- [ ] Error messages display for all failure modes
- [ ] Keyboard navigation works on all screens
- [ ] All 10 user stories pass manual verification

---

## 6. Wave 3 — Release

**Agent:** 1  
**Duration:** 1 session  
**Branch:** `wave-3/release`

| # | Task | Description |
|---|---|---|
| W3-01 | Packaging | Configure `electron-builder`. Build macOS, Windows, Linux installers. |
| W3-02 | Native deps | Rebuild `better-sqlite3` for each platform target. |
| W3-03 | QA walkthrough | Execute all US-01 through US-10. Verify FR-01 through FR-06, NFR-01 through NFR-10. |
| W3-04 | Cross-platform | Test on macOS, Windows, Ubuntu. Verify DB paths, file dialogs, clipboard. |

### Wave 3 — Exit Criteria

- [ ] All FR (FR-01 through FR-06) verified
- [ ] All NFR (NFR-01 through NFR-10) verified
- [ ] Distributable installers for 3 platforms
- [ ] Cold launch < 3 seconds on all platforms

---

## 7. Agent Coordination Rules

### 7.1 Immutable Contract Rule

Files in `src/shared/` are **frozen** after Wave 0. No agent modifies them during Wave 1. If a contract change is needed:
1. Agent raises an issue (documents the needed change and reason)
2. Coordinator reviews and applies the change to `main`
3. All agents rebase from `main`

### 7.2 Communication Protocol

| Event | Action |
|---|---|
| Agent completes a task | Commit + push to agent branch. Update task status. |
| Agent is blocked | Document blocker with task ID. Coordinator unblocks or reassigns. |
| Agent discovers a bug in shared contracts | File issue. Do NOT fix in-place. Coordinator patches `main`. |
| Agent finishes all tasks | Run `npm run build` on their branch. Report ready for merge. |

### 7.3 Agent Context

Each agent receives this context when starting:
1. **SDD** (full document)
2. **This document** (Review & Parallel Execution Plan)
3. **Their specific wave/agent section** highlighted
4. **File ownership map** (§2.3)
5. **The codebase** (post Wave 0 `main`)

---

## 8. Shared Contracts Manifest

All files created during Wave 0 that agents depend on:

| File | Purpose | Consumers |
|---|---|---|
| `src/shared/ipc.types.ts` | All TypeScript interfaces | All agents |
| `src/shared/ipc.channels.ts` | Channel name constants | Agent A, Agent B |
| `src/shared/window.d.ts` | `window.mockforge` type declaration | Agent B |
| `src/shared/validation.ts` | Zod schemas for payloads | Agent A, Agent B |
| `src/main/db/schema.ts` | Drizzle table definitions | Agent A |
| `src/main/db/client.ts` | DB connection singleton | Agent A |
| `src/main/ipc/stubs.ts` | Mock data factory | Agent B (consumes via IPC) |
| `src/main/ipc/handlers.ts` | IPC handler registry | Agent A (replaces stubs) |
| `src/preload/index.ts` | contextBridge contract | All agents (read-only) |
| `src/renderer/hooks/useIpc.ts` | Typed IPC hook with error handling | Agent B |
| `src/renderer/store/*.slice.ts` | Zustand slice structure | Agent B |
| `src/renderer/components/Layout.tsx` | App shell with sidebar | Agent B |
| `test/fixtures/*.avsc` | Avro test schemas | Agent A, Agent C |
