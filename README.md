# MockForge 🔨

Desktop application for generating structured mock JSON data based on user-defined schemas.

## Overview

MockForge is an offline desktop application built with Electron and TypeScript. It allows developers to create projects, import Avro schemas, configure field-level generation rules, and produce mock JSON data on demand.

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop runtime | Electron |
| Build tool | electron-vite |
| Language | TypeScript |
| UI | React + shadcn/ui |
| State | Zustand |
| Forms | react-hook-form + zod |
| Database | SQLite + Drizzle ORM |
| Schema import | avsc |
| Data generation | @faker-js/faker |
| Packaging | electron-builder |

## Documentation

- [Software Design Document (SDD)](docs/mockforge-sdd.md)
- [Implementation Plan](docs/mockforge-implementation-plan.md)
- [Review & Parallel Execution Plan](docs/mockforge-parallel-execution-plan.md)

## Development

> Setup instructions will be added during Wave 0 — Bootstrap.

## License

Private — All rights reserved.
