# PDF Opener Pro

A professional desktop PDF viewer and editor built with **Tauri** (Rust) + **React** (TypeScript). Cross-platform (Windows, macOS, Linux) with native performance.

## Architecture

```
pdf-opener-pro/
├── src-tauri/           # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs      # App entry, IPC handler registration
│   │   ├── lib.rs       # Library exports
│   │   ├── pdf/         # PDF processing (processor, annotations)
│   │   ├── commands/    # Tauri IPC commands (document, annotations)
│   │   └── utils/       # Logger, file operations
│   ├── Cargo.toml       # Rust dependencies
│   ├── tauri.conf.json  # Tauri app configuration
│   └── icons/           # App icons
├── src/                 # React frontend
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # React entry point
│   ├── components/      # UI components
│   │   ├── PDFViewer/   # PDF rendering with pdfjs-dist
│   │   ├── Toolbar/     # Top toolbar with tools
│   │   ├── Sidebar/     # Thumbnails, bookmarks, annotations
│   │   ├── Modals/      # Settings, signature dialogs
│   │   └── Common/      # Spinner reusable components
│   ├── hooks/           # React hooks (usePDF, useFileDialog)
│   ├── store/           # Zustand state management
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Helper functions
│   └── styles/          # CSS (global, themes)
├── tests/               # Unit, integration, E2E tests
├── scripts/             # Build & automation scripts
├── docs/                # API, architecture docs
└── .github/workflows/   # CI/CD pipelines
```

## Features

### Current
- **PDF Rendering** — Real PDF rendering using `pdfjs-dist` with page-by-page canvas rendering
- **File Open** — Native OS file dialog via Tauri API (Ctrl+O)
- **Page Navigation** — Previous/Next page with keyboard and buttons
- **Zoom Controls** — Zoom in/out (25%–300%)
- **Tool selection** — Select, Hand, Text, Signature, Highlight tools
- **Keyboard Shortcuts** — Ctrl+O (open), Ctrl+S (save), Ctrl+Z (undo)
- **Dark/Light theme** — Mantine UI theming
- **Sidebar** — Thumbnails, bookmarks, annotations tabs
- **Modals** — Settings and Signature dialogs

### Planned
- Text annotations overlay on PDF pages
- Signature drawing/insertion
- Highlight, underline, strikethrough annotations
- PDF export with flattened annotations
- Bookmark management
- Thumbnail previews in sidebar
- Full-text search

## Tech Stack

| Layer         | Technology                          |
|---------------|-------------------------------------|
| Desktop Shell | Tauri v1.8                          |
| Backend       | Rust (edition 2021)                 |
| Frontend      | React 18 + TypeScript 5             |
| State         | Zustand                             |
| UI Library    | Mantine v7                          |
| PDF Rendering | pdfjs-dist v4                       |
| Build         | Vite 5                              |
| Styling       | Tailwind CSS + custom CSS           |
| Memory Alloc  | mimalloc (secure)                   |
| Async         | Tokio (full)                        |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 1.75+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- Windows: Microsoft Visual Studio Build Tools (for native modules)

### Install

```bash
cd pdf-opener-pro
pnpm install
```

### Run (Development)

```bash
pnpm tauri:dev
```

This starts the Vite dev server and launches the Tauri desktop window with hot reload.

### Build (Production)

```bash
pnpm tauri:build
```

Outputs a platform-specific installer in `src-tauri/target/release/bundle/`.

### Test

```bash
pnpm test              # Unit tests (Vitest)
pnpm test:ui           # Vitest UI mode
cargo test             # Rust tests
```

## IPC Commands

The Rust backend exposes these commands via Tauri IPC:

| Command                    | Description                    |
|----------------------------|--------------------------------|
| `open_document`            | Open a PDF file by path        |
| `save_document`            | Save document state            |
| `export_document`          | Export PDF with annotations    |
| `add_signature`            | Add a signature annotation     |
| `add_text`                 | Add a text annotation          |
| `add_highlight`            | Add a highlight annotation     |
| `remove_annotation`        | Remove an annotation by ID     |
| `update_annotation`        | Update an existing annotation  |

## Rust Backend

The backend uses `mimalloc` as the global allocator for performance. `PDFProcessor` manages documents and annotations in thread-safe `Arc<Mutex<HashMap>>` storage. Commands receive Tauri state injection (`State<'_, PDFProcessor>`) and use `anyhow` for error handling with `thiserror` for typed errors.

```rust
// Example: add_text command
#[tauri::command]
pub async fn add_text(
    state: State<'_, PDFProcessor>,
    doc_id: String,
    page: u32,
    content: String,
    color: String,
    x: f32,
    y: f32,
    width: f32,
    height: f32,
) -> Result<Annotation, String> {
    let annotation = Annotation {
        id: format!("txt_{}", uuid::Uuid::new_v4()),
        page, x, y, width, height, content, color,
        font_size: Some(12.0), font_family: None,
    };
    state.add_annotation(&doc_id, annotation).await.map_err(|e| e.to_string())
}
```

## Frontend Architecture

State is managed with **Zustand** stores:

- `pdfStore` — PDF document list, current document ID
- `uiStore` — Theme, sidebar visibility, zoom level
- `settingsStore` — Persisted user preferences (via `zustand/middleware/persist`)

PDF rendering uses `pdfjs-dist` with the worker bundled via Vite's `?url` import:

```typescript
import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
```

## Performance Optimizations

- **mimalloc** global allocator for Rust (fast, secure, low fragmentation)
- **Tokio** async runtime for non-blocking IPC
- **pdfjs-dist** worker runs off the main thread
- **Code splitting** via `React.lazy()` for modals
- **Manual Vite chunking** separates vendor, UI framework, and pdfjs into separate bundles
- **LRU cache** (Rust) for rendered pages (50 entries)
- **Parallel pre-rendering** of first 5 pages on document open (Rust)

## Project Status

This is an **active development** project. The MVP supports:
- Opening and viewing any PDF file
- Page navigation and zoom
- Basic annotation data model
- Theme switching
- File save (backend)

Next priorities: text annotation overlay on canvas, signature input, highlight tool, PDF export.

## License

MIT
