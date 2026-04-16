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

## Builds multiplataforma

O app suporta Linux, Windows e macOS. Como o Tauri não faz cross-compilation entre sistemas operacionais, os instaladores são gerados via GitHub Actions em runners nativos de cada plataforma.

### Build local (plataforma atual)

```bash
pnpm tauri build
```

Gera os instaladores para o sistema onde o comando é executado:

| Sistema | Formatos gerados |
|---|---|
| Linux | `.deb`, `.rpm`, `.AppImage` |
| Windows | `.msi`, `.exe` |
| macOS | `.dmg`, `.app` |

Os arquivos ficam em `src-tauri/target/release/bundle/`.

### Publicar uma release (todos os sistemas)

Crie e envie uma tag seguindo o padrão `v*`:

```bash
git tag v1.0.0
git push origin v1.0.0
```

O workflow `.github/workflows/release.yml` dispara automaticamente, compila nos três sistemas em paralelo e cria um GitHub Release draft com todos os instaladores prontos para download.

### Verificação de build contínua

A cada push para `main` ou pull request, o workflow `.github/workflows/build-check.yml` verifica que o projeto compila corretamente nos três sistemas operacionais.

## IDE Recomendada

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
