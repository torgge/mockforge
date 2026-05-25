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
