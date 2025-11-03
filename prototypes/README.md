# Prototypes

## Comparison Snapshot

| Dimension | `prototypes/tauri` | `prototypes/qt` |
| --- | --- | --- |
| Primary stack | Rust + Tauri 2.x shell around the existing SPA | C++/Qt 6 WebEngine embedding the SPA |
| Key source size | `main.rs` 215 LOC | `main.cpp` 386 LOC |
| Footprint checked in | ~312 KB | ~11 MB (includes generated build output) |
| Tooling needed | Rust toolchain, `tauri-cli` | Full Qt 6 WebEngine/WebChannel SDK, CMake |
| Packaging | `cargo tauri build` produces cross-platform bundles using system webview | Requires bundling Qt frameworks; larger redistributables and LGPL/GPL considerations |

## Strengths

### `prototypes/tauri`
- Small code surface and fast build loop (`cargo tauri dev`).
- Reuses the SPA almost unchanged; lightweight bridge commands for folder scanning, text export, and logging.
- Ships installers quickly thanks to Tauri’s packaging pipeline and native webview integration.

### `prototypes/qt`
- Rich C++ bridge (`PlayerBridge`) with fine-grained control over file I/O and persistence via `QSettings`.
- Qt WebChannel signals deliver immediate backend-driven updates and notifications.
- Broader access to Qt modules if future native UI or audio features are required.

## Weaknesses

### `prototypes/tauri`
- Deeper native integrations demand additional Rust commands.
- Behavior depends on the quality and quirks of the platform webview.
- Persists most state through web storage; fewer built-in desktop conveniences.

### `prototypes/qt`
- Heavy setup: large SDK download, CMake configuration, and sizeable build artifacts.
- More code to maintain and debug, with Chromium-sized runtime overhead from WebEngine.
- Redistribution must account for Qt licensing and packaging of required frameworks.

## Recommendation

Objectively—looking at tooling weight, packaging effort, and maintenance cost—the Tauri prototype is the better fit for wrapping the current SPA as a desktop app. Subjectively, unless the roadmap includes deep Qt-specific integrations, sticking with Tauri keeps the project aligned with its web-centric workflow while still delivering a native shell.
