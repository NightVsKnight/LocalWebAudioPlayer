# Local Web Audio Player

Single-page MP3 folder player focused on fast local playback, rich listening history, and streamer-friendly tooling, all bundled into one `player.html`.

## Why This Exists
- YouTube/YouTube Music insert too many ads.
- VLC never quite fit the workflow.
- Automatic “Now playing… That was…” voice callouts sounded fun.

## Requirements & Browser Support
- Chrome browser (not tested on any others). File System Access, Media Session, OBS export, and persistence rely on Chromium APIs.
- All data stays local: IndexedDB stores folder handles, history (latest 500 sessions), track ratings, and preferences. The optional text export writes only to the file you pick.
- Speech synthesis and AudioContext features gracefully degrade when unsupported; UI toggles reflect availability.

## Getting Started
1. Open `player.html` (`xdg-open player.html` on Linux or `open player.html` on macOS).
2. Click **Choose Folder**, grant read access, and the playlist populates instantly.
3. Use the footer **History** button to review sessions; open **⚙️ Settings** to configure the optional OBS text export.
4. If the browser blocks direct file access, run `python3 -m http.server` and visit `http://localhost:8000/player.html`.

## Core Features
- **Persistent playback state** – Shuffle (defaults on), loop mode, volume, last track, and announcement preference survive reloads.
- **Real-time history overlay:** Live row updates while a track plays, with per-entry delete, clear-all (with confirmation), and automatic pruning to the latest 500 sessions.
- **Percent-heard insights** – Timers exclude paused time; badges highlight skips (<50%), completions (~100%), and rewinds (>100%).
- **Track ratings** – Five-star ratings appear beside each track and within “Now Playing”, sync in both views, and persist locally.
- **Announcements & speech** – Optional synthesized callouts with preferred-voice selection and debounced messaging.
- **Media Session integration** – OS media keys, Bluetooth headsets, and system trays control playback and mirror metadata.
- **Spectrum analyzers** – Neon Bars, Glow Wave, and Pulse Halo visualize 20 Hz–20 kHz with logarithmic mapping.
- **Streamer tools:** Optional text export for OBS overlays plus Media Session integration and voice announcements.
- **YouTube-friendly metadata:** Filenames ending in `[videoId]` gain direct links back to the source.

## Playback History
- Each session records start/end timestamps, heard duration, percent played, skip detection, and rewind tagging.
- A live history row mirrors the current track; completed sessions roll into IndexedDB with automatic pruning to the newest 500 entries.
- Rows link to YouTube when filenames include `[videoId]`, offer per-entry deletion, and support bulk clear with confirmation.

## Track Ratings
- Click any of the five stars shown beside playlist rows or within the “Now Playing” panel to rate from one to five; clicking the active star clears the rating.
- Filled gold stars indicate the current rating; grey outlines mark unrated positions and highlight on hover.
- Ratings persist in IndexedDB, keyed by the track’s relative path, so they survive reloads and rescans of the same folder.
- Updates stay in sync between the playlist and “Now Playing”, and rating interactions never interrupt playback.

## OBS Metadata Export
- Configure once via **⚙️ Settings** → **Configure** to pick a text file (e.g., `now-playing.txt`). The player validates write access automatically.
- While playback is active the file contains `Title – Artist`; it clears on pause, at the end of queues (loop off), or during folder scans.
- Reloading retains export if permission persists; Settings shows “Active – filename.txt”. Unsupported browsers surface a toast explaining the limitation.
- To use in OBS Studio, add a Text source, enable “Read from file”, point at the export, and style as desired. Disable the feature from Settings to stop updates.

## Speech Announcements
- Toggle the `🗣 Announce` control (or press `A`) to enable spoken track transitions; the preferred voice is “Daniel”, with fallbacks to other English voices.
- Manual skips announce “Skipped …” while automatic transitions announce “That was …”. The feature disables itself when speech synthesis is unavailable.

## Spectrum Analyzer
- Modes: **Neon Bars** (frequency bars), **Glow Wave** (oscilloscope), **Pulse Halo** (radial visualization).
- Renders 20 Hz–20 kHz using logarithmic frequency spacing and −100 dBFS to 0 dBFS amplitude range. The selector hides when `AudioContext` is unavailable.
- Validation media in `testmedia/`: high-frequency tones (16–20 kHz), white noise, and a 20–20 000 Hz sweep exercise each mode.

## OS Media Controls
- Media Session handlers mirror play, pause, previous, next, seek forward/backward, and seek-to actions from hardware keys and system trays.
- Metadata (title, artist, album/folder) stays synchronized with lock screens and notification centers. Unsupported browsers simply ignore the hooks.

## Manual Smoke Checks
- **Playback basics:** Load a folder, start playback, toggle shuffle/loop, adjust volume via slider and arrow keys, seek, then reload to confirm preferences persist.
- **Short track names:** Load a folder with files that have YouTube IDs (e.g., `[videoId]`), track numbers (e.g., `01 -`), underscores, or special characters.
  - Verify playlist displays clean short titles.
  - Hover over playlist items to confirm tooltips show full path.
  - Check Now Playing header and History tab also show short titles.
  - Enable announcements and confirm spoken names match displayed names.
- **History & ratings:** Watch the live history row while playing, pausing, and seeking; Skip forward a few tracks, then step backward with **Prev** until history exhausts; rate several tracks (in playlist and “Now Playing”), reload, and verify ratings persist without triggering playback; Delete a single history row and use **Clear**—both should confirm before removing data.
- **Percent badges & links:** Finish a track, stop before halfway, and rewind past 100% to observe badge colors; open a history row that embeds a `[videoId]` and confirm the YouTube link resolves.
- **Streamer workflow:** Enable OBS export, verify the text file updates, pause/stop to ensure it clears, reload to confirm the export remains active, then disable and ensure updates cease.
- **Layout & accessibility:** Resize below 900 px to confirm the interface collapses cleanly; scroll large libraries while testing keyboard navigation; toggle announcements off/on to validate speech handling.
- **OS integration & analyzer:** Use Bluetooth or hardware media keys for transport control and check the system media overlay; exercise the spectrum modes with tones, noise, and sweeps from `testmedia/`.
- **Browser fallback:** Launch in a non-Chromium browser to confirm informative errors for folder picking or OBS export; revoke folder permission and ensure the app re-prompts gracefully.

## Media Downloads
`yt-dlp` command used to build local libraries:

```
yt-dlp -x --audio-format mp3 {URL}
```

- `Utho Riley` playlist: `yt-dlp -x --audio-format mp3 PLNtyAG9UO9oeMDT193y8Zno_E8U4MMtIU`
- `White Bat Audio` playlist: `yt-dlp -x --audio-format mp3 PLNtyAG9UO9odGA1KzBuVsern15RexNfjQ`
- `GMODISM – Test Your Speakers / Headphone Sound Test`: `yt-dlp -x --audio-format mp3 5Dc-5DD8P-0`
- `Sonic Electronix – Test Tones`: `yt-dlp -x --audio-format mp3 PLzFvCAfIq7a2SIBfDhpCytfJ4RHVb_KLY`

## TODO
