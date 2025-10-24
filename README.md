
# Local Web Audio Player

Very boring name for now.

I created this because:
1. YouTube/YouTubeMusic plays way too many ads
2. I did not like VLC very much
3. I wanted to add a "Now playing ... That was ... " voice

## Features
- Remembers shuffle and loop preferences between sessions (defaults: Shuffle On, Loop All).
- Restores the last played track when available, otherwise falls back to the first track.

## Manual Testing
- Toggle Shuffle or Loop, reload `player.html`, and confirm the controls restore to their previous selections (initial defaults: Shuffle On, Loop All).
- Start a track, reload `player.html`, and verify the same track is selected; if you remove or rename it, the player should open with the first track (or a random one if Shuffle is enabled).

## Media
I use yt-dlp to download from YouTube playlists.

The general command is:
```
yt-dlp -x --audio-format mp3 {URL}
```

Examples:
* My `Utho Riley` playlist: yt-dlp -x --audio-format mp3 PLNtyAG9UO9oeMDT193y8Zno_E8U4MMtIU
* My `White Bat Audio` playlist: yt-dlp -x --audio-format mp3 PLNtyAG9UO9odGA1KzBuVsern15RexNfjQ
