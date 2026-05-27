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
| Schema import | Custom Avro parser (built-in) |
| Data generation | @faker-js/faker |
| Packaging | electron-builder |
| Container | Docker + noVNC |

## Documentation

- [Software Design Document (SDD)](docs/mockforge-sdd.md)
- [Implementation Plan](docs/mockforge-implementation-plan.md)
- [Review & Parallel Execution Plan](docs/mockforge-parallel-execution-plan.md)

## Development

### Prerequisites

- **Node.js** 20.x or later
- **npm** 10.x or later

### Setup

```bash
# Clone the repository
git clone https://github.com/torgge/mockforge.git
cd mockforge

# Install dependencies (rebuilds native sqlite3 for Electron automatically)
npm install
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Electron app in development mode with HMR |
| `npm run build` | Build for production (electron-vite) |
| `npm test` | Run all tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | TypeScript type checking (main + renderer) |
| `npm run build:mac` | Package macOS `.dmg` |
| `npm run build:win` | Package Windows `.exe` installer |
| `npm run build:linux` | Package Linux `.AppImage` + `.deb` |
| `npm run build:all` | Package all platforms |
| `npm run db:generate` | Generate Drizzle ORM migrations |
| `npm run db:migrate` | Apply pending database migrations |
| `npm run db:push` | Push schema changes directly to database |

### Running the App

```bash
npm run dev
```

This starts the Electron app with Vite's HMR. The SQLite database (`mockforge.db`) is created automatically in your OS user data directory on first launch.

### Running Tests

```bash
npm test
```

82 tests across 9 test files:

- **Backend services** — Project CRUD, Schema & field rules, Avro parsing, Export, Settings
- **Generator engine** — Strategies (range, enum, format, default), nested field resolver
- **Performance benchmarks** — Generation speed for 100 / 1,000 / 10,000 records

## Docker

MockForge can run inside a Docker container with a virtual display exposed via noVNC, making it accessible from any browser.

### Prerequisites

- **Docker** 20.x or later with Docker Compose plugin

### Quick Start

```bash
# Build and start
docker compose up --build -d

# Open in browser
open http://localhost:6080/vnc.html
```

### Ports

| Port | Protocol | Description |
|---|---|---|
| 6080 | HTTP (WebSocket) | noVNC web client — access MockForge in your browser |
| 5900 | RFB (VNC) | Raw VNC — for native VNC clients |

### Volumes

| Volume | Mount path | Purpose |
|---|---|---|
| `mockforge_data` | `/data/config` | SQLite database and user settings |
| `mockforge_export` | `/home/mockforge/exports` | Generated JSON export files |

Data persists across container restarts and recreations. To reset data:

```bash
docker compose down -v
```

### Management

```bash
# View logs
docker compose logs -f

# Stop
docker compose down

# Rebuild after code changes
docker compose up --build -d
```

### Architecture

The container runs a self-contained display stack:

1. **Xvfb** — virtual framebuffer providing an X11 display (`:1`)
2. **Openbox** — lightweight window manager
3. **x11vnc** — VNC server attached to the X11 display
4. **noVNC** — WebSocket proxy + web client (serves on port 6080)
5. **Electron** — MockForge app with `--no-sandbox` (required for container environments)

### Project Structure

```
src/
├── main/              # Electron main process (Node.js)
│   ├── db/            # Drizzle schema + DB client
│   ├── ipc/           # IPC handler registry (12 channels)
│   └── services/      # Business logic + generator strategies
├── preload/           # contextBridge setup (typed IPC surface)
├── shared/            # Types, channel constants, Zod validation
└── renderer/          # React UI
    ├── components/    # Reusable UI (Layout, ErrorBoundary, ui primitives)
    ├── pages/         # Projects, Schema Editor, Generator, Settings
    ├── hooks/         # useIpc hook
    └── store/         # Zustand state slices
test/
├── fixtures/          # Avro schema test fixtures (.avsc)
├── services/          # Backend service unit tests
├── generator/         # Generator & strategy unit tests
└── benchmarks/        # Performance benchmarks
docker/
└── entrypoint.sh      # Container startup script
```

## Gerando uma Release

O pipeline de release é disparado automaticamente ao fazer push de uma tag `vX.Y.Z`. O processo completo é:

### Fluxo padrão

```bash
# 1. Atualizar a versão no package.json (cria commit + tag automaticamente)
npm version patch   # ou minor / major

# 2. Enviar o commit e a tag para o repositório remoto
git push origin main --follow-tags
```

> `npm version` já cria o commit de bump e a tag com formato `vX.Y.Z` automaticamente — não é necessário criar a tag manualmente.

### O que acontece após o push da tag

O GitHub Actions dispara o workflow `.github/workflows/release.yml`, que:

1. Compila e empacota o app em paralelo para **três plataformas**:
   | Plataforma | Arquivo gerado |
   |---|---|
   | macOS | `.dmg` |
   | Windows | `.exe` (NSIS installer) |
   | Linux | `.AppImage` e `.deb` |
2. Publica automaticamente uma **GitHub Release** com os artefatos e notas de release geradas a partir dos commits.

### Draft sem criar tag (teste do pipeline)

Para acionar o pipeline manualmente e gerar um **draft** da release sem criar uma tag:

1. Acesse **Actions → Release → Run workflow** no GitHub.
2. O `workflow_dispatch` gera os artefatos e cria um rascunho de release que não é publicado.

### Code signing (opcional)

A assinatura de código é **opcional** — o app funciona sem ela, mas pode exigir uma etapa extra para ser aberto:

- **macOS:** usuários precisarão usar **"Abrir com"** ou permitir via Preferências de Segurança.
- **Windows:** o SmartScreen exibirá um aviso; o usuário pode clicar em "Mais informações → Executar assim mesmo".

Para habilitar o signing, configure os secrets `CSC_LINK` / `CSC_KEY_PASSWORD` (macOS) e `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` (Windows) no repositório GitHub.

### Onde encontrar os releases

As releases publicadas ficam disponíveis em:
**https://github.com/torgge/mockforge/releases**

## License

Private — All rights reserved.
