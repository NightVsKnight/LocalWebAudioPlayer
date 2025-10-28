
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
- Logs every listening session with timestamps, duration heard, and automatic skip detection (<50% heard) that you can review from the History overlay (open it with the footer History button).
- Tracks actual listening time (pauses excluded) so the history shows how much you truly heard; the % column turns yellow when you hear less than 100%, blue right at 100%, and green when rewinds push you beyond the original duration. When the filename includes a YouTube ID, the History overlay links straight back to the original video for quick reference.
- **Track Ratings:** Rate each track with a 5-star system. Ratings are stored in IndexedDB and persist across sessions. Click any star to set a rating (1-5 stars), or click the current rating again to clear it.
- **OBS Metadata Export:** Export "now playing" track metadata to a text file for use in OBS overlays and streaming software (Chromium browsers only).

## Playback History

The player now tracks each time you start or stop a song so you can understand how you actually listen:

- Every play session records the start timestamp, track metadata, how many seconds you listened, and the percent of the track you heard.
- Sessions that end before 50% completion are marked as **Skipped**, letting you instantly spot tracks you abandon.
- History is stored locally in IndexedDB and survives page reloads; the most recent 500 sessions are retained automatically.
- Open the **History** overlay (click the footer History button) to inspect your listening log. Each row shows when the track started, the path/artist, how long you listened, and whether it completed, was skipped, or manually stopped.

## Track Ratings

Rate your favorite tracks with a 5-star rating system to quickly identify music you love.

### How It Works
- Each track in the playlist shows 5 star icons (★) next to its duration
- **The currently playing track also displays stars in the "Now Playing" section** between the seek bar and time display
- Click any star to rate the track from 1 to 5 stars
- Click the same star again to clear the rating
- Filled gold stars (★) indicate the current rating
- Empty gray stars indicate unrated positions
- Ratings are stored locally in IndexedDB and persist across sessions
- Ratings are tied to the track's file path, so they remain even if you rescan the folder
- Rating the current track in "Now Playing" updates both displays simultaneously

### Use Cases
- Quickly spot your favorite tracks in large folders
- **Rate tracks on-the-fly while listening** without scrolling through the playlist
- Build a personal preference database for future features (sorting, filtering, playlists)
- Track which songs resonate with you over time

### Data Storage
- Ratings are stored in your browser's IndexedDB (not in MP3 ID3 tags)
- No external services or cloud storage involved
- Ratings remain private to your browser and device
- To export ratings to ID3 tags, a future offline script may be provided

## OBS Metadata Export

Export currently playing track metadata to a text file that updates automatically for use in OBS overlays, streaming software, or other applications.

### How to Use
1. Click the **⚙️ Settings** button in the top-right corner
2. In the settings modal, click **Configure** under "Text File Export"
3. Choose or create a text file (e.g., `now-playing.txt`)
4. The file updates automatically with `Title – Artist` while playback is active; it stays blank when tracks are paused or stopped
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
- **Track Ratings:** Load a music folder and verify each track displays 5 gray star icons (★) next to the duration.
- **Track Ratings:** Click the third star on a track and verify the first three stars become filled with gold color and glow effect.
- **Track Ratings:** Click the third star again (the current rating) and verify all stars become gray (rating cleared).
- **Track Ratings:** Rate several tracks with different star counts (1-5 stars), reload the page, rescan the same folder, and verify all ratings persist correctly.
- **Track Ratings:** Verify clicking a star does not trigger track playback (only plays when clicking the track name/number/duration).
- **Track Ratings:** Hover over stars and verify they highlight with gold color and scale up slightly.
- **Track Ratings (Now Playing):** Start playback and verify the "Now Playing" section shows 5 star icons between the seek bar and time display.
- **Track Ratings (Now Playing):** Click the fourth star in "Now Playing" and verify both the "Now Playing" stars and the playlist item stars update simultaneously.
- **Track Ratings (Now Playing):** Rate a track from "Now Playing", skip to a different track, then return to the first track and verify the rating persists.
- **Track Ratings (Now Playing):** Verify the "Now Playing" rating updates automatically when using Next/Previous buttons or clicking a different track.
- Start playback, open the **History** overlay, and confirm a new row appears with the correct start time, track info, and listened duration.
- Skip a track before it reaches the halfway point and verify the history entry is labeled **Skipped** with a percent heard below 50%.
- Play a track through without rewinding and confirm the % heard badge lands on a blue **100%** (±1%).
- Skip ahead during playback so you listen to less than the full duration and verify the % heard badge remains yellow (<100%).
- Rewind to rehear parts of the song and confirm the % heard badge turns green once you exceed 100% listened.
- In the History overlay, click the linked path for a track whose filename contains a YouTube ID (e.g., `[abc123]`) and verify it opens the corresponding video in a new tab.
- Delete a single history row via the **Delete** action and confirm it disappears after confirmation.
- Use the **Clear** button in the History overlay, confirm the prompt, and verify all stored entries are removed while the overlay remains open.
- Let a track play to completion, reload the page, and confirm the completed entry persists in the History overlay with the correct timestamp and duration data.
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
- Resize the window on desktop and confirm the playlist column widens to show longer filenames, then shrink below 900px and ensure the layout collapses into a single column without horizontal scrolling.
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
