# MockForge QA Checklist

Generated: 2026-05-24

---

## How to Use This Checklist

Check off each item after manual or automated verification. For failed items, note the severity (Critical / Major / Minor) and file reference.

---

## 1. User Story Verification

### US-01 — Create a named project

- [ ] Creating a new project with a valid name and optional description succeeds
- [ ] The project appears in the project list immediately after creation (no page reload)
- [ ] Creating a project with an empty name is rejected (form validation)
- [ ] Creating a project with a name > 255 characters is rejected

### US-02 — Search for a project by name

- [ ] Typing in the search field filters the list in real time
- [ ] Case-insensitive matching works (e.g., "user" matches "User" and "MyUser")
- [ ] Substring matching works (e.g., "pro" matches "MyProject")
- [ ] Clearing the search restores the full project list
- [ ] Empty search results display a meaningful "no matches" message

### US-03 — Import an Avro schema

- [ ] Importing a valid Avro JSON string parses all fields correctly
- [ ] Nested object types are imported with child fields
- [ ] Array types are imported with item child fields
- [ ] Primitive type mapping is correct (string, int/long/float/double -> string/number, boolean, null)
- [ ] Union types (e.g., ["null", "string"]) resolve to the first non-null type
- [ ] Invalid JSON input displays a descriptive error
- [ ] Invalid Avro schema (missing "type" or "fields") displays a descriptive error
- [ ] Existing fields remain unchanged when the import fails (atomicity)

### US-04 — Configure a generation rule for each field

- [ ] Range rule can be assigned to number fields only
- [ ] Enum rule can be assigned to string, number, and boolean fields
- [ ] Format rule (uuid, date, datetime) can be assigned to string fields only
- [ ] Rules cannot be assigned to object, array, or null fields
- [ ] Rule can be removed (set to "no rule")
- [ ] Saved rules persist on page reload

### US-05 — Nested object fields supported

- [ ] Object fields display their child fields in the field tree
- [ ] Child fields can be expanded/collapsed
- [ ] Each child field can have its own independent rule
- [ ] Deep nesting (5+ levels) works
- [ ] Generated JSON includes nested structure with correct field names

### US-06 — Generate a JSON array of any size

- [ ] Entering quantity N generates an array of N objects
- [ ] Generating 1 record works
- [ ] Generating the max limit (default 1000) works
- [ ] Entering 0 or negative is rejected
- [ ] Entering a value above the max limit is rejected

### US-07 — Regenerate data without configuration changes

- [ ] Clicking "Generate" again produces different random values
- [ ] No configuration is lost when regenerating

### US-08 — Copy generated JSON to clipboard

- [ ] Clicking "Copy" copies the full JSON string (formatted with 2-space indentation)
- [ ] A confirmation message ("Copied!") is shown
- [ ] The confirmation auto-dismisses after ~2 seconds

### US-09 — Export generated JSON to a file

- [ ] Clicking "Export" opens the native OS save dialog
- [ ] The default filename follows the pattern `{project-name}-{timestamp}.json`
- [ ] The saved file contains valid JSON
- [ ] Cancelling the save dialog returns without error
- [ ] A saved file can be re-imported (round-trip test)

### US-10 — Delete a project

- [ ] Delete requires explicit user confirmation
- [ ] Confirming deletes the project, its schema, and all associated fields (cascade)
- [ ] Cancelling the confirmation does not delete anything
- [ ] After deletion, the project no longer appears in the list
- [ ] Attempting to delete a non-existent project throws an appropriate error

---

## 2. Functional Requirements Verification

### FR-01 — Project Management

- [ ] FR-01-1: Create with required name and optional description
- [ ] FR-01-2: Projects displayed in descending creation date order
- [ ] FR-01-3: Edit name and description at any time
- [ ] FR-01-4: Delete cascades to schema and fields after confirmation
- [ ] FR-01-5: Search by name with case-insensitive substring match

### FR-02 — Schema & Field Management

