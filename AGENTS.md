# Repository Guidelines

## Project Structure & Module Organization
- `player.html` – single-page web app with all UI, logic, and styles.
- `media/` – optional local assets for manual testing; not shipped.
- `README.md` – quick-start usage notes. Keep it aligned with UI changes.

Keep any new JS or CSS inline unless a clear modular benefit exists. If you add supporting files (e.g., icons, fonts), place them under `media/` with subfolders as needed.

## Build, Test, and Development Commands
- `open player.html` (macOS) / `xdg-open player.html` (Linux) – launch the app in a Chromium browser.
- `python3 -m http.server` (optional) – serve the project locally if browser security blocks file APIs.

No build tooling is configured; the app is static HTML. If you introduce tooling, document it here and in the README.

## Coding Style & Naming Conventions
- Stick to modern ES modules and browser APIs; avoid bundlers unless necessary.
- Favor descriptive camelCase for variables and functions; uppercase constants when their value is fixed (`DB_NAME`).
- Keep indentation at two spaces to match the existing HTML/CSS/JS style.
- Inline comments should explain intent, not mechanics. Add sparingly above complex logic.

## Testing Guidelines
- Manual testing is the norm. Verify folder selection, playback controls, and state persistence in Chromium-based browsers.
- Document any new manual test steps in the README.
- If automated tests are introduced (e.g., Playwright), store them under `tests/` and add run instructions in this section.

## Commit & Pull Request Guidelines
- Commit messages follow a concise imperative style, ≤72 characters (e.g., `Persist last folder selection`).
- Include a short body describing rationale or side effects when helpful.
- Pull requests should summarize behavior changes, list manual test steps, and link related issues. Add screenshots or screen recordings when UI changes are made.

## Agent Tips
- Respect the File System Access API limitations; absolute paths are unavailable, so expose handle names only.
- When persisting data, prefer IndexedDB for structured storage and note permission requirements in code comments.
