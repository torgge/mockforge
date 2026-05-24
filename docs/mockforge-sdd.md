# MockForge — Software Design Document (SDD)

**Version:** 1.0.1  
**Status:** Final (Reviewed)  
**Last Updated:** 2026-05-23  

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [User Stories](#3-user-stories)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Architecture Design](#6-architecture-design)
7. [Data Model](#7-data-model)
8. [IPC Interface Specification](#8-ipc-interface-specification)
9. [UI Specification](#9-ui-specification)
10. [Technical Stack](#10-technical-stack)
11. [Implementation Roadmap](#11-implementation-roadmap)
12. [Appendix](#12-appendix)

---

## 1. Introduction

### 1.1 Purpose

This document defines the software design specification for **MockForge**, a desktop application for generating structured mock JSON data based on user-defined schemas. It serves as the authoritative reference for implementation, covering functional requirements, architecture decisions, data model, interface contracts, and delivery roadmap.

### 1.2 Scope

MockForge is a local, offline desktop application. It enables developers to define JSON schemas, configure field-level generation rules, and produce mock data for use in software testing, API development, and prototyping workflows. The application stores all data locally and requires no network connectivity or external services.

This document covers version **1.0.0** of MockForge.

### 1.3 Definitions & Acronyms

| Term | Definition |
|---|---|
| **SDD** | Software Design Document — the present document |
| **Avro** | Apache Avro — a data serialization framework that uses JSON-based schema definitions |
| **Schema** | A structured definition of a JSON object, comprising typed fields and their generation rules |
| **Field** | A single attribute within a schema, associated with a name, type, and optional rule |
| **Rule** | A constraint or strategy applied to a field that governs how its value is randomly generated |
| **IPC** | Inter-Process Communication — the mechanism Electron uses to communicate between the Main and Renderer processes |
| **contextBridge** | Electron API that safely exposes Main process functionality to the Renderer via a typed contract |
| **ORM** | Object-Relational Mapping — an abstraction layer between application code and the database |
| **Drizzle** | A TypeScript-first ORM used in this project for SQLite access |
| **Mock data** | Synthetic, randomly generated data that conforms to a defined schema structure |

### 1.4 Intended Audience

This document is intended for software developers responsible for implementing MockForge. Readers are expected to have working knowledge of TypeScript, React, Electron, and relational database concepts.

---

## 2. System Overview

### 2.1 Product Description

MockForge is an offline desktop application built with Electron and TypeScript. It allows developers to create projects, import Avro schemas, configure field-level generation rules, and produce mock JSON data on demand. Generated data can be visualized within the application and exported to `.json` files for immediate use in development workflows.

All data — projects, schemas, fields, and settings — is stored locally in an embedded SQLite database. No account, network connection, or external dependency is required at runtime.

### 2.2 Goals & Objectives

| # | Goal | Objective |
|---|---|---|
| G-01 | Reduce friction in mock data creation | Developers should go from zero to generated JSON in under 2 minutes for a schema with up to 10 fields |
| G-02 | Leverage existing schema investments | Avro schemas used in production systems should be importable directly, with no manual re-entry of field definitions |
| G-03 | Support realistic and rule-driven data | Generated values should respect type constraints and user-defined rules, producing data that mirrors real-world structures |
| G-04 | Work entirely offline | The application must function without any network dependency |
| G-05 | Run on all major desktop platforms | The application must be distributable on Windows, macOS, and Linux |

### 2.3 Constraints & Assumptions

**Constraints:**

- The application must run fully offline; no API calls, telemetry, or cloud sync are permitted in v1.
- Schema structure is immutable after Avro import. Structural changes require re-importing a modified Avro file.
- Field dependency rules (conditional value generation based on other fields) are out of scope for v1.
- The `regex` rule type is out of scope for v1.
- The maximum number of records that can be generated in a single operation is capped at `10,000`.
- Fields are non-nullable in v1; all generated values are always present.

**Assumptions:**

- The user has a valid Avro schema file available when defining a schema.
- The user's machine meets the minimum requirements to run an Electron application (Chromium + Node.js runtime).
- SQLite storage capacity is sufficient for the expected volume of project metadata; generated JSON is not persisted to the database.

---

## 3. User Stories

All stories share the same persona: **a developer** who needs mock JSON data during software development.

| ID | User Story | Acceptance Criteria |
|---|---|---|
| US-01 | As a developer, I want to create a named project so that I can organize my mock schemas by context or service. | Project is saved and appears in the project list immediately after creation. |
| US-02 | As a developer, I want to search for a project by name so that I can quickly find it among many entries. | Typing in the search field filters the list in real time without a page reload. |
| US-03 | As a developer, I want to import an Avro schema into my project so that I do not have to manually re-define fields I already have in my codebase. | After selecting an `.avsc` or `.json` file, all fields are parsed and displayed with their inferred types. |
| US-04 | As a developer, I want to configure a generation rule for each field so that the generated values are realistic and conform to my domain. | I can assign a `range`, `enum`, or `format` rule to any field and save it. |
| US-05 | As a developer, I want nested object fields to be supported so that I can generate JSON that mirrors complex domain models. | Fields of type `object` display their child fields, each configurable independently. |
| US-06 | As a developer, I want to generate a JSON array of any size so that I can produce as much or as little data as my test requires. | I enter a quantity (1–max), click generate, and the JSON array is displayed immediately. |
| US-07 | As a developer, I want to regenerate the data without changing my configuration so that I can get a different random set with one click. | Clicking "Generate" again produces a new set of values with no configuration required. |
| US-08 | As a developer, I want to copy the generated JSON to my clipboard so that I can paste it directly into my tools without saving a file. | Clicking "Copy" copies the full JSON string; a confirmation message is shown. |
| US-09 | As a developer, I want to export the generated JSON to a file so that I can store or share the dataset. | Clicking "Export" opens the OS save dialog with a pre-filled filename. |
| US-10 | As a developer, I want to delete a project I no longer need so that my project list stays clean. | The project and all associated data are permanently removed after confirmation. |

---

## 4. Functional Requirements

Functional requirements are grouped by feature domain. Each requirement is identified by a unique code in the format `FR-<domain>-<index>`.

---

### FR-01 — Project Management

| ID | Requirement |
|---|---|
| FR-01-1 | The system shall allow the user to create a project by providing a name (required) and a description (optional). |
| FR-01-2 | The system shall display all projects in a list, sorted by creation date in descending order. |
| FR-01-3 | The system shall allow the user to edit a project's name and description at any time. |
| FR-01-4 | The system shall allow the user to delete a project, which cascades to its schema and all associated fields, after explicit user confirmation. |
| FR-01-5 | The system shall allow the user to search (filter) the project list by name using a case-insensitive substring match. |

### FR-02 — Schema & Field Management

| ID | Requirement |
|---|---|
| FR-02-1 | Each project shall have exactly one schema, created automatically when the project is created. |
| FR-02-2 | The system shall allow the user to import an Avro schema file (`.avsc` or `.json`) to populate the schema's fields. |
| FR-02-3 | When importing a new Avro schema into a project that already has fields, the system shall prompt the user for confirmation before replacing all existing fields. |
| FR-02-4 | The system shall support nested fields: a field of type `object` may contain child fields, each with their own independent rule configuration, to any depth level. |
| FR-02-5 | If the imported file is not a valid Avro schema (malformed JSON, missing `type` or `fields` properties), the system shall reject the import, display an error message to the user, and leave the existing schema fields unchanged. |

### FR-03 — Field Rule Configuration

| ID | Requirement |
|---|---|
| FR-03-1 | Each field shall support zero or one rule. A field with no rule generates a random value appropriate to its type. |
| FR-03-2 | The `range` rule shall apply to `number` fields only. It defines a `min` and `max` value; `max` must be ≥ `min`. |
| FR-03-3 | The `enum` rule shall apply to `string`, `number`, and `boolean` fields. It defines a list of allowed values; at least one value is required. |
| FR-03-4 | The `format` rule shall apply to `string` fields only. Supported subtypes: `uuid`, `date`, `datetime`. |

### FR-04 — Data Generation

| ID | Requirement |
|---|---|
| FR-04-1 | The system shall generate a JSON array containing `N` objects, where `N` is specified by the user (1 ≤ N ≤ `max_generation_limit`). |
| FR-04-2 | Each generated object shall conform to the schema's field definitions and respect all configured rules. |
| FR-04-3 | Each generation shall produce new random values; no caching of previous outputs. |

### FR-05 — JSON Viewing

| ID | Requirement |
|---|---|
| FR-05-1 | The system shall display the generated JSON in a syntax-highlighted, collapsible tree view. |
| FR-05-2 | The system shall provide a "Copy to Clipboard" action that copies the full JSON string and shows a confirmation message. |

### FR-06 — Export

| ID | Requirement |
|---|---|
| FR-06-1 | The system shall allow the user to export generated JSON to a `.json` file via the native OS save dialog. |
| FR-06-2 | The default filename shall follow the pattern `{project-name}-{timestamp}.json`. |

---

## 5. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | **Performance** | JSON generation for up to `1,000` records must complete and render within `2 seconds` on a mid-range developer machine. |
| NFR-02 | **Performance** | JSON generation for up to `10,000` records must complete within `10 seconds`. |
| NFR-03 | **Performance** | Application startup (cold launch to interactive UI) must complete within `3 seconds`. |
| NFR-04 | **Usability** | The application must be fully operable via keyboard navigation in addition to mouse interaction. |
| NFR-05 | **Usability** | Destructive actions (project deletion, schema re-import) must require explicit user confirmation before executing. |
| NFR-06 | **Compatibility** | The application must run on Windows 10+, macOS 12+, and Ubuntu 22.04+ without additional runtime installation by the user. |
| NFR-07 | **Reliability** | All user data (projects, schemas, field rules) must be persisted immediately after each write operation. No data should be lost on unexpected application exit. |
| NFR-08 | **Security** | The application must not make any outbound network requests. The Electron `contextBridge` must be used for all Main-to-Renderer communication; `nodeIntegration` must be disabled in the Renderer. |
| NFR-09 | **Maintainability** | All IPC channel names and payload types must be defined in a shared TypeScript contract accessible to both the Main and Renderer processes. |
| NFR-10 | **Portability** | The SQLite database file must be stored in the OS-appropriate user data directory (e.g., `%APPDATA%` on Windows, `~/Library/Application Support` on macOS, `~/.config` on Linux). |

---

## 6. Architecture Design

### 6.1 System Architecture

MockForge follows the standard Electron two-process architecture, with a strict separation between the Main process (Node.js runtime) and the Renderer process (Chromium/React). All business logic, database access, and file system operations are confined to the Main process. The Renderer is responsible solely for UI rendering and user interaction.

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer Process                     │
│                  (Chromium + React)                     │
│                                                         │
│   ProjectsPage  │  SchemaEditorPage  │  GeneratorPage  │
│                                                         │
│              Zustand Store (UI State)                   │
└────────────────────────┬────────────────────────────────┘
                         │
              contextBridge (IPC Contract)
              window.mockforge.*
                         │
┌────────────────────────▼────────────────────────────────┐
│                     Main Process                        │
│                  (Node.js + TypeScript)                 │
│                                                         │
│  ProjectService  │  SchemaService  │  GeneratorEngine  │
│                  ExportService                          │
│                                                         │
│              IPC Handlers (ipcMain)                     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              SQLite Database (Drizzle ORM)              │
│         {userData}/mockforge/mockforge.db               │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Electron Process Model

| Process | Runtime | Responsibilities |
|---|---|---|
| **Main** | Node.js | Application lifecycle, SQLite operations, file system access (import/export), IPC handler registration |
| **Preload** | Node.js (sandboxed) | Exposes a typed `contextBridge` API (`window.mockforge`) to the Renderer; no direct DOM access |
| **Renderer** | Chromium | React UI rendering, user interaction, state management (Zustand), calls `window.mockforge.*` for all data operations |

### 6.3 Component Overview

```
src/
├── main/
│   ├── index.ts              # Electron app entry, window creation
│   ├── db/
│   │   ├── schema.ts         # Drizzle table definitions
│   │   └── client.ts         # DB connection singleton
│   ├── ipc/
│   │   └── handlers.ts       # All ipcMain.handle registrations
│   └── services/
│       ├── project.service.ts
│       ├── schema.service.ts
│       ├── generator.service.ts
│       └── export.service.ts
├── preload/
│   └── index.ts              # contextBridge setup
├── shared/
│   ├── ipc.types.ts          # Shared TypeScript interfaces
│   ├── ipc.channels.ts       # Channel name constants
│   └── validation.ts         # Zod schemas for payload validation
└── renderer/
    ├── App.tsx
    ├── components/
    ├── pages/
    │   ├── ProjectsPage.tsx
    │   ├── SchemaEditorPage.tsx
    │   ├── GeneratorPage.tsx
    │   └── SettingsPage.tsx
    ├── hooks/
    │   └── useIpc.ts
    └── store/
        ├── project.slice.ts
        ├── schema.slice.ts
        └── generator.slice.ts
```

---

## 7. Data Model

### 7.1 Entity Definitions

#### projects

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID v4 |
| `name` | TEXT | NOT NULL | Display name of the project |
| `description` | TEXT | NULLABLE | Optional project description |
| `created_at` | TEXT | NOT NULL | ISO 8601 timestamp |
| `updated_at` | TEXT | NOT NULL | ISO 8601 timestamp |

#### schemas

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID v4 |
| `project_id` | TEXT | NOT NULL, FK → projects.id, UNIQUE | Owning project |
| `avro_source` | TEXT | NULLABLE | Raw Avro schema JSON string (stored for reference) |
| `created_at` | TEXT | NOT NULL | ISO 8601 timestamp |
| `updated_at` | TEXT | NOT NULL | ISO 8601 timestamp |

> One schema per project is enforced at the application layer. `project_id` carries a UNIQUE constraint.

#### fields

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID v4 |
| `schema_id` | TEXT | NOT NULL, FK → schemas.id | Owning schema |
| `parent_field_id` | TEXT | NULLABLE, FK → fields.id | Parent field for nested structures; NULL for root fields |
| `name` | TEXT | NOT NULL | Field name as it appears in the generated JSON |
| `type` | TEXT | NOT NULL | One of: `string`, `number`, `boolean`, `object`, `array`, `null` |
| `rule` | TEXT | NULLABLE | JSON-encoded rule object (see §7.2) |
| `order` | INTEGER | NOT NULL | Display and generation order within the same parent scope |

#### settings

| Column | Type | Constraints | Description |
|---|---|---|---|
| `key` | TEXT | PRIMARY KEY | Setting identifier |
| `value` | TEXT | NOT NULL | Setting value (always stored as string) |

> Default entries: `{ key: 'max_generation_limit', value: '1000' }`

---

**Entity Relationship:**

```
projects (1) ──── (1) schemas (1) ──── (N) fields
                                            │
                                       fields.parent_field_id
                                       (self-referencing for nesting)
```

---

### 7.2 Field Rules Specification

The `rule` column in the `fields` table stores a JSON object. The `kind` discriminant determines the rule type and its additional properties.

```typescript
type FieldRule =
  | RangeRule
  | EnumRule
  | FormatRule;

interface RangeRule {
  kind: 'range';
  min: number;
  max: number;       // must be >= min
}

interface EnumRule {
  kind: 'enum';
  values: unknown[]; // at least one value required
}

interface FormatRule {
  kind: 'format';
  subtype: 'uuid' | 'date' | 'datetime';
}
```

**Rule applicability by field type:**

| Field Type | `range` | `enum` | `format` |
|---|---|---|---|
| `string` | ✗ | ✓ | ✓ (uuid, date, datetime) |
| `number` | ✓ | ✓ | ✗ |
| `boolean` | ✗ | ✓ | ✗ |
| `object` | ✗ | ✗ | ✗ |
| `array` | ✗ | ✗ | ✗ |
| `null` | ✗ | ✗ | ✗ |

> `object` and `array` type fields do not hold rules themselves; their values are derived from their child fields.

> `array` type fields generate between 1 and 5 child elements by default. Each element is generated using the child field definitions of that array field.

> `object` type fields with no child fields generate an empty object `{}`.

---

### 7.3 Nested Fields

Nesting is modelled via the `parent_field_id` self-reference on the `fields` table. Root-level fields have `parent_field_id = NULL`. Child fields point to a parent whose `type` is `object`.

**Example — Avro source and resulting field tree:**

```json
// Avro schema
{
  "type": "record",
  "name": "User",
  "fields": [
    { "name": "id",      "type": "string" },
    { "name": "address", "type": {
        "type": "record",
        "name": "Address",
        "fields": [
          { "name": "street", "type": "string" },
          { "name": "city",   "type": "string" }
        ]
      }
    }
  ]
}
```

```
fields (schema_id = X)
├── id            [type=string, parent=NULL, order=0]
└── address       [type=object, parent=NULL, order=1]
    ├── street    [type=string, parent=address.id, order=0]
    └── city      [type=string, parent=address.id, order=1]
```

**Generated JSON output:**

```json
[
  {
    "id": "a1b2c3d4-...",
    "address": {
      "street": "...",
      "city": "..."
    }
  }
]
```

---

## 8. IPC Interface Specification

All communication between the Renderer and the Main process occurs through typed IPC channels registered via `ipcMain.handle` (Main) and exposed through `contextBridge` as `window.mockforge` (Renderer). Channel names and payload types are defined in `src/shared/ipc.types.ts`.

All handlers follow the pattern:
- **Success:** returns the result payload directly
- **Error:** throws an `Error` with a descriptive message; the Renderer catches and displays it

---

### 8.1 Shared Type Definitions

```typescript
// src/shared/ipc.types.ts

export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Schema {
  id: string;
  projectId: string;
  avroSource: string | null;
  createdAt: string;
  updatedAt: string;
}

export type FieldType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

export type FieldRule =
  | { kind: 'range'; min: number; max: number }
  | { kind: 'enum'; values: unknown[] }
  | { kind: 'format'; subtype: 'uuid' | 'date' | 'datetime' };

export interface Field {
  id: string;
  schemaId: string;
  parentFieldId: string | null;
  name: string;
  type: FieldType;
  rule: FieldRule | null;
  order: number;
}

export interface GenerateRequest {
  schemaId: string;
  quantity: number; // 1 – max_generation_limit
}
```

---

### 8.2 IPC Channels

#### Project Channels

| Channel | Input | Output | Description |
|---|---|---|---|
| `project:create` | `{ name: string; description?: string }` | `Project` | Creates a new project and its associated empty schema |
| `project:list` | `void` | `Project[]` | Returns all projects, newest first |
| `project:update` | `{ id: string; name: string; description?: string }` | `Project` | Updates project name and/or description |
| `project:delete` | `{ id: string }` | `void` | Deletes the project and cascades to schema and fields |
| `project:search` | `{ query: string }` | `Project[]` | Filters projects by name (case-insensitive, substring match) |

#### Schema Channels

| Channel | Input | Output | Description |
|---|---|---|---|
| `schema:getByProject` | `{ projectId: string }` | `Schema & { fields: Field[] }` | Returns the schema and full field tree for a project |
| `schema:importAvro` | `{ projectId: string; avroJson: string }` | `Schema & { fields: Field[] }` | Parses the Avro JSON string, replaces existing fields, and returns the updated schema |

#### Field Channels

| Channel | Input | Output | Description |
|---|---|---|---|
| `field:updateRule` | `{ fieldId: string; rule: FieldRule \| null }` | `Field` | Sets or clears the generation rule for a field |

#### Generator Channels

| Channel | Input | Output | Description |
|---|---|---|---|
| `generator:run` | `GenerateRequest` | `unknown[]` | Generates and returns a JSON array of the requested size |

#### Export Channels

| Channel | Input | Output | Description |
|---|---|---|---|
| `export:toFile` | `{ data: unknown[]; suggestedName: string }` | `{ filePath: string } \| null` | Opens the OS save dialog and writes the JSON file; returns the chosen path or null if cancelled |

#### Settings Channels

| Channel | Input | Output | Description |
|---|---|---|---|
| `settings:get` | `{ key: string }` | `string \| null` | Retrieves a settings value by key |
| `settings:set` | `{ key: string; value: string }` | `void` | Persists a settings value |

---

### 8.3 contextBridge Contract

```typescript
// src/preload/index.ts
contextBridge.exposeInMainWorld('mockforge', {
  project: {
    create:  (payload) => ipcRenderer.invoke('project:create', payload),
    list:    ()        => ipcRenderer.invoke('project:list'),
    update:  (payload) => ipcRenderer.invoke('project:update', payload),
    delete:  (payload) => ipcRenderer.invoke('project:delete', payload),
    search:  (payload) => ipcRenderer.invoke('project:search', payload),
  },
  schema: {
    getByProject: (payload) => ipcRenderer.invoke('schema:getByProject', payload),
    importAvro:   (payload) => ipcRenderer.invoke('schema:importAvro', payload),
  },
  field: {
    updateRule: (payload) => ipcRenderer.invoke('field:updateRule', payload),
  },
  generator: {
    run: (payload) => ipcRenderer.invoke('generator:run', payload),
  },
  export: {
    toFile: (payload) => ipcRenderer.invoke('export:toFile', payload),
  },
  settings: {
    get: (payload) => ipcRenderer.invoke('settings:get', payload),
    set: (payload) => ipcRenderer.invoke('settings:set', payload),
  },
});
```

---

## 9. UI Specification

### 9.1 Screens Overview

MockForge consists of three primary screens and one settings screen, navigated via a persistent left sidebar.

---

#### Screen 1 — Projects

**Purpose:** Entry point of the application. Lists all projects and provides project management actions.

**Layout:**
```
┌─────────────────────────────────────────────┐
│  MockForge          [+ New Project]         │
├──────────┬──────────────────────────────────┤
│          │  🔍 Search projects...           │
│  sidebar │  ─────────────────────────────  │
│          │  ┌────────────────────────────┐  │
│          │  │ Project Name               │  │
│          │  │ Created Jan 12, 2026  [⋯] │  │
│          │  └────────────────────────────┘  │
│          │  ┌────────────────────────────┐  │
│          │  │ Another Project            │  │
│          │  │ Created Jan 10, 2026  [⋯] │  │
│          │  └────────────────────────────┘  │
└──────────┴──────────────────────────────────┘
```

**Interactions:**
- `[+ New Project]` → opens an inline form or modal to enter name and description
- `[⋯]` menu per card → Edit, Delete (with confirmation dialog)
- Clicking a project card → navigates to Screen 2 (Schema Editor)
- Search field → real-time name filter

---

#### Screen 2 — Schema Editor

**Purpose:** Displays the field tree of the project's schema and allows rule configuration per field.

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  ← Projects  /  Project Name         [Import Avro]   │
├──────────────────────────────────────────────────────┤
│  Schema Fields                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │ ▸ id          string    [format: uuid]   [✎] │   │
│  │ ▾ address     object                     [✎] │   │
│  │     street    string    [enum]           [✎] │   │
│  │     city      string    [no rule]        [✎] │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│                          [→ Go to Generator]         │
└──────────────────────────────────────────────────────┘
```

**Interactions:**
- `[Import Avro]` → opens OS file picker (`.avsc`, `.json`); on success replaces all fields with confirmation dialog if fields already exist
- `[✎]` per field → opens a rule configurator panel (inline or side panel)
- `▸ / ▾` → expand/collapse nested object fields
- `[→ Go to Generator]` → navigates to Screen 3

---

#### Screen 3 — Generator

**Purpose:** Allows the user to generate, visualize, copy, and export mock JSON data.

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  ← Schema Editor  /  Project Name                    │
├──────────────────────────────────────────────────────┤
│  Quantity: [____10____]   [Generate]                 │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  {                                            │   │
│  │    "id": "a1b2c3d4-...",                     │   │
│  │    "address": {                               │   │
│  │      "street": "Main St",                    │   │
│  │      "city": "Springfield"                   │   │
│  │    }                                          │   │
│  │  }                                            │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│                        [📋 Copy]    [💾 Export]      │
└──────────────────────────────────────────────────────┘
```

**Interactions:**
- Quantity input → numeric, validated between `1` and `max_generation_limit`
- `[Generate]` → invokes `generator:run`; renders results in the JSON viewer
- `[📋 Copy]` → copies JSON string to clipboard; shows toast
- `[💾 Export]` → invokes `export:toFile`; opens OS save dialog

---

#### Screen 4 — Settings

**Purpose:** Allows the user to configure application-wide behaviour.

**Access:** Via a gear icon `⚙` in the bottom of the left sidebar, persistent across all screens.

**Layout:**
```
┌──────────────────────────────────────────────┐
│  ⚙ Settings                                  │
├──────────────────────────────────────────────┤
│  Generation                                  │
│  ─────────────────────────────────────────  │
│  Max records per generation                  │
│  [________1000________]  (1 – 10000)         │
│                                    [Save]    │
└──────────────────────────────────────────────┘
```

**Interactions:**
- Quantity input → numeric, validated between `1` and `10,000`
- `[Save]` → invokes `settings:set` with key `max_generation_limit`; shows confirmation toast

---

### 9.2 JSON Viewer Requirements

The JSON viewer component used in Screen 3 must provide:

| Feature | Description |
|---|---|
| Syntax highlighting | Keys, strings, numbers, booleans, and null must be visually distinguishable |
| Collapsible nodes | Objects and arrays must be collapsible/expandable |
| Line numbers | Optional line numbers for large outputs |
| Copy integration | Selecting the "Copy" button copies the full raw JSON string to clipboard |
| Performance | Must render 1,000 objects without layout jank; 10,000 objects may use virtualized scrolling |

---

## 10. Technical Stack

| Layer | Technology | Version | Justification |
|---|---|---|---|
| Desktop runtime | Electron | `33.x` | Cross-platform desktop framework |
| Build tool | electron-vite | `3.x` | Fast Vite-based build for Electron |
| Language | TypeScript | `5.x` | End-to-end type safety |
| UI framework | React | `19.x` | Component-based UI |
| UI components | shadcn/ui | latest | Accessible, customizable components |
| CSS framework | Tailwind CSS | `4.x` | Utility-first styling (shadcn/ui requirement) |
| State management | Zustand | `5.x` | Lightweight, TypeScript-friendly |
| Forms | react-hook-form + Zod | latest | Performant forms with schema validation |
| Database | better-sqlite3 | latest | Synchronous, embedded SQLite for Electron |
| ORM | Drizzle ORM | latest | TypeScript-first, lightweight |
| Schema import | avsc | latest | Apache Avro schema parser |
| Data generation | @faker-js/faker | `9.x` | Comprehensive fake data generation |
| JSON viewer | react-json-view-lite | latest | Lightweight, collapsible JSON tree |
| Packaging | electron-builder | latest | Cross-platform installers |

---

## 11. Implementation Roadmap

### Phase 1 — Foundation

| Task | Description |
|---|---|
| P1-T01 | Project scaffolding (electron-vite + React + TypeScript) |
| P1-T02 | Database setup (Drizzle + SQLite + migrations) |
| P1-T03 | IPC bridge (typed channels + contextBridge) |
| P1-T04 | Security hardening (CSP, nodeIntegration: false) |
| P1-T05 | Renderer UI setup (Tailwind + shadcn/ui + layout shell) |

**Exit criteria:** App launches, connects to SQLite, round-trip IPC call succeeds.

### Phase 2 — Core Features

| Task | Description |
|---|---|
| P2-T01 | Project repository (CRUD operations) |
| P2-T02 | Schema repository (schema + fields CRUD) |
| P2-T03 | Avro import service |
| P2-T04 | Projects page UI |
| P2-T05 | Schema editor page UI |

**Exit criteria:** User can create a project, import Avro, and configure field rules.

### Phase 3 — Generator Engine

| Task | Description |
|---|---|
| P3-T01 | Generation strategies (range, enum, format) |
| P3-T02 | Nested field resolver |
| P3-T03 | Generator engine (orchestration) |
| P3-T04 | JSON viewer UI |
| P3-T05 | Export service |

**Exit criteria:** Full end-to-end flow works — generate, view, copy, export.

### Phase 4 — Polish & Distribution

| Task | Description |
|---|---|
| P4-T01 | Settings screen |
| P4-T02 | Error handling & edge cases |
| P4-T03 | Keyboard navigation |
| P4-T04 | Packaging (electron-builder) |
| P4-T05 | Final QA walkthrough |

**Exit criteria:** Distributable installers for 3 platforms, all FR/NFR verified.

---

## 12. Appendix

### A. Avro Type Mapping

The following table defines how Avro primitive and complex types are mapped to MockForge internal field types during import.

| Avro Type | MockForge Field Type |
|---|---|
| `"string"` | `string` |
| `"int"`, `"long"`, `"float"`, `"double"` | `number` |
| `"boolean"` | `boolean` |
| `"null"` | `null` |
| `"bytes"` | `string` |
| `{ "type": "record", ... }` | `object` |
| `{ "type": "array", ... }` | `array` |
| `[ "null", "string" ]` (union with 2 types) | First non-null type; field is treated as non-nullable in v1 |
| `[ "null", "string", "int" ]` (union with 3+ types) | First non-null, non-complex type is selected; if none found, defaults to `string` |
| `[ "TypeA", "TypeB" ]` (union with no null) | First type is used; field is treated as non-nullable in v1 |

---

### B. Generation Strategy Reference

| Rule | Library / Method | Output Example |
|---|---|---|
| `range` | `faker.number.int({ min, max })` or `faker.number.float(...)` | `42` |
| `enum` | `faker.helpers.arrayElement(values)` | `"ACTIVE"` |
| `format: uuid` | `faker.string.uuid()` | `"a1b2c3d4-..."` |
| `format: date` | `faker.date.recent().toISOString().split('T')[0]` | `"2026-03-15"` |
| `format: datetime` | `faker.date.recent().toISOString()` | `"2026-03-15T10:23:00.000Z"` |
| `array` | `faker.helpers.multiple(() => faker.lorem.word(), { count: { min: 1, max: 5 } })` | `["lorem", "ipsum"]` |
| *(no rule — string)* | `faker.lorem.word()` | `"lorem"` |
| *(no rule — number)* | `faker.number.int()` | `1847` |
| *(no rule — boolean)* | `faker.datatype.boolean()` | `true` |

---

### C. Settings Keys Reference

| Key | Default | Description |
|---|---|---|
| `max_generation_limit` | `"1000"` | Maximum number of records per generation. Hard cap: `10000`. |
