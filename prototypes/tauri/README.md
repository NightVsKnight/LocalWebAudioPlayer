# Local Web Audio Player (Tauri Shell)

This directory packages the existing `player.html` inside a Tauri 2.x desktop window. Launching it opens the full Local Web Audio Player UI without relying on a browser, giving you native window chrome and the path toward future desktop-only features.

## Prerequisites
- Rust toolchain (`rustup` with the stable channel installed)
- Tauri CLI 2.9.2 (`cargo install tauri-cli --version 2.9.2`)

## Run the App
From the repository root:
```bash
cd prototypes/tauri
cargo tauri dev
```

## Build Artifacts
While still inside `prototypes/tauri`:
```bash
cargo tauri build
```

Release bundles land under `src-tauri/target/{triple}/release/`, while debug builds stay in `src-tauri/target/{triple}/debug/`. Platform-specific installers (DMG/MSI/AppImage) appear in that folder when supported.

## Window Layout
`src-tauri/tauri.conf.json` pins the main window to 1280×900, non-resizable, with the title “Local Web Audio Player” to match the SPA branding. Update those values if you want different dimensions.

## Desktop-specific Behavior
- Folder selection uses the native OS dialog and recursively loads `.mp3` files via Tauri commands.
- OBS text export writes directly to the chosen path; edit `src-tauri/src/main.rs` if you need additional output formats.
