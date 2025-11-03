# Qt WebEngine Prototype

Desktop wrapper around the single-page Local Web Audio Player. The Qt build embeds `index.html` in a `QWebEngineView`, uses a WebChannel bridge to scan folders and persist playback state, and removes the File System Access prompts required in the browser-only version.

## Requirements
- Qt 6.4 or newer
- Qt modules: **WebEngineWidgets** and **WebChannel**
  - Qt Maintenance Tool: enable **Qt 6.x → Qt WebEngine → Desktop** and **Qt 6.x → Qt WebChannel → Desktop**

## Build & Run
From the repository root:
```bash
cd prototypes/qt
cmake -B build -S .
cmake --build build
./build/QtWebEnginePrototype
```

The executable launches the familiar player UI served from the bundled `index.html`.

## Manual Smoke Test
1. Launch `QtWebEnginePrototype`.
2. Click **Choose folder…**, select a directory containing `.mp3` files, and confirm the playlist populates and playback works.
3. Close the app, relaunch, and verify the previous folder, last track, shuffle/loop/announce state, volume, and visualizer mode are restored automatically without additional prompts.

## Data Storage
The bridge persists settings and recent folder selections via `QSettings` and the Qt web engine profile:
- macOS: `~/Library/Application Support/NightVsKnight/QtWebEnginePrototype/`
- Windows: `%APPDATA%\NightVsKnight\QtWebEnginePrototype\`
- Linux: `${XDG_DATA_HOME:-~/.local/share}/NightVsKnight/QtWebEnginePrototype/`

These directories also host cached audio URLs and WebEngine profile data. Remove them to reset the prototype to a fresh state.