- [ ] FR-02-1: Each project has exactly one schema, auto-created
- [ ] FR-02-2: Import Avro schema (paste JSON) to populate fields
- [ ] FR-02-3: **Confirmation prompt before replacing existing fields on re-import**
- [ ] FR-02-4: Nested fields supported to any depth, each with independent rules
- [ ] FR-02-5: Invalid Avro rejected with error message; existing fields unchanged

### FR-03 — Field Rule Configuration

- [ ] FR-03-1: Each field supports zero or one rule; no rule = random value per type
- [ ] FR-03-2: Range rule applies to number fields only; min/max defined
- [ ] FR-03-3: Enum rule applies to string, number, boolean; at least 1 value required
- [ ] FR-03-4: Format rule applies to string; subtypes: uuid, date, datetime

### FR-04 — Data Generation

- [ ] FR-04-1: Generate N objects (1 <= N <= max_generation_limit)
- [ ] FR-04-2: Each object conforms to schema and respects all rules
- [ ] FR-04-3: Each generation produces new random values (no caching)

### FR-05 — JSON Viewing

- [ ] FR-05-1: Syntax-highlighted, collapsible tree view
- [ ] FR-05-2: "Copy to Clipboard" copies full JSON, shows confirmation

### FR-06 — Export

- [ ] FR-06-1: Export to .json via native OS save dialog
- [ ] FR-06-2: Default filename = `{project-name}-{timestamp}.json`

---

## 3. Edge Cases

### Schema & Fields
- [ ] Empty schema (project created but no Avro imported yet)
- [ ] Schema with zero fields after import (error path)
- [ ] Field with extremely long name
- [ ] Field type `null` at root level
- [ ] Object type with no child fields (generates `{}`)
- [ ] Array type with no child fields (generates `[]`)
- [ ] Enum with a single value
- [ ] Range with min == max
- [ ] Range with min > max (should not be prevented but will generate max)
- [ ] Nested arrays (array inside array)
- [ ] Array of objects with multiple levels of nesting

### Generation
- [ ] Generate with quantity = max_generation_limit (default 1000)
- [ ] Generate with quantity = 1
- [ ] Generate before importing any schema (should show error/blocked state)
- [ ] Generation with only `null` type fields
- [ ] Regenerate multiple times (verify all new values each time)
- [ ] Generate, modify a rule, generate again (new values respect new rule)

### Navigation
- [ ] Navigate directly to `/project/invalid-uuid/schema` (unknown project)
- [ ] Navigate directly to `/project/invalid-uuid/generator` (unknown project)
- [ ] Browser back/forward buttons work correctly
- [ ] Page refresh on each route preserves state via IPC calls

### Export
- [ ] Export with empty filename rejected
- [ ] Export with special characters in project name (triggers suggestedName creation)
- [ ] Cancel save dialog returns `null`, no error in UI
- [ ] Export after deleting the project from another window/tab (if applicable)

### Settings
- [ ] Change max generation limit, verify it persists on reload
- [ ] Set limit to 1, verify generation of 1 succeeds
- [ ] Set limit to 10000, verify generation of 10000 works
- [ ] Set limit to 0 (should be rejected by Zod)
- [ ] Set limit to 10001 (should be rejected by Zod)

### Avro Import
- [ ] Import empty JSON object `{}`
- [ ] Import JSON with `type: "record"` but no `fields`
- [ ] Import JSON with `fields: []` (valid but empty)
- [ ] Import JSON with deeply nested records (10+ levels)
- [ ] Import JSON with unions containing only null `["null"]`
- [ ] Import JSON with enum type declarations (Avro enums)
- [ ] Import with extremely large schemas (1000+ fields) — verify performance
- [ ] Import malformed JSON (syntax error) — verify error is caught

---

## 4. Performance Tests

