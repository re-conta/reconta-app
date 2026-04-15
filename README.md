# ReConta

Aplicativo de finanças pessoais feito com Tauri + React + TypeScript.

## Pré-requisitos

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri CLI](https://tauri.app/start/prerequisites/)

## Setup

```bash
pnpm install
```

## Desenvolvimento

```bash
pnpm tauri dev
```

## Build

```bash
pnpm tauri build
```

O build gera o instalador nativo em `src-tauri/target/release/bundle/`.

## Limpeza de builds

Caso precise recompilar do zero (ex: após mudanças no backend Rust):

```bash
pnpm clean
```

Remove a pasta `src-tauri/target` inteira (~4 GB). O próximo `pnpm tauri dev` ou `pnpm tauri build` recompila tudo.

## IDE Recomendada

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
