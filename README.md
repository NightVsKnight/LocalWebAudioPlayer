
# Local Web Audio Player

Very boring name for now.

I created this because:
1. YouTube/YouTubeMusic plays way too many ads
2. I did not like VLC very much
3. I wanted to add a "Now playing ... That was ... " voice

## Features
- Remembers shuffle and loop preferences between sessions (defaults: Shuffle On, Loop All).
- Restores the last played track when available, otherwise falls back to the first track.
- Offers optional voice announcements for track transitions with customizable voice selection.
- Shows the current track number in the Now Playing header for quick reference.
- Includes selectable spectrum analyzer visualizations (Neon Bars, Glow Wave, Pulse Halo) with logarithmic frequency mapping for balanced display across the audible spectrum (20Hz-20kHz). The selector is disabled if the browser lacks AudioContext support.
- Supports volume control via on-screen slider and Up/Down arrow keys (5% increments). Volume preference is persisted between sessions.
- Integrates with OS media controls (Bluetooth headsets, keyboard media keys, system tray) via the Media Session API.
- **OBS Metadata Export:** Export "now playing" track metadata to a text file for use in OBS overlays and streaming software (Chromium browsers only).

## OBS Metadata Export

Export currently playing track metadata to a text file that updates automatically for use in OBS overlays, streaming software, or other applications.

### How to Use
1. Click the **⚙️ Settings** button in the top-right corner
2. In the settings modal, click **Configure** under "Text File Export"
3. Choose or create a text file (e.g., `now-playing.txt`)
4. The file will update automatically with `Title – Artist` whenever the track changes
5. **The file is cleared (emptied) when:**
   - Playback is paused
   - Playback stops at the end of the playlist (with loop off)
   - A new folder is being scanned

### In OBS Studio
1. Add a **Text (GDI+)** source (or **Text (FreeType 2)** on Linux/macOS)
2. Enable **"Read from file"**
3. Browse to the text file you configured in the player
4. Customize the text appearance (font, color, effects) as desired
5. The text will update automatically as tracks play

### Browser Requirements
- **Supported:** Chromium-based browsers (Chrome, Edge, Opera, Brave)
- **Not supported:** Firefox, Safari (they lack File System Access API for persistent file writes)
- The feature gracefully detects unsupported browsers and shows an appropriate message

### Disabling
Click **⚙️ Settings** → **Disable** to stop exporting. You can re-enable it anytime without reconfiguring the file.

### Troubleshooting
- If the file stops updating, browser permissions may have been revoked. Re-open Settings and click **Configure** again.
- Export failures appear as toast notifications (bottom-right) and are logged to the console without interrupting playback.

## Speech Announcements
- Toggle the `🗣 Announce` control (or press `A`) to enable spoken track transitions.
- The player prefers the `Daniel (English (United Kingdom))` voice and falls back to the first available English voice exposed by your browser.
- To prefer a different voice, tweak the `PREFERRED_VOICE_NAMES` list in `player.html`.
- Folder-specific naming quirks can be handled by adding cases to the `ANNOUNCE_RULES` array in `player.html`.
- Manual track skips (Next/Prev buttons, arrow keys, OS media controls) announce "Skipped track name. Now playing ...".
- Automatic transitions (track ending naturally) announce "That was track name. Now playing ...".
- When speech synthesis is unavailable the control is disabled; playback continues silently.

