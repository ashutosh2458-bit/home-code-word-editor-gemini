# High-Performance Cross-Platform Document Formatter & Editor

An enterprise-grade document editor combining a C++20 Piece Table buffer compiled to WebAssembly via Emscripten, an extensible TypeScript plugin Command Registry (supporting 300+ features & `Cmd+K`/`Ctrl+K` palette), a sandboxed VBA Macro execution engine, offline NLP analysis via Pyodide WebWorkers, and a native macOS Cocoa wrapper.

## Architecture Overview
- **Core Engine (`src/core/`, `wasm/`):** C++20 Piece Table data structure with O(log N) operations, style span tracking, regex search/replace, and undo/redo command tree compiled via Emscripten (`-lembind`, `-sMODULARIZE=1`, `-sEXPORT_ES6=1`).
- **UI & Command Hub (`src/ui/`, `src/core/CommandRegistry.ts`):** Virtualized DOM/Canvas viewport, reactive `localStorage` auto-save `StateStore`, modular `Toolbar`, and searchable `CommandRegistry`.
- **VBA Macro Sandbox (`src/macros/`):** Full lexer, recursive-descent AST parser, and step-guarded interpreter executing legacy Word/Office VBA macros safely in the browser.
- **Offline AI & NLP (`src/ai/`):** Non-blocking Pyodide WebWorker computing TF-IDF extractive summarization, Flesch-Kincaid readability scores, keyword frequencies, and passive-voice detection.
- **Native macOS Bridge (`src/native/`):** ARC-enabled Objective-C `WKWebView` wrapper with native menu bar items wired to `CommandRegistry` and `NSOpenPanel`/`NSSavePanel` file dialogs.

## Local Setup & Build
1. Ensure **Emscripten SDK (7.0+)** and **Node.js (22+)** are installed and active in your shell.
2. Compile the WebAssembly core and start the Vite development server:
   ```bash
   make dev
   ```
3. Build the production bundle:
   ```bash
   make build
   ```

## Automated Deployment
Pushing to `main` triggers `.github/workflows/deploy.yml`, which installs Emscripten 7.0.0 and Node 22, compiles `public/wasm/document_core.wasm`, builds the Vite production bundle, and deploys to GitHub Pages.
