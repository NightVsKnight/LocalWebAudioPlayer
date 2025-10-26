# GitHub Copilot Instructions

This file provides guidance for GitHub Copilot when working on the Local Web Audio Player project.

## Project Overview

This is a single-page web audio player application that uses modern browser APIs (File System Access API, Web Audio API, Media Session API) to play local audio files. The entire application is contained in `player.html` with no build tooling or dependencies.

## Key Architecture Principles

### Single-File Design
- All HTML, CSS, and JavaScript are contained in `player.html`
- Keep code inline unless there's a clear modular benefit
- No bundlers, transpilers, or build steps required
- The app runs directly in Chromium-based browsers

### Browser APIs Used
- **File System Access API**: For folder selection and file reading (note: absolute paths are unavailable)
- **Web Audio API**: For audio playback and spectrum analysis
- **IndexedDB**: For persisting state (preferences, last track, folder handle)
- **Media Session API**: For OS-level media control integration
- **Speech Synthesis API**: For optional voice announcements

## Code Style Guidelines

### JavaScript
- Use modern ES6+ syntax and browser APIs
- Prefer `const` and `let` over `var`
- Use camelCase for variables and functions
- Use UPPERCASE for true constants (e.g., `DB_NAME`, `PREFERRED_VOICE_NAMES`)
- Two-space indentation throughout
- Add comments only to explain intent, not mechanics
- Keep functions focused and single-purpose

### HTML/CSS
- Two-space indentation
- Use semantic HTML elements
- CSS custom properties (variables) are defined in `:root`
- Maintain the existing visual aesthetic (space/nebula theme)

## Important Constraints and Gotchas

### File System Access API Limitations
- Absolute file paths are not available through this API
- Only expose file/folder names and handles, never attempt to show full paths
- Always request and verify permissions before accessing stored directory handles

### State Persistence
- Use IndexedDB for all persistent storage
- Current persisted state includes:
  - Shuffle preference (default: on)
  - Loop mode preference (default: all)
  - Volume level (0-1 range)
  - Last played track information
  - Directory handle for the selected folder
  - Announcer voice preference

### Audio Context
- Create AudioContext only after user interaction to comply with browser autoplay policies
- Handle browsers that don't support AudioContext gracefully
- Disable spectrum analyzer if AudioContext is unavailable

## Testing Approach

### Manual Testing Only
- No automated test framework is configured
- Test in Chromium-based browsers (Chrome, Edge, Opera)
- Always verify these core workflows:
  1. Folder selection and file loading
  2. Playback controls (play, pause, next, previous)
  3. State persistence across page reloads
  4. Shuffle and loop mode behavior
  5. Volume control (slider and keyboard shortcuts)
  6. Media Session API integration (if supported)
  7. Speech announcements (if enabled)
  8. Spectrum analyzer visualizations

### Documentation of Tests
- Update README.md manual testing section for any new features
- Include specific test steps for UI changes

## Making Changes

### When Adding Features
1. Check if the feature requires browser API support
2. Implement graceful degradation for unsupported browsers
3. Update state persistence if new preferences are added
4. Add manual test steps to README.md
5. Ensure two-space indentation is maintained

### When Fixing Bugs
1. Identify the minimal change needed
2. Test the fix manually in a Chromium browser
3. Verify state persistence isn't broken
4. Check that existing functionality still works

### When Modifying UI
1. Maintain the existing space/nebula visual theme
2. Use CSS custom properties from `:root` for colors
3. Ensure responsive design principles
4. Test with different viewport sizes
5. Provide screenshots of visual changes

## File Organization

### Current Structure
```
/
├── player.html          # Main application file (HTML + CSS + JS)
├── media/              # Optional local assets for manual testing (not shipped)
├── README.md           # User-facing documentation and manual test steps
├── AGENTS.md           # General repository guidelines for all agents
└── .github/
    └── copilot-instructions.md  # This file
```

### Adding Files
- Supporting assets (icons, fonts) go in `media/` with appropriate subfolders
- Keep the single-file architecture unless absolutely necessary
- Document any new files in README.md and AGENTS.md

## Common Tasks

### Adding a New Preference
1. Add the preference to the UI (HTML)
2. Create state variables in JavaScript
3. Load the preference from IndexedDB on startup
4. Save the preference to IndexedDB when changed
5. Apply the preference to relevant functionality
6. Add manual test steps to README.md

### Adding a New Audio Feature
1. Verify Web Audio API support
2. Implement with graceful degradation
3. Connect to existing audio context
4. Test with various audio files
5. Document the feature in README.md

### Modifying Announcements
1. Update `ANNOUNCE_RULES` array for folder-specific handling
2. Update `PREFERRED_VOICE_NAMES` for voice selection
3. Test with speech synthesis enabled
4. Verify fallback behavior when synthesis is unavailable

## Commit Conventions

- Use imperative mood (e.g., "Add feature" not "Added feature")
- Keep first line ≤72 characters
- Format: `<emoji> <Brief description>`
- Common emojis:
  - ✨ New feature
  - 🐛 Bug fix
  - 📝 Documentation
  - 🎨 UI/styling changes
  - ♻️ Refactoring
  - 🔧 Configuration changes

Example commit message:
```
✨ Add keyboard volume control

Implement Up/Down arrow key handlers for volume adjustment in 5%
increments. Volume changes are persisted to IndexedDB and respect
focus context to avoid interfering with list scrolling.
```

## Pull Request Guidelines

- Include a summary of behavior changes
- List manual test steps performed
- Link related issues using `Fixes #123` or `Closes #123`
- Add screenshots for UI changes
- Add screen recordings for interaction flows

## Resources

- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Speech Synthesis API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