## Manual Testing
- Toggle Shuffle or Loop, reload `player.html`, and confirm the controls restore to their previous selections (initial defaults: Shuffle On, Loop All).
- Start a track, reload `player.html`, and verify the same track is selected; if you remove or rename it, the player should open with the first track (or a random one if Shuffle is enabled).
- Load an MP3 folder, start playback, and confirm the announcer introduces the first track.
- Press Next or Previous and listen for "Skipped track name ... Now playing ..." transition.
- Let a track complete naturally and listen for "That was track name ... Now playing ..." transition.
- Use arrow keys (←/→) to skip tracks and confirm "Skipped" messaging.
- Use OS media controls (Bluetooth headset, keyboard media keys) to skip tracks and confirm "Skipped" messaging.
- Turn `🗣 Announce` off, verify no further transitions are spoken, then turn it back on and change tracks to hear the announcer again.
- In the Utho Riley folder play “A Classical Approach…” and confirm the announcer says “Now playing, A Classical Approach, by Utho Riley.”
- In White Bat Audio play “Free Sci-Fi Music…” and confirm it says “Now playing, Phobos Monolith, by White Bat Audio.”
- Toggle speech off/on during playback to verify announcements resume without disturbing audio when disabled.
- Start playback and confirm the Now Playing header shows the expected track number, updating as you skip forward or back.
- Start playback, open the Spectrum Analyzer selector, and confirm Neon Bars, Glow Wave, and Pulse Halo update live without interrupting audio. Pause playback and ensure the visualization stops animating until playback resumes.
- Adjust volume with the slider and confirm audio volume changes accordingly.
- Press Up arrow key to increase volume by 5%; press Down arrow key to decrease volume by 5%.
- Reload the page and confirm the volume setting is restored.
- Test that Up/Down arrow keys work when the player has focus, but do not interfere with scrolling behavior in the track list or other elements.
- Start playback and press keyboard media keys (Play/Pause, Next, Previous) or use Bluetooth headset controls to verify they control playback.
- Check your OS media overlay (system tray, notification center, lock screen) and confirm it displays current track title and artist information.
- **OBS Export:** Click Settings, configure a text file, load a music folder, start playback, and verify the text file contains "Title – Artist". Skip tracks and confirm the file updates automatically.
- **OBS Export:** With export enabled, reload the page and verify export is still active (Settings should show "Active – filename.txt").
- **OBS Export:** Click Disable in Settings, skip tracks, and verify the file no longer updates. Re-enable and verify updates resume.
- **OBS Export (Firefox/Safari):** Open Settings and verify the Configure button shows an error toast about unsupported browser when clicked.

## OS Media Controls

The player integrates with your operating system's media controls using the Media Session API, allowing you to:

- **Control playback from anywhere**: Use Bluetooth headset buttons, keyboard media keys, or your OS media tray (Windows taskbar, macOS control center, mobile lock screen) to play, pause, skip tracks, or seek without switching to the browser tab.
- **View current track info**: The system media overlay displays the currently playing track's title, artist, and album (folder name).
- **Supported actions**: Play, Pause, Previous Track, Next Track, Seek Forward, Seek Backward, and Seek to Position.

### Browser Compatibility

The Media Session API is supported in modern Chromium-based browsers (Chrome, Edge, Opera) and Firefox. On unsupported browsers, the feature gracefully degrades—the player continues to work normally but without OS-level media control integration.

No special permissions or browser flags are required; the feature works automatically when supported.

## Spectrum Analyzer

The spectrum analyzer visualizations use logarithmic frequency mapping to provide a balanced view of the audio spectrum:

- **Frequency Range**: Displays 20 Hz to 20 kHz, the full range of human hearing.
- **Logarithmic Mapping**: Frequencies are mapped logarithmically rather than linearly, ensuring that bass, mids, and treble are all visible and proportional. This means that high-frequency content (like cymbals, hi-hats, and test tones at 16-20 kHz) will be clearly visible.
- **Dynamic Range**: Uses -100 to 0 dBFS for amplitude, providing good sensitivity to both quiet and loud sounds.
- **Visualization Modes**:
  - **Neon Bars**: Vertical bars showing frequency distribution
  - **Glow Wave**: Oscilloscope-style waveform display
  - **Pulse Halo**: Radial frequency visualization

### Testing the Analyzer

The `testmedia` folder contains test tones and noise files that can verify the analyzer's accuracy:

- **High-Frequency Test Tones**: Files like `16000 Hz Test Tone [K15bC8w5MrA].mp3`, `18000 Hz Test Tone [3tBI-T2SQgQ].mp3`, and `20000 Hz Test Tone [0DyVytR5aO4].mp3` should appear in the high-frequency region (right side) of the spectrum.
- **White Noise**: `White Noise [IMRj1ombxqY].mp3` should show activity across the entire frequency range when played at full volume, with relatively even distribution on Neon Bars and Pulse Halo modes.
- **Frequency Sweep**: `20 - 20,000 Hz Audio Sweep ｜ Range of Human Hearing [PAsMlDptjx8].mp3` should show activity moving progressively from left (low) to right (high) across the spectrum.

## Media
I use yt-dlp to download from YouTube playlists.

The general command is:
```
yt-dlp -x --audio-format mp3 {URL}
```

Examples:
* My `Utho Riley` playlist: yt-dlp -x --audio-format mp3 PLNtyAG9UO9oeMDT193y8Zno_E8U4MMtIU
* My `White Bat Audio` playlist: yt-dlp -x --audio-format mp3 PLNtyAG9UO9odGA1KzBuVsern15RexNfjQ
* `GMODISM` `Test Your Speakers⧸Headphone Sound Test`: yt-dlp -x --audio-format mp3 5Dc-5DD8P-0
* `Sonic Electronix` `Test Tones` playlist: yt-dlp -x --audio-format mp3 PLzFvCAfIq7a2SIBfDhpCytfJ4RHVb_KLY

### TODO

