
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

## Speech Announcements
- Toggle the `🗣 Announce` control (or press `A`) to enable spoken track transitions.
- The player prefers the `Daniel (English (United Kingdom))` voice and falls back to the first available English voice exposed by your browser.
- To prefer a different voice, tweak the `PREFERRED_VOICE_NAMES` list in `player.html`.
- Folder-specific naming quirks can be handled by adding cases to the `ANNOUNCE_RULES` array in `player.html`.
- When speech synthesis is unavailable the control is disabled; playback continues silently.

## Manual Testing
- Toggle Shuffle or Loop, reload `player.html`, and confirm the controls restore to their previous selections (initial defaults: Shuffle On, Loop All).
- Start a track, reload `player.html`, and verify the same track is selected; if you remove or rename it, the player should open with the first track (or a random one if Shuffle is enabled).
- Load an MP3 folder, start playback, and confirm the announcer introduces the first track.
- Skip to another track and listen for the "That was ... Now playing ..." transition.
- Turn `🗣 Announce` off, verify no further transitions are spoken, then turn it back on and change tracks to hear the announcer again.
- In the Utho Riley folder play “A Classical Approach…” and confirm the announcer says “Now playing, A Classical Approach, by Utho Riley.”
- In White Bat Audio play “Free Sci-Fi Music…” and confirm it says “Now playing, Phobos Monolith, by White Bat Audio.”
- Toggle speech off/on during playback to verify announcements resume without disturbing audio when disabled.

## Media
I use yt-dlp to download from YouTube playlists.

The general command is:
```
yt-dlp -x --audio-format mp3 {URL}
```

Examples:
* My `Utho Riley` playlist: yt-dlp -x --audio-format mp3 PLNtyAG9UO9oeMDT193y8Zno_E8U4MMtIU
* My `White Bat Audio` playlist: yt-dlp -x --audio-format mp3 PLNtyAG9UO9odGA1KzBuVsern15RexNfjQ