| Test | Target | Result |
|---|---|---|
| Generate 100 records with simple flat schema | < 200ms | |
| Generate 1,000 records with simple flat schema | < 2s | |
| Generate 10,000 records with simple flat schema | < 10s | |
| Generate 1,000 records with deeply nested schema (5+ levels) | < 3s | |
| Cold app launch to interactive UI | < 3s | |
| Import Avro schema with 100 fields | < 1s | |
| Import Avro schema with 1000 fields | < 5s | |

---

## 5. Code Quality Findings

### TypeScript Issues

- [ ] **No `any` types used** — EXCEPTION: `avro-parser.ts:14` uses `type AvroSchema = any` with eslint-disable. Accepted trade-off for recursive Avro type representation.
- [ ] **No `as` type assertions** — Multiple `as Field['type']`, `as FieldRule`, `as Record<string, unknown>` casts found in:
  - `schema.service.ts` (lines 91, 101, 119, 141-142)
  - `generator.service.ts` (lines 36-37)
  - These are inherent to SQLite row deserialization and acceptable but worth monitoring.

### Error Handling

- [ ] All IPC handlers wrap in try/catch via `wrapHandler`
- [ ] Frontend pages catch errors from IPC calls
- [ ] **ISSUE**: `GeneratorPage.tsx` lines 55 and 71 silently swallow errors (empty `catch` blocks with `// ignore` comment)
- [ ] **ISSUE**: `export.service.ts` does not wrap `writeFileSync` in try/catch — a disk-full or permission error will throw uncaught

### Dead Code / Unused

- [ ] `avsc` npm package is listed as a dependency but never imported anywhere — the Avro parser is custom
- [ ] `generator.slice.ts`: `clearGeneratedData` action is never called from any page
- [ ] `project.slice.ts`: `filteredProjects` computed method is never called (filtering is done locally in ProjectsPage)

### SDD Compliance Gaps

- [ ] **FR-02-3**: No confirmation dialog before replacing existing fields on Avro re-import. The import dialog shows a text notice ("Existing fields will be replaced") but does not require explicit user acknowledgment.

---

## 6. Regression Test Suite

Run these after any code change:

- [ ] `npm run typecheck` — passes with zero errors
- [ ] `npm test` — all tests pass
- [ ] `npm run build` — builds without errors
- [ ] Manual: Create project -> Import Avro -> Set rules -> Generate -> Copy -> Export -> Delete project
- [ ] Manual: Change max limit in settings -> Verify applies to generator page -> Restart app -> Verify persists

---

## 7. Browser / Platform Checklist

- [ ] macOS (primary dev target)
- [ ] Windows 10+
- [ ] Ubuntu 22.04+

---

## 8. Severity Legend

| Severity | Description |
|---|---|
| **Critical** | Blocks core functionality or causes data loss |
| **Major** | Impairs a significant feature or violates a functional requirement |
| **Minor** | Cosmetic, non-blocking, or edge-case issue |

---

## 9. Known Issues Log

| # | Severity | Description | File | Status |
|---|---|---|---|---|
| 1 | Minor | `avsc` npm package declared but unused; custom AvroParser implemented instead | `package.json` | Open |
| 2 | Minor | Silent error catch in GeneratorPage (schema fetch, limit fetch) | `GeneratorPage.tsx:55,71` | Open |
| 3 | Minor | `writeFileSync` in ExportService not wrapped in try/catch | `export.service.ts:17` | Open |
| 4 | Minor | Missing confirmation dialog for Avro re-import (FR-02-3) | `SchemaEditorPage.tsx` | Open |
| 5 | Minor | `clearGeneratedData` in generator slice is unused | `generator.slice.ts` | Open |
| 6 | Minor | `filteredProjects` in project slice is unused | `project.slice.ts` | Open |
| 7 | Minor | `FieldUpdateRulePayload.rule` Zod schema allows nullable, but `fieldRuleSchema` does not handle null explicitly (handled via `.nullable()`) | `validation.ts:65` | Open |
| 8 | Info | All `as Field['type']` casts in schema/generator services from SQLite row deserialization are inherently unsafe but standard practice | Various | Info |

---

*End of QA Checklist*
