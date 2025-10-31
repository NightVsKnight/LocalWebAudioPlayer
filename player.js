(() => {
  const chooseBtn   = document.getElementById('chooseBtn');
  const listEl      = document.getElementById('list');
  const historyOverlay = document.getElementById('historyOverlay');
  const historyToggleBtn = document.getElementById('historyToggleBtn');
  const historyCloseBtn = document.getElementById('historyCloseBtn');
  const historyTableBody = document.getElementById('historyTbody');
  const historyCountLabel = document.getElementById('historyCountLabel');
  const historyClearBtn = document.getElementById('historyClearBtn');
  const historyTableWrap = document.getElementById('historyTableWrap');
  const historyEmptyEl = document.getElementById('historyEmptyState');
  const audio       = document.getElementById('audio');
  const nowTitleEl  = document.getElementById('nowTitle');
  const nowArtistEl = document.getElementById('nowArtist');
  const nowTrackNumberEl = document.getElementById('nowTrackNumber');
  const nowPlayCountEl = document.getElementById('nowPlayCountValue');
  const countEl     = document.getElementById('count');

  const prevBtn     = document.getElementById('prevBtn');
  const playPauseBtn= document.getElementById('playPauseBtn');
  const nextBtn     = document.getElementById('nextBtn');
  const shuffleBtn  = document.getElementById('shuffleBtn');
  const loopBtn     = document.getElementById('loopBtn');
  const announceBtn = document.getElementById('announceBtn');

  const seek        = document.getElementById('seek');
  const tCur        = document.getElementById('tCur');
  const tTot        = document.getElementById('tTot');
  const volumeSlider= document.getElementById('volume');
  const volumeDisplay=document.getElementById('volumeDisplay');
  const folderPathEl= document.getElementById('folderPath');
  const vizModeSel  = document.getElementById('vizMode');
  const vizCanvas   = document.getElementById('vizCanvas');
  const vizStatusEl = document.getElementById('vizStatus');
  const nowRatingEl = document.getElementById('nowRating');
  
  // Settings modal elements
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const configureTextFileBtn = document.getElementById('configureTextFileBtn');
  const textFileStatus = document.getElementById('textFileStatus');
  const toastContainer = document.getElementById('toastContainer');

  /** Persistence */
  const DB_NAME = 'lwa-player';
  const STORE_NAME = 'handles';
  const HISTORY_STORE = 'play-history';
  const RATINGS_STORE = 'track-ratings';
  const PLAY_COUNTS_STORE = 'play-counts';
  const HISTORY_INDEX = 'by-started-at';
  const LAST_KEY = 'last-folder';
  const SHUFFLE_KEY = 'shuffle-enabled';
  const LOOP_KEY = 'loop-mode';
  const LAST_TRACK_KEY = 'last-track';
  const ANNOUNCE_KEY = 'lwa-announce-enabled';
  const VIZ_MODE_KEY = 'lwa-viz-mode';
  const VOLUME_KEY = 'lwa-volume';
  const TEXT_FILE_HANDLE_KEY = 'text-file-handle';
  const TEXT_FILE_ENABLED_KEY = 'text-file-enabled';
  const HISTORY_RENDER_LIMIT = 200;
  const HISTORY_MAX_ENTRIES = 500;
  // Play count threshold: A track is counted as "played" if at least 50% of its duration is heard.
  // This prevents accidental skips from inflating counts while still capturing genuine listens.
  const SKIP_THRESHOLD = 0.5;
  const REWIND_RATIO_THRESHOLD = 1.005;
  const HEARD_LOW_RATIO_THRESHOLD = 0.995;
  const REWIND_DISPLAY_PERCENT = REWIND_RATIO_THRESHOLD * 100;
  const HEARD_LOW_DISPLAY_PERCENT = HEARD_LOW_RATIO_THRESHOLD * 100;
  let handleDbPromise = null;
  const NAME_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const HISTORY_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' });
  const HISTORY_TIME_CACHE = new Map();
  let trackRatings = new Map();
  let trackPlayCounts = new Map();

  const getHandleDb = () => {
    if (!('indexedDB' in window)) return null;
    if (!handleDbPromise) {
      handleDbPromise = new Promise((resolve, reject) => {
        // Version 2: Added HISTORY_STORE for playback session tracking
        // Version 3: Added RATINGS_STORE for track ratings
        // Version 4: Added PLAY_COUNTS_STORE for tracking play counts
        const req = indexedDB.open(DB_NAME, 4);
        req.onerror = () => reject(req.error);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
          if (!db.objectStoreNames.contains(HISTORY_STORE)) {
            const historyStore = db.createObjectStore(HISTORY_STORE, { keyPath: 'id', autoIncrement: true });
            historyStore.createIndex(HISTORY_INDEX, 'startedAt');
          }
          if (!db.objectStoreNames.contains(RATINGS_STORE)) {
            db.createObjectStore(RATINGS_STORE);
          }
          if (!db.objectStoreNames.contains(PLAY_COUNTS_STORE)) {
            db.createObjectStore(PLAY_COUNTS_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
      }).catch(err => {
        console.error('Failed opening handle DB', err);
        handleDbPromise = null;
        return null;
      });
    }
    return handleDbPromise;
  };

  const putStoreValue = async (key, value) => {
    const db = await getHandleDb();
    if (!db) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  };

  const getStoreValue = async (key) => {
    const db = await getHandleDb();
    if (!db) return undefined;
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  };

  const setTrackRating = async (trackKey, rating) => {
    const db = await getHandleDb();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(RATINGS_STORE, 'readwrite');
      tx.objectStore(RATINGS_STORE).put(rating, trackKey);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    trackRatings.set(trackKey, rating);
  };

  const getTrackRating = async (trackKey) => {
    const db = await getHandleDb();
    if (!db) return 0;
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(RATINGS_STORE, 'readonly');
      const req = tx.objectStore(RATINGS_STORE).get(trackKey);
      req.onsuccess = () => resolve(req.result ?? 0);
      req.onerror = () => reject(req.error);
    });
  };

  const loadAllRatings = async () => {
    const db = await getHandleDb();
    if (!db) return;
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(RATINGS_STORE, 'readonly');
      const store = tx.objectStore(RATINGS_STORE);
      const req = store.openCursor();
      req.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          trackRatings.set(cursor.key, cursor.value);
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };

  const getPlayCount = async (trackKey) => {
    const db = await getHandleDb();
    if (!db) return 0;
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PLAY_COUNTS_STORE, 'readonly');
      const req = tx.objectStore(PLAY_COUNTS_STORE).get(trackKey);
      req.onsuccess = () => resolve(req.result ?? 0);
      req.onerror = () => reject(req.error);
    });
  };

  const incrementPlayCount = async (trackKey) => {
    const db = await getHandleDb();
    if (!db) return 0;
    const currentCount = await getPlayCount(trackKey);
    const newCount = currentCount + 1;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PLAY_COUNTS_STORE, 'readwrite');
      tx.objectStore(PLAY_COUNTS_STORE).put(newCount, trackKey);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    trackPlayCounts.set(trackKey, newCount);
    return newCount;
  };

  const loadAllPlayCounts = async () => {
    const db = await getHandleDb();
    if (!db) return;
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PLAY_COUNTS_STORE, 'readonly');
      const store = tx.objectStore(PLAY_COUNTS_STORE);
      const req = store.openCursor();
      req.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          trackPlayCounts.set(cursor.key, cursor.value);
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };


  const pruneHistoryEntries = async () => {
    const db = await getHandleDb();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const index = store.index(HISTORY_INDEX);
      let kept = 0;
      const cursorReq = index.openCursor(null, 'prev');
      cursorReq.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) return;
        if (kept >= HISTORY_MAX_ENTRIES) {
          cursor.delete();
        } else {
          kept += 1;
        }
        cursor.continue();
      };
      cursorReq.onerror = () => reject(cursorReq.error);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  };

  const fetchRecentHistory = async (limit = HISTORY_RENDER_LIMIT) => {
    const db = await getHandleDb();
    if (!db) return [];
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readonly');
      const store = tx.objectStore(HISTORY_STORE);
      const index = store.index(HISTORY_INDEX);
      const results = [];
      const cursorReq = index.openCursor(null, 'prev');
      cursorReq.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) return;
        if (results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
      tx.oncomplete = () => resolve(results);
      tx.onerror = () => reject(tx.error);
    });
  };

  const prependHistoryEntry = (entry) => {
    historyEntries = [entry, ...historyEntries].slice(0, HISTORY_RENDER_LIMIT);
    requestHistoryRender();
  };

  const deleteHistoryEntryById = async (id) => {
    const db = await getHandleDb();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      tx.objectStore(HISTORY_STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  };

  const clearHistoryStore = async () => {
    const db = await getHandleDb();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      tx.objectStore(HISTORY_STORE).clear();
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  };

  const addHistoryEntry = async (entry) => {
    const db = await getHandleDb();
    if (!db) return null;
    let storedEntry = null;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const req = store.add(entry);
      req.onsuccess = () => {
        storedEntry = { ...entry, id: req.result };
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    if (storedEntry) {
      prependHistoryEntry(storedEntry);
      try {
        await pruneHistoryEntries();
      } catch (err) {
        console.warn('Failed pruning play history', err);
      }
      if (liveHistoryEntry && typeof storedEntry.id === 'number') {
        if (liveHistoryEntry.id === storedEntry.id) {
          liveHistoryEntry = null;
          requestHistoryRender();
        } else if (liveHistoryEntry.trackKey === storedEntry.trackKey && liveHistoryEntry.startedAt === storedEntry.startedAt) {
          liveHistoryEntry.id = storedEntry.id;
          liveHistoryEntry = null;
          requestHistoryRender();
        }
      }
    }
    return storedEntry;
  };

  const loadHistoryEntries = async () => {
    try {
      historyEntries = await fetchRecentHistory(HISTORY_RENDER_LIMIT);
      rebuildBackStackFromHistory();
      requestHistoryRender();
    } catch (err) {
      console.error('Failed loading playback history', err);
    }
  };

  const saveLastHandle = async (handle) => {
    try {
      await putStoreValue(LAST_KEY, handle);
    } catch (err) {
      console.error('Failed storing folder handle', err);
    }
  };

  const loadLastHandle = async () => {
    try {
      const handle = await getStoreValue(LAST_KEY);
      return handle ?? null;
    } catch (err) {
      console.error('Failed loading folder handle', err);
      return null;
    }
  };

  const setFolderPath = (handle, { loading = false } = {}) => {
    if (!folderPathEl) return;
    if (!handle) {
      folderPathEl.textContent = 'No folder selected.';
      return;
    }
    const name = handle.name || 'Unknown folder';
    folderPathEl.textContent = loading ? `Folder: ${name} (loading...)` : `Folder: ${name}`;
  };

  /** Playlist state */
  let tracks = [];           // {name, displayName, handle, url, duration, path}
  let current = -1;
  let shuffle = true;        // toggle
  let loopMode = 'all';      // 'all' | 'one' | 'off'
  let trackRefs = new Map(); // index -> {row, durEl, ancestors}
  let rootDirName = '';
  const trackKey = (track) => [...track.path, track.name].join('/');
  const speech = createSpeechSynth();
  let announceEnabled = speech.supported;
  let pendingAnnouncement = null;
  let lastAnnouncedSummary = null;
  let lastAnnouncedTrackKey = null;
  let lastAnnouncedArtist = null;
  let lastAnnouncedTitle = null;
  let announceTimer = null;
  let historyEntries = [];
  let liveHistoryEntry = null;
  let historyRenderScheduled = false;
  let activeSession = null;
  const playbackBackStack = [];
  let suppressBackStackPush = false;
  // Back stack tracks prior playback history. Initial population is capped by the render set,
  // but the higher limit keeps room for additional runtime entries as the session continues.
  const BACK_STACK_LIMIT = HISTORY_MAX_ENTRIES;

  const trackIndexFromKey = (key) => {
    if (!key || !tracks.length) return -1;
    return tracks.findIndex(track => trackKey(track) === key);
  };

  const peekBackStackEntry = ({ allowUnresolved = false } = {}) => {
    const hasTracks = tracks.length > 0;
    for (let i = playbackBackStack.length - 1; i >= 0; i--) {
      const entry = playbackBackStack[i];
      if (!entry || !entry.trackKey) {
        playbackBackStack.splice(i, 1);
        continue;
      }
      if (!hasTracks) {
        if (allowUnresolved) {
          return { entry, index: -1, stackIndex: i };
        }
        return null;
      }
      const idx = trackIndexFromKey(entry.trackKey);
      if (idx >= 0) {
        return { entry, index: idx, stackIndex: i };
      }
      playbackBackStack.splice(i, 1);
    }
    return null;
  };

  const updatePrevButtonState = () => {
    if (!prevBtn) return;
    const candidate = peekBackStackEntry({ allowUnresolved: !tracks.length });
    const hasHistory = Boolean(candidate);
    prevBtn.disabled = !hasHistory;
  };

  const pushBackStackEntry = (entry) => {
    if (!entry || !entry.trackKey) return;
    playbackBackStack.push({
      trackKey: entry.trackKey,
      startedAt: entry.startedAt ?? Date.now(),
    });
    if (playbackBackStack.length > BACK_STACK_LIMIT) {
      playbackBackStack.shift();
    }
    updatePrevButtonState();
  };

  const consumeBackStackEntry = () => {
    const candidate = peekBackStackEntry();
    if (!candidate) return null;
    playbackBackStack.splice(candidate.stackIndex, 1);
    updatePrevButtonState();
    return candidate;
  };

  const clearPlaybackBackStack = () => {
    playbackBackStack.length = 0;
    updatePrevButtonState();
  };

  const removeBackStackEntry = (entry) => {
    if (!entry || !entry.trackKey) return;
    const { trackKey: key, startedAt } = entry;
    for (let i = playbackBackStack.length - 1; i >= 0; i--) {
      const candidate = playbackBackStack[i];
      if (!candidate) continue;
      if (candidate.trackKey !== key) continue;
      if (typeof startedAt === 'number' && candidate.startedAt !== startedAt) continue;
      playbackBackStack.splice(i, 1);
    }
    updatePrevButtonState();
  };

  const rebuildBackStackFromHistory = () => {
    playbackBackStack.length = 0;
    if (!Array.isArray(historyEntries) || !historyEntries.length) {
      updatePrevButtonState();
      return;
    }
    const maxBacklog = Math.min(historyEntries.length, BACK_STACK_LIMIT);
    for (let i = historyEntries.length - 1; playbackBackStack.length < maxBacklog && i >= 0; i--) {
      const entry = historyEntries[i];
      if (!entry || !entry.trackKey) continue;
      playbackBackStack.push({
        trackKey: entry.trackKey,
        startedAt: entry.startedAt ?? Date.now(),
      });
    }
    updatePrevButtonState();
  };
  updatePrevButtonState();

  /** Media Session API support */
  const mediaSessionSupported = 'mediaSession' in navigator;

  const applyNowTrackMetrics = () => {
    if (!nowTrackNumberEl) return;
    if (!tracks.length) {
      nowTrackNumberEl.style.removeProperty('--now-num-min');
      nowTrackNumberEl.style.removeProperty('--now-num-pad-x');
      return;
    }
    const digits = Math.max(1, String(tracks.length).length);
    const minCh = Math.max(4, digits + 1);
    nowTrackNumberEl.style.setProperty('--now-num-min', `${minCh}ch`);
    const padX = Math.min(26, 16 + Math.max(0, digits - 2) * 5);
    nowTrackNumberEl.style.setProperty('--now-num-pad-x', `${padX}px`);
  };

  applyNowTrackMetrics();

  /** Update Media Session metadata */
  const updateMediaSessionMetadata = (track) => {
    if (!mediaSessionSupported || !track) return;
    try {
      const details = buildAnnouncementDetails(track);
      const title = details.title || track.displayName || 'Unknown Track';
      const artist = details.artist || 'Unknown Artist';
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album: rootDirName || 'Local Collection',
      });
    } catch (err) {
      console.warn('Failed updating Media Session metadata', err);
    }
  };

  /** Set up Media Session action handlers */
  const setupMediaSessionHandlers = () => {
    if (!mediaSessionSupported) {
      console.info('Media Session API not supported in this browser');
      return;
    }
    try {
      navigator.mediaSession.setActionHandler('play', async () => {
        if (tracks.length && audio.paused) {
          try {
            await audio.play();
            playPauseBtn.textContent = '⏸ Pause';
          } catch (e) {
            console.error('Failed to play via Media Session', e);
          }
        }
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (!audio.paused) {
          audio.pause();
          playPauseBtn.textContent = '▶️ Play';
        }
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        Promise.resolve(
          playPreviousFromHistory({ autoplay: true })
        ).catch(err => {
          console.error('Failed handling previous track action', err);
        });
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (tracks.length) {
          Promise.resolve(
            playIndex(nextIndex(), { autoplay: true, skipReason: 'manual' })
          ).catch(err => {
            console.error('Failed handling next track action', err);
          });
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (!isFinite(audio.duration) || audio.duration <= 0) return;
        const skipTime = details.seekOffset || 10;
        const next = Math.max(audio.currentTime - skipTime, 0);
        audio.currentTime = next;
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (!isFinite(audio.duration) || audio.duration <= 0) return;
        const skipTime = details.seekOffset || 10;
        const next = Math.min(audio.currentTime + skipTime, audio.duration);
        audio.currentTime = next;
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (!isFinite(audio.duration) || audio.duration <= 0) return;
        if (typeof details.seekTime !== 'number' || details.seekTime < 0) return;
        const targetTime = Math.min(details.seekTime, audio.duration);
        if (details.fastSeek && 'fastSeek' in audio) {
          audio.fastSeek(targetTime);
        } else {
          audio.currentTime = targetTime;
        }
      });
    } catch (err) {
      console.warn('Failed setting up Media Session handlers', err);
    }
  };

  /** Update Media Session playback state */
  const updateMediaSessionPlaybackState = (state) => {
    if (!mediaSessionSupported) return;
    try {
      navigator.mediaSession.playbackState = state;
    } catch (err) {
      console.warn('Failed updating Media Session playback state', err);
    }
  };

  /** Update Media Session position state */
  const updateMediaSessionPositionState = () => {
    if (!mediaSessionSupported) return;
    if (!isFinite(audio.duration) || audio.duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: audio.currentTime,
      });
    } catch (err) {
      console.warn('Failed updating Media Session position state', err);
    }
  };

  // Initialize Media Session handlers
  setupMediaSessionHandlers();

  // Debounce delay for speech announcements.
  // 250ms prevents announcement spam during rapid track skipping,
  // and provides time for the audio to stabilize before speaking.
  const ANNOUNCE_DEBOUNCE_MS = 250;

  /** Visualizer */
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext || null;
  const VIZ_FFT_SIZE = 2048;
  const VIZ_BAR_COUNT = 64;
  const VIZ_LABELS = {
    bars: 'Neon Bars',
    wave: 'Glow Wave',
    radial: 'Pulse Halo',
  };
  const DEFAULT_VIZ_MODE = 'bars';
  let vizMode = DEFAULT_VIZ_MODE;
  let vizAudioCtx = null;
  let vizAnalyser = null;
  let vizSourceNode = null;
  let vizFreqData = null;
  let vizTimeData = null;
  let vizFrame = null;
  const vizCtx = vizCanvas ? vizCanvas.getContext('2d') : null;
  let vizFreqBinIndices = null; // Logarithmic frequency bin mapping

  const updateVizStatus = (state = 'idle') => {
    if (!vizStatusEl) return;
    if (!AudioContextCtor || !vizCanvas || !vizCtx) {
      vizStatusEl.textContent = 'Visualizer not supported in this browser.';
      return;
    }
    const label = VIZ_LABELS[vizMode] || VIZ_LABELS[DEFAULT_VIZ_MODE];
    if (state === 'playing') {
      vizStatusEl.textContent = `${label} visualization running.`;
    } else if (state === 'paused') {
      vizStatusEl.textContent = `${label} visualization paused.`;
    } else {
      vizStatusEl.textContent = `Style: ${label}. Start playback to visualize audio.`;
    }
  };

  const readVizModePreference = () => {
    try {
      const stored = localStorage.getItem(VIZ_MODE_KEY);
      if (stored && VIZ_LABELS[stored]) return stored;
    } catch (err) {
      console.warn('Unable to read visualizer preference', err);
    }
    return DEFAULT_VIZ_MODE;
  };

  const persistVizModePreference = (value) => {
    try {
      localStorage.setItem(VIZ_MODE_KEY, value);
    } catch (err) {
      console.warn('Unable to store visualizer preference', err);
    }
  };

  const setVizMode = (value, { persist = false } = {}) => {
    const next = VIZ_LABELS[value] ? value : DEFAULT_VIZ_MODE;
    vizMode = next;
    if (vizModeSel && vizModeSel.value !== next) {
      vizModeSel.value = next;
    }
    if (persist) persistVizModePreference(next);
    updateVizStatus(audio && !audio.paused && !audio.ended ? 'playing' : 'idle');
  };

  const syncCanvasDimensions = () => {
    if (!vizCanvas || !vizCtx) return { width: 0, height: 0 };
    const rect = vizCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));
    if (vizCanvas.width !== width || vizCanvas.height !== height) {
      vizCanvas.width = width;
      vizCanvas.height = height;
      vizCtx.setTransform(1, 0, 0, 1, 0, 0);
      vizCtx.scale(dpr, dpr);
    }
    return { width: rect.width, height: rect.height };
  };

  /**
   * Calculate logarithmic frequency bin indices for balanced spectrum display.
   * Maps barCount visual bars logarithmically from 20 Hz to Nyquist frequency.
   * Returns array of {startBin, endBin} for each bar to average multiple bins.
   * 
   * By extending to Nyquist (e.g., 22.05 kHz @ 44.1 kHz sample rate or 24 kHz
   * @ 48 kHz sample rate), we ensure frequencies at the upper audible limit
   * (18-20 kHz) have adequate FFT bins for accurate visualization.
   */
  const calculateLogFreqBins = (sampleRate, fftSize, barCount) => {
    const minFreq = 20;    // 20 Hz - lowest audible frequency
    const nyquist = sampleRate / 2;  // e.g., 22050 Hz @ 44.1kHz, 24000 Hz @ 48kHz
    const binCount = fftSize / 2;
    const freqPerBin = nyquist / binCount;

    // Calculate logarithmically spaced frequencies
    // Extend the range to Nyquist to ensure 20kHz content is fully captured
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(nyquist);
    const logStep = (logMax - logMin) / barCount;

    const bins = [];
    for (let i = 0; i < barCount; i++) {
      const freqStart = Math.pow(10, logMin + logStep * i);
      const freqEnd = Math.pow(10, logMin + logStep * (i + 1));
      
      // Convert frequencies to bin indices
      const startBin = Math.floor(freqStart / freqPerBin);
      const endBin = Math.ceil(freqEnd / freqPerBin);
      
      bins.push({
        startBin: Math.max(0, Math.min(startBin, binCount - 1)),
        endBin: Math.max(0, Math.min(endBin, binCount))
      });
    }
    return bins;
  };

  const ensureVisualizerNodes = () => {
    if (!AudioContextCtor || !vizCanvas || !vizCtx) return false;
    if (!vizAudioCtx) {
      try {
        vizAudioCtx = new AudioContextCtor();
      } catch (err) {
        console.error('Unable to create AudioContext', err);
        return false;
      }
    }
    if (!vizAnalyser) {
      vizAnalyser = vizAudioCtx.createAnalyser();
      vizAnalyser.fftSize = VIZ_FFT_SIZE;
      vizAnalyser.smoothingTimeConstant = 0.75;
      // Adjust dB range: -100 to 0 dBFS for better dynamic range
      // This allows visualization of both quiet and loud content
      vizAnalyser.minDecibels = -100;
      vizAnalyser.maxDecibels = 0;
    }
    if (!vizSourceNode) {
      vizSourceNode = vizAudioCtx.createMediaElementSource(audio);
      vizSourceNode.connect(vizAnalyser);
      vizAnalyser.connect(vizAudioCtx.destination);
    }
    if (vizAudioCtx.state === 'suspended') {
      vizAudioCtx.resume().catch(err => {
        console.warn('Unable to resume AudioContext', err);
      });
    }
    if (!vizFreqData || vizFreqData.length !== vizAnalyser.frequencyBinCount) {
      vizFreqData = new Uint8Array(vizAnalyser.frequencyBinCount);
    }
    if (!vizTimeData || vizTimeData.length !== vizAnalyser.fftSize) {
      vizTimeData = new Uint8Array(vizAnalyser.fftSize);
    }
    // Initialize logarithmic frequency bin mapping
    if (!vizFreqBinIndices) {
      vizFreqBinIndices = calculateLogFreqBins(vizAudioCtx.sampleRate, VIZ_FFT_SIZE, VIZ_BAR_COUNT);
    }
    return true;
  };

  const drawBars = (width, height) => {
    if (!vizAnalyser || !vizFreqBinIndices) return;
    vizAnalyser.getByteFrequencyData(vizFreqData);
    vizCtx.fillStyle = 'rgba(4, 7, 18, 0.78)';
    vizCtx.fillRect(0, 0, width, height);
    const barCount = VIZ_BAR_COUNT;
    const barWidth = width / barCount;
    
    for (let i = 0; i < barCount; i++) {
      const { startBin, endBin } = vizFreqBinIndices[i];
      
      // Average the frequency data across the bin range for this bar
      let sum = 0;
      let count = 0;
      for (let bin = startBin; bin < endBin; bin++) {
        sum += vizFreqData[bin];
        count++;
      }
      const avgMagnitude = count > 0 ? sum / count : 0;
      
      // Normalize to 0-1 range
      const normalized = avgMagnitude / 255;
      
      // Apply gentler power curve for more balanced display
      // Using power of 0.7 instead of 1.6 to boost mid/high frequencies
      const eased = Math.pow(normalized, 0.7);
      const barHeight = Math.max(4, eased * height);
      const x = i * barWidth;
      const gradient = vizCtx.createLinearGradient(x, height - barHeight, x, height);
      gradient.addColorStop(0, 'rgba(149, 132, 255, 0.92)');
      gradient.addColorStop(1, 'rgba(93, 251, 255, 0.92)');
      vizCtx.fillStyle = gradient;
      vizCtx.fillRect(x + 1, height - barHeight, Math.max(1.5, barWidth - 2), barHeight);
    }
  };

  const drawWave = (width, height) => {
    if (!vizAnalyser) return;
    vizAnalyser.getByteTimeDomainData(vizTimeData);
    vizCtx.fillStyle = 'rgba(4, 7, 18, 0.78)';
    vizCtx.fillRect(0, 0, width, height);
    const gradient = vizCtx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, 'rgba(93, 251, 255, 0.85)');
    gradient.addColorStop(1, 'rgba(155, 132, 255, 0.85)');
    vizCtx.lineWidth = 2;
    vizCtx.strokeStyle = gradient;
    vizCtx.shadowColor = 'rgba(93, 251, 255, 0.35)';
    vizCtx.shadowBlur = 12;
    vizCtx.beginPath();
    const slice = width / vizTimeData.length;
    for (let i = 0; i < vizTimeData.length; i++) {
      const value = (vizTimeData[i] - 128) / 128;
      const y = height / 2 + value * (height / 2 - 6);
      const x = i * slice;
      if (i === 0) vizCtx.moveTo(x, y);
      else vizCtx.lineTo(x, y);
    }
    vizCtx.stroke();
    vizCtx.shadowBlur = 0;
    vizCtx.beginPath();
    vizCtx.fillStyle = 'rgba(93, 251, 255, 0.08)';
    vizCtx.fillRect(0, height / 2, width, 1);
  };

  const drawRadial = (width, height) => {
    if (!vizAnalyser || !vizFreqBinIndices) return;
    const RADIAL_POINT_COUNT = 90;
    vizAnalyser.getByteFrequencyData(vizFreqData);
    vizCtx.fillStyle = 'rgba(4, 7, 18, 0.78)';
    vizCtx.fillRect(0, 0, width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = Math.min(width, height) * 0.22;
    const maxRadius = Math.min(width, height) * 0.48;
    const count = RADIAL_POINT_COUNT;
    
    // Create a mapping from RADIAL_POINT_COUNT to VIZ_BAR_COUNT
    vizCtx.save();
    vizCtx.translate(centerX, centerY);
    vizCtx.lineWidth = 2;
    for (let i = 0; i < count; i++) {
      // Map this radial point to a frequency bin index
      const barIndex = Math.floor((i / count) * VIZ_BAR_COUNT);
      const { startBin, endBin } = vizFreqBinIndices[Math.min(barIndex, VIZ_BAR_COUNT - 1)];
      
      // Average the frequency data across the bin range
      let sum = 0;
      let binCount = 0;
      for (let bin = startBin; bin < endBin; bin++) {
        sum += vizFreqData[bin];
        binCount++;
      }
      const avgValue = binCount > 0 ? sum / binCount : 0;
      const value = avgValue / 255;
      
      // Apply gentler power curve
      const magnitude = baseRadius + (maxRadius - baseRadius) * Math.pow(value, 0.7);
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * magnitude;
      const y = Math.sin(angle) * magnitude;
      vizCtx.beginPath();
      vizCtx.strokeStyle = `rgba(93, 251, 255, ${0.12 + value * 0.75})`;
      vizCtx.moveTo(Math.cos(angle) * baseRadius, Math.sin(angle) * baseRadius);
      vizCtx.lineTo(x, y);
      vizCtx.stroke();
    }
    const pulse = vizCtx.createRadialGradient(0, 0, baseRadius * 0.2, 0, 0, baseRadius);
    pulse.addColorStop(0, 'rgba(93, 251, 255, 0.28)');
    pulse.addColorStop(1, 'rgba(149, 132, 255, 0.05)');
    vizCtx.beginPath();
    vizCtx.fillStyle = pulse;
    vizCtx.arc(0, 0, baseRadius, 0, Math.PI * 2);
    vizCtx.fill();
    vizCtx.restore();
  };

  const VIZ_DRAWERS = {
    bars: drawBars,
    wave: drawWave,
    radial: drawRadial,
  };

  const renderVisualizer = () => {
    if (!vizCtx || !vizAnalyser) return;
    const { width, height } = syncCanvasDimensions();
    if (!width || !height) {
      vizFrame = requestAnimationFrame(renderVisualizer);
      return;
    }
    const draw = VIZ_DRAWERS[vizMode] || VIZ_DRAWERS[DEFAULT_VIZ_MODE];
    draw(width, height);
    vizFrame = requestAnimationFrame(renderVisualizer);
  };

  const startVisualizer = () => {
    if (!ensureVisualizerNodes()) return;
    if (!vizFrame) {
      vizFrame = requestAnimationFrame(renderVisualizer);
    }
    updateVizStatus('playing');
  };

  const stopVisualizer = ({ clear = false, state = 'paused' } = {}) => {
    if (vizFrame) {
      cancelAnimationFrame(vizFrame);
      vizFrame = null;
    }
    if (clear && vizCtx) {
      const { width, height } = syncCanvasDimensions();
      if (width && height) {
        vizCtx.clearRect(0, 0, width, height);
      }
    }
    updateVizStatus(state);
  };

  if (vizModeSel) {
    setVizMode(readVizModePreference());
    vizModeSel.addEventListener('change', () => setVizMode(vizModeSel.value, { persist: true }));
    if (!AudioContextCtor || !vizCanvas || !vizCtx) {
      vizModeSel.disabled = true;
      vizModeSel.title = 'Audio visualizer is not available in this browser.';
    }
  } else {
    setVizMode(readVizModePreference());
  }

  updateVizStatus();

  /** Utilities */
  const fmtTime = s => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return `${m}:${ss.toString().padStart(2,'0')}`;
  };
  const fmtTrackNumber = (idx) => {
    if (!tracks.length || idx < 0 || idx >= tracks.length) return '—';
    const digits = Math.max(1, String(tracks.length).length);
    return `#${String(idx + 1).padStart(digits, '0')}`;
  };
  const normalizeSpaces = (value) => {
    if (!value) return '';
    return value.replace(/\s+/g, ' ').trim();
  };
  const stripTrailingTags = (value) => value.replace(/\s*[\[\(][^)\]]*[\)\]]\s*$/g, '').trim();
  const resolveFolderKey = (track) => normalizeSpaces(track.path[0] || rootDirName || '').toLowerCase();
  const extractYouTubeIdFrom = (...values) => {
    for (const value of values) {
      if (typeof value !== 'string') continue;
      const withoutExt = value.replace(/\.[^./]*$/, '');
      const match = withoutExt.match(/\[([a-zA-Z0-9_-]{6,})\]$/);
      if (match) return match[1];
    }
    return null;
  };
  const resolveYouTubeUrl = (entry) => {
    if (!entry) return null;
    const id = extractYouTubeIdFrom(entry.trackName, entry.relativePath);
    return id ? `https://youtu.be/${id}` : null;
  };
  const resolveYouTubeUrlFromTrack = (track) => {
    if (!track) return null;
    const relativePath = track.path && track.path.length > 0 ? track.path.join('/') : '';
    return resolveYouTubeUrl({
      trackName: track.displayName || track.name,
      relativePath: relativePath
    });
  };

  const isRewoundPercent = (percent) => typeof percent === 'number' && percent > REWIND_RATIO_THRESHOLD;
  const describeHistoryStatus = (entry) => {
    if (!entry) return { label: 'Stopped', className: 'stopped' };
    if (entry.reason === 'scrubbed') return { label: 'Scrubbed', className: 'scrubbed' };
    if (entry.reason === 'fast-forwarded') return { label: 'Skipped', className: 'skipped' };
    if (entry.reason === 'rewound' || isRewoundPercent(entry.percentPlayed)) {
      return { label: 'Rewound', className: 'rewound' };
    }
    if (entry.reason === 'completed') return { label: 'Completed', className: 'completed' };
    if (entry.reason === 'folder-change') return { label: 'Folder Change', className: 'stopped' };
    if (entry.skipped || entry.reason === 'skipped') return { label: 'Skipped', className: 'skipped' };
    if (entry.reason === 'paused') return { label: 'Paused', className: 'stopped' };
    if (entry.reason === 'auto-advance') return { label: 'Auto Next', className: 'stopped' };
    return { label: 'Stopped', className: 'stopped' };
  };

  const formatHistoryTimestamp = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '—';
    let cached = HISTORY_TIME_CACHE.get(numeric);
    if (cached) {
      HISTORY_TIME_CACHE.delete(numeric);
      HISTORY_TIME_CACHE.set(numeric, cached);
    } else {
      cached = HISTORY_TIME_FORMATTER.format(new Date(numeric));
      HISTORY_TIME_CACHE.set(numeric, cached);
    }
    // Keep 2× render limit to handle both visible entries and recently removed items
    const maxCacheSize = HISTORY_RENDER_LIMIT * 2;
    if (HISTORY_TIME_CACHE.size > maxCacheSize) {
      const excess = HISTORY_TIME_CACHE.size - maxCacheSize;
      const keysToDelete = [];
      const iter = HISTORY_TIME_CACHE.keys();
      for (let i = 0; i < excess; i += 1) {
        const next = iter.next();
        if (next.done) break;
        keysToDelete.push(next.value);
      }
      keysToDelete.forEach(key => HISTORY_TIME_CACHE.delete(key));
    }
    return cached;
  };

  const getActiveSessionListenedSeconds = () => {
    if (!activeSession) return 0;
    let total = activeSession.listenedMs || 0;
    if (typeof activeSession.timerStart === 'number') {
      total += performance.now() - activeSession.timerStart;
    }
    return total / 1000;
  };

  const startListeningClock = () => {
    if (!activeSession) return;
    if (typeof activeSession.timerStart === 'number') return;
    activeSession.timerStart = performance.now();
  };

  const stopListeningClock = () => {
    if (!activeSession) return;
    if (typeof activeSession.timerStart !== 'number') return;
    activeSession.listenedMs = (activeSession.listenedMs || 0) + (performance.now() - activeSession.timerStart);
    activeSession.timerStart = null;
    requestHistoryRender();
  };

  const syncLiveHistoryMetrics = () => {
    if (!activeSession || !liveHistoryEntry) return;
    const listenedSeconds = getActiveSessionListenedSeconds();
    liveHistoryEntry.playedSeconds = listenedSeconds;
    liveHistoryEntry.percentPlayed = activeSession.duration && activeSession.duration > 0
      ? listenedSeconds / activeSession.duration
      : null;
  };

  const resolvePlayedSeconds = (entry, duration) => {
    if (!entry) return 0;
    if (typeof entry.playedSeconds === 'number' && isFinite(entry.playedSeconds)) {
      return Math.max(0, entry.playedSeconds);
    }
    if (typeof entry.percentPlayed === 'number' && isFinite(entry.percentPlayed) && isFinite(duration) && duration > 0) {
      return Math.max(0, entry.percentPlayed * duration);
    }
    return 0;
  };

  const renderHistory = () => {
    if (!historyTableBody) return;
    syncLiveHistoryMetrics();
    const entries = [];
    if (liveHistoryEntry) entries.push(liveHistoryEntry);
    if (historyEntries?.length) entries.push(...historyEntries);
    const hasEntries = entries.length > 0;
    if (historyEmptyEl) historyEmptyEl.classList.toggle('hide', hasEntries);
    if (historyTableWrap) historyTableWrap.classList.toggle('hide', !hasEntries);
    if (historyCountLabel) historyCountLabel.textContent = hasEntries ? `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}` : '0 entries';
    historyTableBody.innerHTML = '';
    if (!hasEntries) return;

    entries.forEach(entry => {
      if (!entry) return;
      const isLive = Boolean(entry.live);
      const duration = (typeof entry.duration === 'number' && isFinite(entry.duration)) ? entry.duration : NaN;
      const playedSeconds = resolvePlayedSeconds(entry, duration);
      const percentPlayed = (typeof entry.percentPlayed === 'number' && isFinite(entry.percentPlayed))
        ? entry.percentPlayed
        : (isFinite(duration) && duration > 0 ? playedSeconds / duration : null);

      const row = document.createElement('tr');
      if (isLive) row.classList.add('live');

      const startedCell = document.createElement('td');
      startedCell.className = 'time-cell';
      startedCell.textContent = formatHistoryTimestamp(entry.startedAt);
      row.appendChild(startedCell);

      const trackCell = document.createElement('td');
      trackCell.className = 'history-track-cell';
      trackCell.textContent = entry.trackName || 'Unknown Track';
      row.appendChild(trackCell);

      const metaCell = document.createElement('td');
      metaCell.className = 'meta-cell';
      const pathText = entry.relativePath && entry.relativePath !== entry.trackName ? entry.relativePath : '';
      const youtubeUrl = resolveYouTubeUrl(entry);
      let hasMeta = false;
      if (entry.artist) {
        metaCell.append(entry.artist);
        hasMeta = true;
      }
      if (pathText) {
        if (hasMeta) metaCell.append(document.createTextNode(' • '));
        if (youtubeUrl) {
          const link = document.createElement('a');
          link.className = 'history-path-link';
          link.href = youtubeUrl;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = pathText;
          metaCell.appendChild(link);
        } else {
          metaCell.append(pathText);
        }
        hasMeta = true;
      }
      if (!hasMeta) {
        metaCell.textContent = '—';
      }
      row.appendChild(metaCell);

      const listenedCell = document.createElement('td');
      listenedCell.className = 'time-cell';
      const playedText = fmtTime(playedSeconds);
      const totalText = isFinite(duration) ? fmtTime(duration) : '—';
      listenedCell.textContent = `${playedText} / ${totalText}`;
      row.appendChild(listenedCell);

      const percentCell = document.createElement('td');
      percentCell.className = 'time-cell';
      const percentSpan = document.createElement('span');
      percentSpan.className = 'heard-indicator';
      if (typeof percentPlayed === 'number' && isFinite(percentPlayed)) {
        const percentValue = percentPlayed * 100;
        percentSpan.textContent = `${Math.round(percentValue)}%`;
        if (percentValue > REWIND_DISPLAY_PERCENT) percentSpan.classList.add('heard-high');
        else if (percentValue < HEARD_LOW_DISPLAY_PERCENT) percentSpan.classList.add('heard-low');
        else percentSpan.classList.add('heard-exact');
      } else {
        percentSpan.textContent = '—';
        percentSpan.classList.add('heard-low');
      }
      percentCell.appendChild(percentSpan);
      row.appendChild(percentCell);

      const playCountCell = document.createElement('td');
      playCountCell.className = 'time-cell';
      const currentPlayCount = trackPlayCounts.get(entry.trackKey) || 0;
      playCountCell.textContent = currentPlayCount > 0 ? String(currentPlayCount) : '—';
      playCountCell.title = currentPlayCount > 0 ? `Played ${currentPlayCount} time${currentPlayCount === 1 ? '' : 's'}` : 'Not counted as played yet';
      row.appendChild(playCountCell);

      const statusCell = document.createElement('td');
      statusCell.className = 'status-cell';
      let statusInfo;
      if (isLive) {
        if (isRewoundPercent(percentPlayed)) {
          statusInfo = { label: 'Rewinding', className: 'rewound' };
        } else if (entry.state === 'paused') {
          statusInfo = { label: 'Paused', className: 'stopped' };
        } else {
          statusInfo = { label: 'Listening', className: 'live' };
        }
      } else {
        statusInfo = describeHistoryStatus({ ...entry, percentPlayed });
      }
      const badge = document.createElement('span');
      badge.className = `history-status ${statusInfo.className || ''}`.trim();
      badge.textContent = statusInfo.label;
      statusCell.appendChild(badge);
      row.appendChild(statusCell);

      const actionCell = document.createElement('td');
      actionCell.className = 'action-cell';
      if (!isLive && typeof entry.id === 'number') {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'history-delete-btn';
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', async () => {
          const confirmed = window.confirm('Delete this history entry? This action cannot be undone.');
          if (!confirmed) return;
          try {
            await deleteHistoryEntryById(entry.id);
            historyEntries = historyEntries.filter(item => item.id !== entry.id);
            removeBackStackEntry(entry);
            requestHistoryRender();
          } catch (err) {
            console.error('Failed deleting history entry', err);
          }
        });
        actionCell.appendChild(deleteBtn);
      }
      row.appendChild(actionCell);

      historyTableBody.appendChild(row);
    });
  };

  const requestHistoryRender = () => {
    if (historyRenderScheduled) return;
    historyRenderScheduled = true;
    const schedule = window.requestAnimationFrame || (cb => setTimeout(cb, 16));
    schedule(() => {
      historyRenderScheduled = false;
      renderHistory();
    });
  };

  const setLiveEntryState = (state) => {
    if (!liveHistoryEntry) return;
    if (liveHistoryEntry.state === state) return;
    liveHistoryEntry.state = state;
    requestHistoryRender();
  };

  const isHistoryVisible = () => Boolean(historyOverlay && !historyOverlay.hidden);

  const openHistoryOverlay = () => {
    if (isHistoryVisible()) {
      if (historyCloseBtn) historyCloseBtn.focus();
      return;
    }
    if (!historyOverlay) return;
    historyOverlay.hidden = false;
    historyOverlay.setAttribute('aria-hidden', 'false');
    requestHistoryRender();
    if (historyCloseBtn) {
      historyCloseBtn.focus();
    }
  };

  const closeHistoryOverlay = () => {
    if (!historyOverlay || historyOverlay.hidden) return;
    historyOverlay.hidden = true;
    historyOverlay.setAttribute('aria-hidden', 'true');
    if (historyToggleBtn) {
      historyToggleBtn.focus({ preventScroll: true });
    }
  };


  const ANNOUNCE_RULES = [
    {
      matches: (track) => resolveFolderKey(track) === 'utho riley',
      format: (name) => {
        const base = stripTrailingTags(name).split(' - ')[0] || name;
        const title = normalizeSpaces(base.replace(/｜.*$/u, ''));
        return { title, artist: 'Utho Riley' };
      },
    },
    {
      matches: (track) => resolveFolderKey(track) === 'white bat audio',
      format: (name) => {
        let working = stripTrailingTags(name);
        const parts = working.split(' - ');
        let title = parts[1] ? parts[1] : working;
        title = title.replace(/\s*(⧸⧸|\/\/).*$/u, '');
        return { title: normalizeSpaces(title), artist: 'White Bat Audio' };
      },
    },
  ];

  const buildAnnouncementDetails = (track) => {
    const fallbackArtistRaw = (track.path[0] || rootDirName || '').replace(/[_]+/g, ' ');
    const fallbackArtist = normalizeSpaces(fallbackArtistRaw) || 'Unknown artist';
    const baseName = normalizeSpaces(track.displayName.replace(/[_]+/g, ' '));
    const sanitized = stripTrailingTags(baseName);

    const rule = ANNOUNCE_RULES.find(rule => rule.matches(track));
    if (rule) {
      const result = rule.format(sanitized) || {};
      const titleRaw = result.title || sanitized;
      const artistRaw = result.artist || fallbackArtist;
      const title = normalizeSpaces(titleRaw) || 'Unknown track';
      const artist = normalizeSpaces(artistRaw);
      const summary = artist ? `${title}, by ${artist}` : title;
      return { title, artist, summary };
    }

    const fallbackName = sanitized.replace(/\s*(⧸⧸|\/\/|｜).*$/u, '').trim() || sanitized;
    const normalized = fallbackName.replace(/[–—]/g, '-');
    const parts = normalized.split(' - ');
    let title = parts.length >= 2 ? normalizeSpaces(parts.slice(1).join(' - ')) : fallbackName;
    if (!title) title = fallbackName;
    let artist = parts.length >= 2 ? normalizeSpaces(parts[0].replace(/^\d+[\s.\-]*/, '')) : fallbackArtist;
    if (!artist) artist = fallbackArtist;
    title = normalizeSpaces(title) || 'Unknown track';
    artist = normalizeSpaces(artist);
    const summary = artist ? `${title}, by ${artist}` : title;
    return { title, artist, summary };
  };

  const recordPendingAnnouncement = (track, { skipReason = 'auto' } = {}) => {
    if (!track) {
      pendingAnnouncement = null;
      return null;
    }
    const details = buildAnnouncementDetails(track);
    const { title = '', artist = '', summary = '' } = details || {};
    pendingAnnouncement = {
      key: trackKey(track),
      title,
      artist,
      summary,
      skipReason,
    };
    return details;
  };

  const maybeAnnounceCurrentTrack = () => {
    if (!pendingAnnouncement) return;
    const { key, summary, artist, title, skipReason } = pendingAnnouncement;
    pendingAnnouncement = null;
    if (!summary) return;

    // Announcements are disabled by the user.
    if (!announceEnabled) return;
    // Speech synthesis is not available in this browser.
    if (!speech.supported) return;
    // Avoid repeating the same announcement if the track restarts.
    if (key === lastAnnouncedTrackKey) return;

    let message = '';
    if (lastAnnouncedSummary && lastAnnouncedSummary !== summary) {
      let previousDescription = lastAnnouncedSummary;
      if (lastAnnouncedTitle) {
        const includePrevArtist = Boolean(lastAnnouncedArtist) &&
          (!artist || NAME_COLLATOR.compare(lastAnnouncedArtist, artist) !== 0);
        previousDescription = includePrevArtist
          ? `${lastAnnouncedTitle}, by ${lastAnnouncedArtist}`
          : lastAnnouncedTitle;
      }
      if (previousDescription) {
        // Use "Skipped" for manual transitions, "That was" for automatic
        const transitionVerb = skipReason === 'manual' ? 'Skipped' : 'That was';
        message = `${transitionVerb} ${previousDescription}. `;
      }
    }
    let sameArtist = false;
    if (artist && lastAnnouncedArtist) {
      sameArtist = (NAME_COLLATOR.compare(artist, lastAnnouncedArtist) === 0);
    }
    const shouldIncludeArtist = Boolean(artist) && !sameArtist;
    const nowDescription = shouldIncludeArtist ? summary : (title || summary);
    message += `Now playing, ${nowDescription}`;
    if (announceTimer) {
      clearTimeout(announceTimer);
      announceTimer = null;
    }
    const dispatchAnnouncement = () => {
      speech.speak(message, { interrupt: true });
      lastAnnouncedSummary = summary;
      lastAnnouncedTrackKey = key;
      lastAnnouncedArtist = artist ?? null;
      lastAnnouncedTitle = title ?? null;
      announceTimer = null;
    };
    if (ANNOUNCE_DEBOUNCE_MS > 0) {
      announceTimer = setTimeout(dispatchAnnouncement, ANNOUNCE_DEBOUNCE_MS);
    } else {
      dispatchAnnouncement();
    }
  };

  const beginPlaySession = () => {
    if (current < 0 || !tracks[current]) {
      activeSession = null;
      return;
    }
    const track = tracks[current];
    const key = trackKey(track);
    if (activeSession && activeSession.trackKey === key) {
      setLiveEntryState(audio.paused ? 'paused' : 'playing');
      requestHistoryRender();
      return;
    }
    const details = buildAnnouncementDetails(track) || {};
    const relativePath = track.path.length ? `${track.path.join('/')}/${track.name}` : track.name;
    const startPosition = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const durationGuess = Number.isFinite(audio.duration)
      ? audio.duration
      : (Number.isFinite(track.duration) ? track.duration : null);
    activeSession = {
      trackKey: key,
      trackName: details.title || track.displayName || track.name,
      artist: details.artist || '',
      relativePath,
      duration: durationGuess,
      startPosition,
      lastPosition: startPosition,
      startedAt: Date.now(),
      listenedMs: 0,
      timerStart: audio.paused ? null : performance.now(),
    };
    liveHistoryEntry = {
      ...activeSession,
      playedSeconds: 0,
      percentPlayed: durationGuess && durationGuess > 0 ? 0 : null,
      live: true,
      state: audio.paused ? 'paused' : 'playing',
      id: null,
    };
    requestHistoryRender();
  };

  const updateSessionDuration = (value) => {
    if (!activeSession) return;
    if (typeof value === 'number' && isFinite(value) && value > 0) {
      activeSession.duration = value;
      if (liveHistoryEntry) {
        liveHistoryEntry.duration = value;
        if (liveHistoryEntry.playedSeconds !== undefined) {
          liveHistoryEntry.percentPlayed = liveHistoryEntry.playedSeconds / value;
        }
        requestHistoryRender();
      }
    }
  };

  const updateSessionPosition = (value) => {
    if (!activeSession) return;
    if (typeof value === 'number' && value >= 0 && isFinite(value)) {
      activeSession.lastPosition = value;
    }
  };
  let pendingSeekPosition = null;
  let seekPositionScheduled = false;
  const scheduleSeekPositionUpdate = (value) => {
    pendingSeekPosition = value;
    if (seekPositionScheduled) return;
    seekPositionScheduled = true;
    const schedule = window.requestAnimationFrame || (cb => setTimeout(cb, 16));
    schedule(() => {
      seekPositionScheduled = false;
      if (pendingSeekPosition !== null) {
        updateSessionPosition(pendingSeekPosition);
        pendingSeekPosition = null;
      }
    });
  };

  const finalizePlaySession = (reason = 'stopped', { position } = {}) => {
    if (!activeSession) {
      return;
    }
    stopListeningClock();
    const listenedSeconds = getActiveSessionListenedSeconds();
    const duration = (typeof activeSession.duration === 'number' && isFinite(activeSession.duration) && activeSession.duration > 0)
      ? activeSession.duration
      : null;
    if (typeof position === 'number' && position >= 0 && isFinite(position)) {
      activeSession.lastPosition = position;
    }
    const playedSeconds = Math.max(0, listenedSeconds);
    const percentPlayed = (duration && duration > 0)
      ? (playedSeconds / duration)
      : null;
    // Percent-based tagging:
    // - Above REWIND_RATIO_THRESHOLD (100.5%) counts as a rewind because listeners replayed a portion.
    // - Between SKIP_THRESHOLD and ~100% is treated as a normal completion.
    // - Below SKIP_THRESHOLD is classified as a fast-forward/skip.
    const isHistoryBack = reason === 'history-back';
    let finalReason = reason;
    if (isHistoryBack) {
      finalReason = 'rewound';
    } else if (percentPlayed !== null) {
      if (isRewoundPercent(percentPlayed)) {
        finalReason = 'rewound';
      } else if (percentPlayed >= SKIP_THRESHOLD) {
        finalReason = 'completed';
      } else {
        finalReason = 'fast-forwarded';
      }
    } else if (reason === 'manual') {
      finalReason = 'fast-forwarded';
    }
    if (finalReason === 'auto') {
      finalReason = 'auto-advance';
    }
    const skipped = finalReason === 'fast-forwarded';
    const entry = {
      trackKey: activeSession.trackKey,
      trackName: activeSession.trackName,
      artist: activeSession.artist,
      relativePath: activeSession.relativePath,
      startedAt: activeSession.startedAt,
      endedAt: Date.now(),
      playedSeconds,
      duration,
      percentPlayed,
      skipped,
      reason: finalReason,
    };
    if (!suppressBackStackPush && !isHistoryBack) {
      pushBackStackEntry(entry);
    }
    liveHistoryEntry = null;
    requestHistoryRender();
    activeSession = null;
    addHistoryEntry(entry).catch(err => {
      console.error('Failed recording play history', err);
    });
    // Increment play count if track was played to completion (≥50% heard)
    // This definition balances genuine listens vs. accidental skips.
    if (percentPlayed !== null && percentPlayed >= SKIP_THRESHOLD) {
      incrementPlayCount(entry.trackKey).then(newCount => {
        // Update the UI for the current track if it's still in the list
        const trackIndex = tracks.findIndex(t => trackKey(t) === entry.trackKey);
        if (trackIndex >= 0) {
          updateTrackPlayCountDisplay(trackIndex, newCount);
          // Also update Now Playing if this track is currently loaded (even if paused)
          if (trackIndex === current) {
            updateNowPlayingPlayCount(newCount);
          }
        }
      }).catch(err => {
        console.error('Failed incrementing play count', err);
      });
    }
  };

  const readAnnouncePreference = () => {
    try {
      const stored = localStorage.getItem(ANNOUNCE_KEY);
      if (stored === null) return true;
      return stored === '1';
    } catch (err) {
      console.warn('Unable to read announce preference', err);
      return true;
    }
  };

  const setAnnounceEnabled = (value, { persist = true } = {}) => {
    const effective = Boolean(value && speech.supported);
    announceEnabled = effective;
    if (announceBtn) {
      announceBtn.setAttribute('aria-pressed', String(effective));
      announceBtn.classList.toggle('active', effective);
      announceBtn.textContent = effective ? '🗣 Announce On' : '🤫 Announce Off';
    }
    if (persist && speech.supported) {
      try { localStorage.setItem(ANNOUNCE_KEY, effective ? '1' : '0'); }
      catch (err) { console.warn('Unable to store announce preference', err); }
    }
    if (!effective) {
      speech.cancel();
      if (announceTimer) {
        clearTimeout(announceTimer);
        announceTimer = null;
      }
    } else if (audio && !audio.paused && current >= 0 && tracks[current]) {
      // Allow a fresh announcement when the toggle is re-enabled mid-track.
      lastAnnouncedTrackKey = null;
      lastAnnouncedArtist = null;
      lastAnnouncedTitle = null;
      recordPendingAnnouncement(tracks[current]);
      maybeAnnounceCurrentTrack();
    }
  };

  function createSpeechSynth() {
    const synth = window.speechSynthesis;
    if (!(synth && 'SpeechSynthesisUtterance' in window)) {
      console.warn('Speech synthesis not supported in this browser');
      return {
        supported: false,
        speak: () => {},
        cancel: () => {},
      };
    }

    // Prefer Daniel for consistent pacing; fall back to any English voice, then any remaining option.
    // Daniel is preferred because it offers clear articulation, a neutral British accent, and steady pacing, making it highly intelligible and suitable for track announcements.
    const PREFERRED_VOICE_NAMES = [
      'Daniel (English (United Kingdom))',
      'Daniel (English (United States))',
      'Daniel',
    ];
    let voice = null;
    let queued = null;
    let awaitingVoices = false;

    function pickVoice() {
      const voices = synth.getVoices();
      if (!voices.length) return null;
      let best = null;
      let bestScore = -1;
      for (const v of voices) {
        let score = 0;
        if (PREFERRED_VOICE_NAMES.includes(v.name)) score = 3;
        else if (v.lang && v.lang.toLowerCase().startsWith('en') && v.localService) score = 2;
        else if (v.lang && v.lang.toLowerCase().startsWith('en')) score = 1;
        if (score > bestScore) {
          best = v;
          bestScore = score;
          if (score === 3) break;
        }
      }
      voice = best || voices[0];
      return voice;
    }

    function handleVoicesChanged() {
      if (voice) return;
      if (!pickVoice()) return;
      synth.removeEventListener('voiceschanged', handleVoicesChanged);
      awaitingVoices = false;
      if (queued) {
        const { text, opts } = queued;
        queued = null;
        speak(text, opts);
      }
    }

    function ensureVoice() {
      if (voice) return true;
      if (pickVoice()) return true;
      if (!awaitingVoices) {
        awaitingVoices = true;
        synth.addEventListener('voiceschanged', handleVoicesChanged);
      }
      return false;
    }

    function speak(text, opts = {}) {
      if (!text) return;
      if (!ensureVoice()) {
        queued = { text, opts };
        return;
      }
      const shouldInterrupt = opts.interrupt ?? true;
      if (shouldInterrupt) synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang;
      }
      utter.volume = opts.volume ?? 1;
      utter.rate = opts.rate ?? 1;
      utter.pitch = opts.pitch ?? 1;
      synth.speak(utter);
    }

    function cancel() {
      synth.cancel();
      queued = null;
    }

    return { supported: true, speak, cancel };
  }

  /** Text File Export for OBS */
  let textFileHandle = null;
  let textFileEnabled = false;
  
  const showToast = (message, type = 'info', title = '') => {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = { error: '❌', success: '✓', warning: '⚠️', info: 'ℹ️' };
    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    icon.textContent = icons[type] || icons.info;
    
    const content = document.createElement('div');
    content.className = 'toast-content';
    
    if (title) {
      const titleEl = document.createElement('div');
      titleEl.className = 'toast-title';
      titleEl.textContent = title;
      content.appendChild(titleEl);
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = 'toast-message';
    messageEl.textContent = message;
    content.appendChild(messageEl);
    
    toast.appendChild(icon);
    toast.appendChild(content);
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s, transform 0.3s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(400px)';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  };
  
  const updateTextFileStatus = () => {
    if (!textFileStatus) return;
    if (textFileEnabled && textFileHandle) {
      textFileStatus.textContent = `Active – ${textFileHandle.name}`;
      textFileStatus.style.color = 'var(--accent)';
      if (configureTextFileBtn) {
        configureTextFileBtn.textContent = 'Disable';
      }
    } else {
      textFileStatus.textContent = 'Not configured';
      textFileStatus.style.color = 'var(--muted)';
      if (configureTextFileBtn) {
        configureTextFileBtn.textContent = 'Configure';
      }
    }
  };
  
  const writeToTextFile = async (content) => {
    if (!textFileEnabled || !textFileHandle) return;
    
    try {
      const writable = await textFileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (err) {
      console.error('Failed to write to text file', err);
      showToast('Failed to update text file. Check browser permissions.', 'error', 'Export Error');
      // Don't disable on error - user might have temporarily revoked permission
    }
  };
  
  const exportCurrentTrack = async () => {
    if (!textFileEnabled || current < 0 || !tracks[current]) return;
    if (!audio || audio.paused) return; // Only export when audio is actively playing
    
    const track = tracks[current];
    const details = buildAnnouncementDetails(track);
    const title = details.title || track.displayName || 'Unknown Track';
    const artist = details.artist || 'Unknown Artist';
    const content = `${title} - ${artist}`;
    
    await writeToTextFile(content);
  };
  
  const clearTextFileExport = async () => {
    if (!textFileEnabled) return;
    await writeToTextFile('');
  };
  
  const loadTextFileConfig = async () => {
    try {
      const enabled = await getStoreValue(TEXT_FILE_ENABLED_KEY);
      textFileEnabled = Boolean(enabled);
      
      if (textFileEnabled) {
        const handle = await getStoreValue(TEXT_FILE_HANDLE_KEY);
        if (handle) {
          try {
            // Verify we still have permission
            const permission = await handle.queryPermission({ mode: 'readwrite' });
            if (permission === 'granted') {
              textFileHandle = handle;
            } else {
              // Request permission again
              const newPerm = await handle.requestPermission({ mode: 'readwrite' });
              if (newPerm === 'granted') {
                textFileHandle = handle;
              } else {
                textFileEnabled = false;
                textFileHandle = null;
              }
            }
          } catch (permErr) {
            console.warn('Failed to verify file permissions', permErr);
            textFileEnabled = false;
            textFileHandle = null;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load text file configuration', err);
      textFileEnabled = false;
      textFileHandle = null;
    }
    
    updateTextFileStatus();
  };
  
  const configureTextFile = async () => {
    // Check if File System Access API is supported
    if (!('showSaveFilePicker' in window)) {
      showToast('Text file export requires a Chromium-based browser (Chrome, Edge, Opera).', 'error', 'Unsupported Browser');
      return;
    }
    
    // If already enabled, disable it
    if (textFileEnabled && textFileHandle) {
      textFileEnabled = false;
      textFileHandle = null;
      await putStoreValue(TEXT_FILE_ENABLED_KEY, false);
      await putStoreValue(TEXT_FILE_HANDLE_KEY, null);
      updateTextFileStatus();
      showToast('Text file export disabled.', 'success', 'Export Disabled');
      return;
    }
    
    // Otherwise, configure a new file
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'now-playing.txt',
        types: [{
          description: 'Text Files',
          accept: { 'text/plain': ['.txt'] }
        }]
      });
      
      // Test write access
      const writable = await handle.createWritable();
      await writable.write('');
      await writable.close();
      
      textFileHandle = handle;
      textFileEnabled = true;
      
      await putStoreValue(TEXT_FILE_HANDLE_KEY, handle);
      await putStoreValue(TEXT_FILE_ENABLED_KEY, true);
      
      updateTextFileStatus();
      showToast(`Now exporting to ${handle.name}`, 'success', 'Export Enabled');
      
      // Export current track if playing
      if (current >= 0 && tracks[current]) {
        await exportCurrentTrack();
      }
    } catch (err) {
      if (err && typeof err === 'object' && err.name === 'AbortError') {
        // User cancelled, ignore
        return;
      }
      console.error('Failed to configure text file', err);
      showToast('Failed to configure text file. Please try again.', 'error', 'Configuration Error');
    }
  };

  const revokeAll = () => {
    tracks.forEach(t => { if (t.url) URL.revokeObjectURL(t.url); });
  };

  async function* walk(dir, path = []) {
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === 'file') {
        if (name.toLowerCase().endsWith('.mp3')) {
          yield { name, handle, path };
        }
      } else if (handle.kind === 'directory') {
        if (!name.startsWith('.')) {
          yield* walk(handle, [...path, name]);
        }
      }
    }
  }

  async function scanFolder(dirHandle) {
    setFolderPath(dirHandle, { loading: true });
    rootDirName = dirHandle?.name || 'Selected Folder';
    finalizePlaySession('folder-change', { position: Number.isFinite(audio.currentTime) ? audio.currentTime : undefined });
    tracks = [];
    current = -1;
    pendingAnnouncement = null;
    lastAnnouncedSummary = null;
    lastAnnouncedTrackKey = null;
    lastAnnouncedArtist = null;
    lastAnnouncedTitle = null;
    stopVisualizer({ clear: true, state: 'idle' });
    if (announceTimer) {
      clearTimeout(announceTimer);
      announceTimer = null;
    }
    revokeAll();
    listEl.innerHTML = '';
    if (nowTitleEl) nowTitleEl.textContent = '—';
    if (nowArtistEl) nowArtistEl.textContent = '—';
    if (nowTrackNumberEl) nowTrackNumberEl.textContent = '—';
    applyNowTrackMetrics();
    countEl.textContent = 'Scanning…';
    
    // Clear text file export while scanning
    if (textFileEnabled && textFileHandle) {
      clearTextFileExport().catch(err => {
        console.warn('Failed to clear text file during scan', err);
      });
    }

    try {
      for await (const entry of walk(dirHandle)) {
        const { handle: fh, path } = entry;
        const file = await fh.getFile();
        const url = URL.createObjectURL(file);
        tracks.push({
          name: file.name,
          displayName: file.name.replace(/\.mp3$/i, ''),
          handle: fh,
          url,
          duration: NaN,
          path: [...path],
        });
      }
    } catch (err) {
      console.error('Failed scanning folder', err);
      tracks = [];
      applyNowTrackMetrics();
    }

    tracks.sort((a, b) => NAME_COLLATOR.compare(trackKey(a), trackKey(b)));
    applyNowTrackMetrics();

    renderList();
    countEl.textContent = `${tracks.length} track${tracks.length===1?'':'s'}`;
    if (tracks.length) {
      let targetIdx = 0;
      try {
        const storedKey = await getStoreValue(LAST_TRACK_KEY);
        if (typeof storedKey === 'string') {
          const found = tracks.findIndex(t => trackKey(t) === storedKey);
          if (found >= 0) {
            targetIdx = found;
          } else if (shuffle && tracks.length > 1) {
            targetIdx = Math.floor(Math.random() * tracks.length);
            console.info('Last known track missing; selecting a random track because shuffle is on.');
          } else {
            console.info('Last known track not found; defaulting to first track.');
          }
        }
      } catch (err) {
        console.error('Failed loading last track', err);
      }
      playIndex(targetIdx, {autoplay:false});
    }
    setFolderPath(dirHandle);
    updatePrevButtonState();
  }

  if (announceBtn) {
    if (speech.supported) {
      const initial = readAnnouncePreference();
      setAnnounceEnabled(initial, { persist: false });
      announceBtn.addEventListener('click', () => setAnnounceEnabled(!announceEnabled));
    } else {
      announceBtn.textContent = '🚫 Announce Unavailable';
      announceBtn.disabled = true;
      announceBtn.title = 'Speech synthesis not supported in this browser.';
      announceBtn.setAttribute('aria-disabled', 'true');
      announceBtn.setAttribute('aria-pressed', 'false');
      announceBtn.classList.remove('active');
    }
  }

  function renderList() {
    trackRefs = new Map();
    listEl.innerHTML = '';
    if (!tracks.length) {
      highlightActive();
      return;
    }

    const tree = buildTrackTree();
    const wrapper = document.createElement('div');
    wrapper.className = 'tree-root';

    const topDirs = Array.from(tree.dirs.values()).sort((a, b) => NAME_COLLATOR.compare(a.name, b.name));
    topDirs.forEach(dir => wrapper.appendChild(renderDirNode(dir, 0, [])));

    const rootFiles = tree.files.slice().sort((a, b) => NAME_COLLATOR.compare(a.name, b.name));
    rootFiles.forEach(file => wrapper.appendChild(renderTrackLeaf(file.index, [])));

    listEl.appendChild(wrapper);
    highlightActive();
  }

  function buildTrackTree() {
    const root = { name: rootDirName, dirs: new Map(), files: [] };
    tracks.forEach((track, index) => {
      let node = root;
      track.path.forEach(segment => {
        if (!node.dirs.has(segment)) {
          node.dirs.set(segment, { name: segment, dirs: new Map(), files: [] });
        }
        node = node.dirs.get(segment);
      });
      node.files.push({ name: track.name, index });
    });
    return root;
  }

  function renderDirNode(node, depth, ancestors) {
    const details = document.createElement('details');
    details.className = 'tree-dir';
    if (depth < 1) details.open = true;

    const summary = document.createElement('summary');
    summary.textContent = node.name;
    details.appendChild(summary);

    const children = document.createElement('div');
    children.className = 'tree-children';
    const nextAncestors = ancestors.concat(details);

    const subDirs = Array.from(node.dirs.values()).sort((a, b) => NAME_COLLATOR.compare(a.name, b.name));
    subDirs.forEach(child => children.appendChild(renderDirNode(child, depth + 1, nextAncestors)));

    const files = node.files.slice().sort((a, b) => NAME_COLLATOR.compare(a.name, b.name));
    files.forEach(file => children.appendChild(renderTrackLeaf(file.index, nextAncestors)));

    if (children.children.length) details.appendChild(children);
    return details;
  }

  function renderTrackLeaf(index, ancestors) {
    const track = tracks[index];
    const row = document.createElement('div');
    row.className = 'item track-item';
    row.dataset.index = index;
    row.role = 'button';
    row.tabIndex = 0;
    const relative = track.path.length ? `${track.path.join('/')}/${track.name}` : track.name;
    row.title = relative;

    const icon = document.createElement('div');
    icon.className = 'num';
    icon.textContent = index + 1;

    const nameEl = document.createElement('div');
    nameEl.className = 'name';
    const details = buildAnnouncementDetails(track);
    nameEl.textContent = details.title || track.displayName;

    const ratingEl = document.createElement('div');
    ratingEl.className = 'rating';
    const key = trackKey(track);
    const currentRating = trackRatings.get(key) || 0;
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('span');
      star.className = 'star' + (i <= currentRating ? ' filled' : '');
      star.textContent = '★';
      star.dataset.rating = i;
      star.addEventListener('click', (e) => {
        e.stopPropagation();
        const newRating = (currentRating === i) ? 0 : i;
        setTrackRating(key, newRating).then(() => {
          updateTrackRatingDisplay(row, newRating);
          // Update Now Playing if this is the current track
          if (index === current) {
            updateNowPlayingRating(newRating);
          }
        }).catch(err => {
          console.error('Failed setting track rating', err);
        });
      });
      star.addEventListener('mouseenter', () => {
        const stars = ratingEl.querySelectorAll('.star');
        stars.forEach((s, idx) => {
          if (idx < i) {
            s.classList.add('hover-fill');
          }
        });
      });
      star.addEventListener('mouseleave', () => {
        const stars = ratingEl.querySelectorAll('.star');
        stars.forEach(s => s.classList.remove('hover-fill'));
      });
      ratingEl.appendChild(star);
    }

    const playCountEl = document.createElement('div');
    playCountEl.className = 'play-count';
    const currentPlayCount = trackPlayCounts.get(key) || 0;
    playCountEl.textContent = currentPlayCount > 0 ? String(currentPlayCount) : '';
    playCountEl.title = currentPlayCount > 0 ? `Played ${currentPlayCount} time${currentPlayCount === 1 ? '' : 's'}` : '';

    const durEl = document.createElement('div');
    durEl.className = 'dur';
    durEl.textContent = isFinite(track.duration) ? fmtTime(track.duration) : '';

    row.append(icon, nameEl, durEl, playCountEl, ratingEl);
    row.addEventListener('click', (e) => {
      if (e.target.closest('.rating')) return;
      playIndex(index, {autoplay:true, skipReason:'manual'});
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        playIndex(index, {autoplay:true, skipReason:'manual'});
      }
    });

    trackRefs.set(index, { row, durEl, playCountEl, ancestors });
    if (!isFinite(track.duration)) {
      primeDuration(index, durEl);
    }

    return row;
  }

  function updateTrackPlayCountDisplay(index, count) {
    const ref = trackRefs.get(index);
    if (!ref || !ref.playCountEl) return;
    ref.playCountEl.textContent = count > 0 ? String(count) : '';
    ref.playCountEl.title = count > 0 ? `Played ${count} time${count === 1 ? '' : 's'}` : '';
  }

  function updateTrackRatingDisplay(row, rating) {
    const stars = row.querySelectorAll('.rating .star');
    stars.forEach((star, i) => {
      if (i < rating) {
        star.classList.add('filled');
      } else {
        star.classList.remove('filled');
      }
    });
  }

  function updateNowPlayingRating(rating) {
    if (!nowRatingEl) return;
    const stars = nowRatingEl.querySelectorAll('.star');
    stars.forEach((star, i) => {
      if (i < rating) {
        star.classList.add('filled');
      } else {
        star.classList.remove('filled');
      }
    });
  }

  function updateNowPlayingPlayCount(count) {
    if (!nowPlayCountEl) return;
    nowPlayCountEl.textContent = count > 0 ? String(count) : '—';
    const parent = nowPlayCountEl.parentElement;
    if (parent) {
      parent.title = count > 0 ? `Played ${count} time${count === 1 ? '' : 's'}` : 'Not played yet';
    }
  }

  function setupNowPlayingRating() {
    if (!nowRatingEl) return;
    const stars = nowRatingEl.querySelectorAll('.star');
    stars.forEach((star, index) => {
      star.addEventListener('click', () => {
        if (current < 0 || !tracks[current]) return;
        const track = tracks[current];
        const key = trackKey(track);
        const currentRating = trackRatings.get(key) || 0;
        const newRating = (currentRating === index + 1) ? 0 : index + 1;
        
        setTrackRating(key, newRating).then(() => {
          updateNowPlayingRating(newRating);
          // Also update the rating in the track list if visible
          const ref = trackRefs.get(current);
          if (ref && ref.row) {
            updateTrackRatingDisplay(ref.row, newRating);
          }
        }).catch(err => {
          console.error('Failed setting now-playing track rating', err);
        });
      });
      star.addEventListener('mouseenter', () => {
        stars.forEach((s, idx) => {
          if (idx <= index) {
            s.classList.add('hover-fill');
          }
        });
      });
      star.addEventListener('mouseleave', () => {
        stars.forEach(s => s.classList.remove('hover-fill'));
      });
    });
  }

  function primeDuration(index, durEl) {
    const track = tracks[index];
    const tmp = new Audio();
    tmp.preload = 'metadata';
    tmp.src = track.url;
    const clearTmp = () => {
      tmp.src = '';
      try { tmp.load(); } catch (_) {}
    };
    tmp.addEventListener('loadedmetadata', () => {
      track.duration = tmp.duration;
      if (durEl.isConnected) {
        durEl.textContent = isFinite(track.duration) ? fmtTime(track.duration) : '';
      }
      clearTmp();
    }, {once:true});
    tmp.addEventListener('error', clearTmp, {once:true});
  }

  function highlightActive() {
    trackRefs.forEach(ref => ref.row.classList.remove('active'));
    if (current < 0) return;
    const ref = trackRefs.get(current);
    if (!ref) return;
    ref.row.classList.add('active');
    ref.ancestors.forEach(det => {
      if (det && !det.open) det.open = true;
    });
    if (ref.row.isConnected) {
      ref.row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function applyShuffleState() {
    shuffleBtn.setAttribute('aria-pressed', String(shuffle));
    shuffleBtn.classList.toggle('active', shuffle);
  }

  function setLoopLabel() {
    const labels = { all: '🔁 Loop: All', one: '🔂 Loop: One', off: '⏹ Loop: Off' };
    loopBtn.textContent = labels[loopMode];
    audio.loop = (loopMode === 'one');
  }

  const VOLUME_STEP = 5;  // 5% volume change per arrow key press
  const SEEK_STEP = 5;     // 5 seconds seek forward/backward per arrow key press

  function setVolume(value, { persist = true } = {}) {
    const clampedValue = Math.max(0, Math.min(100, Math.round(value)));
    audio.volume = clampedValue / 100;
    if (volumeSlider) volumeSlider.value = String(clampedValue);
    if (volumeDisplay) volumeDisplay.textContent = `${clampedValue}%`;
    
    if (persist) {
      putStoreValue(VOLUME_KEY, clampedValue).catch(err => {
        console.error('Failed storing volume preference', err);
      });
    }
  }

  function adjustVolume(delta) {
    const currentVolume = Math.round(audio.volume * 100);
    setVolume(currentVolume + delta);
  }

  function seekBy(seconds) {
    if (!isFinite(audio.duration) || audio.duration <= 0) return;
    if (!isFinite(audio.currentTime)) return;
    const next = Math.max(0, Math.min(audio.currentTime + seconds, audio.duration));
    audio.currentTime = next;
  }

  async function playIndex(idx, {autoplay=true, skipReason='auto'} = {}) {
    if (!tracks.length) return;
    if (idx < 0) idx = 0;
    if (idx >= tracks.length) idx = tracks.length - 1;
    if (current >= 0 && current < tracks.length && idx !== current && activeSession) {
      finalizePlaySession(skipReason, { position: activeSession.lastPosition });
    }
    current = idx;

    const tr = tracks[current];
    const details = recordPendingAnnouncement(tr, { skipReason });
    audio.src = tr.url;
    if (nowTitleEl) {
      const displayTitle = (details && details.title) ? details.title : tr.displayName;
      const youtubeUrl = resolveYouTubeUrlFromTrack(tr);
      if (youtubeUrl) {
        nowTitleEl.innerHTML = '';
        const link = document.createElement('a');
        link.className = 'now-title-link';
        link.href = youtubeUrl;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = displayTitle;
        nowTitleEl.appendChild(link);
      } else {
        nowTitleEl.textContent = displayTitle;
      }
    }
    if (nowArtistEl) nowArtistEl.textContent = (details && details.artist) ? details.artist : '—';
    if (nowTrackNumberEl) nowTrackNumberEl.textContent = fmtTrackNumber(current);
    const key = trackKey(tr);
    updateNowPlayingRating(trackRatings.get(key) || 0);
    updateNowPlayingPlayCount(trackPlayCounts.get(key) || 0);
    highlightActive();
    updateMediaSessionMetadata(tr);
    putStoreValue(LAST_TRACK_KEY, trackKey(tr)).catch(err => {
      console.error('Failed storing last track', err);
    });
    
    // Reset UI time
    seek.value = 0;
    tCur.textContent = '0:00';
    tTot.textContent = isFinite(tr.duration) ? fmtTime(tr.duration) : '0:00';

    if (autoplay) {
      try { await audio.play(); playPauseBtn.textContent = '⏸ Pause'; }
      catch(e){ /* ignore autoplay block */ }
    } else {
      playPauseBtn.textContent = '▶️ Play';
    }
  }

  function nextIndex() {
    if (!tracks.length) return current;
    if (shuffle && tracks.length > 1) {
      // random but avoid immediate repeat
      let idx;
      do { idx = Math.floor(Math.random() * tracks.length); } while (idx === current);
      return idx;
    }
    // linear advance, wrap if loop all, else clamp at end (handled in ended)
    let idx = current + 1;
    if (idx >= tracks.length) idx = 0;
    return idx;
  }

  const playPreviousFromHistory = async ({ autoplay = true } = {}) => {
    if (!tracks.length) return;
    const candidate = consumeBackStackEntry();
    if (!candidate) {
      updatePrevButtonState();
      return;
    }
    suppressBackStackPush = true;
    try {
      await playIndex(candidate.index, { autoplay, skipReason: 'history-back' });
    } catch (err) {
      playbackBackStack.splice(candidate.stackIndex, 0, candidate.entry);
      updatePrevButtonState();
      throw err;
    } finally {
      suppressBackStackPush = false;
    }
  };

  const loadPreferences = async () => {
    try {
      const storedShuffle = await getStoreValue(SHUFFLE_KEY);
      if (typeof storedShuffle === 'boolean') shuffle = storedShuffle;
    } catch (err) {
      console.error('Failed loading shuffle preference', err);
    }
    applyShuffleState();

    try {
      const storedLoop = await getStoreValue(LOOP_KEY);
      if (storedLoop === 'all' || storedLoop === 'one' || storedLoop === 'off') {
        loopMode = storedLoop;
      }
    } catch (err) {
      console.error('Failed loading loop preference', err);
    }
    setLoopLabel();

    try {
      const storedVolume = await getStoreValue(VOLUME_KEY);
      if (typeof storedVolume === 'number' && storedVolume >= 0 && storedVolume <= 100) {
        setVolume(storedVolume, { persist: false });
      } else {
        setVolume(100, { persist: false });
      }
    } catch (err) {
      console.error('Failed loading volume preference', err);
      setVolume(100, { persist: false });
    }
  };

  /** Event wiring */
  applyShuffleState();
  setLoopLabel();
  loadPreferences();
  loadHistoryEntries();
  loadAllRatings().catch(err => {
    console.error('Failed loading track ratings', err);
  });
  loadAllPlayCounts().catch(err => {
    console.error('Failed loading play counts', err);
  });
  setupNowPlayingRating();

  if (historyToggleBtn) {
    historyToggleBtn.addEventListener('click', () => {
      if (isHistoryVisible()) closeHistoryOverlay();
      else openHistoryOverlay();
    });
  }
  if (historyCloseBtn) {
    historyCloseBtn.addEventListener('click', closeHistoryOverlay);
  }
  if (historyClearBtn) {
    historyClearBtn.addEventListener('click', async () => {
      const hasStoredEntries = Boolean(historyEntries && historyEntries.length);
      if (!hasStoredEntries && !liveHistoryEntry) {
        closeHistoryOverlay();
        return;
      }
      const confirmed = window.confirm('Clear all stored history entries? This cannot be undone.');
      if (!confirmed) return;
      try {
        await clearHistoryStore();
        historyEntries = [];
        clearPlaybackBackStack();
        requestHistoryRender();
      } catch (err) {
        console.error('Failed clearing history entries', err);
      }
    });
  }
  if (historyOverlay) {
    historyOverlay.addEventListener('click', (event) => {
      if (event.target === historyOverlay) closeHistoryOverlay();
    });
    historyOverlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeHistoryOverlay();
      }
    });
  }
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isHistoryVisible()) {
      closeHistoryOverlay();
    }
  });

  chooseBtn.addEventListener('click', async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('Your browser does not support picking folders. Use a Chromium-based browser like Chrome or Edge.');
      return;
    }
    try {
      const dir = await window.showDirectoryPicker({ id: 'mp3-player-root' });
      const perm = await dir.requestPermission({ mode: 'read' });
      if (perm === 'granted') {
        await scanFolder(dir);
        await saveLastHandle(dir);
      } else { alert('Read permission was not granted.'); }
    } catch (e) {
      if (e?.name !== 'AbortError') console.error(e);
    }
  });
  
  // Settings modal handlers
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      settingsModal?.classList.add('show');
    });
  }
  
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      settingsModal?.classList.remove('show');
    });
  }
  
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.remove('show');
      }
    });
  }
  
  if (configureTextFileBtn) {
    configureTextFileBtn.addEventListener('click', configureTextFile);
  }

  playPauseBtn.addEventListener('click', async () => {
    if (!tracks.length) return;
    if (audio.paused) {
      try { await audio.play(); playPauseBtn.textContent = '⏸ Pause'; } catch(e){}
    } else {
      audio.pause(); playPauseBtn.textContent = '▶️ Play';
    }
  });

  nextBtn.addEventListener('click', () => playIndex(nextIndex(), {autoplay:true, skipReason:'manual'}));
  prevBtn.addEventListener('click', () => {
    playPreviousFromHistory({ autoplay: true }).catch(err => {
      console.error('Failed loading previous track from history', err);
    });
  });

  shuffleBtn.addEventListener('click', () => {
    shuffle = !shuffle;
    applyShuffleState();
    putStoreValue(SHUFFLE_KEY, shuffle).catch(err => {
      console.error('Failed storing shuffle preference', err);
    });
  });

  loopBtn.addEventListener('click', () => {
    loopMode = loopMode === 'all' ? 'one' : loopMode === 'one' ? 'off' : 'all';
    setLoopLabel();
    putStoreValue(LOOP_KEY, loopMode).catch(err => {
      console.error('Failed storing loop preference', err);
    });
  });

  // Volume control
  if (volumeSlider) {
    volumeSlider.addEventListener('input', () => {
      setVolume(Number(volumeSlider.value));
    });
  }

  // Audio timing UI
  audio.addEventListener('loadedmetadata', () => {
    tTot.textContent = fmtTime(audio.duration);
    updateMediaSessionPositionState();
    updateSessionDuration(audio.duration);
  });
  audio.addEventListener('play', () => {
    maybeAnnounceCurrentTrack();
    startVisualizer();
    beginPlaySession();
    setLiveEntryState('playing');
    startListeningClock();
    updateMediaSessionPlaybackState('playing');
    exportCurrentTrack().catch(err => {
      console.error('Failed exporting track to text file', err);
    });
  });
  audio.addEventListener('pause', () => {
    stopListeningClock();
    if (!audio.ended) {
      setLiveEntryState('paused');
      stopVisualizer({ state: 'paused' });
    }
    updateMediaSessionPlaybackState('paused');
    clearTextFileExport().catch(err => {
      console.error('Failed to clear text file on pause', err);
    });
  });
  audio.addEventListener('timeupdate', () => {
    if (!isFinite(audio.duration) || audio.duration <= 0) return;
    const pos = Math.round((audio.currentTime / audio.duration) * 1000);
    seek.value = String(pos);
    tCur.textContent = fmtTime(audio.currentTime);
    updateSessionPosition(audio.currentTime);
    requestHistoryRender();
  });
  seek.addEventListener('input', () => {
    if (!isFinite(audio.duration) || audio.duration <= 0) return;
    const pos = Number(seek.value) / 1000;
    const next = audio.duration * pos;
    audio.currentTime = next;
    updateMediaSessionPositionState();
    scheduleSeekPositionUpdate(audio.currentTime);
  });

  // Track end behavior
  audio.addEventListener('ended', () => {
    stopListeningClock();
    finalizePlaySession('completed', { position: audio.duration });
    stopVisualizer({ clear: true, state: 'idle' });
    // If loop one is set, audio.loop handles it.
    if (loopMode === 'one') return;
    // Loop all or off:
    if (shuffle || loopMode === 'all') {
      playIndex(nextIndex(), {autoplay:true});
    } else {
      // Off: if not last, go next; if last, stop at end.
      if (current < tracks.length - 1) {
        playIndex(current + 1, {autoplay:true});
      } else {
        playPauseBtn.textContent = '▶️ Play';
        clearTextFileExport().catch(err => {
          console.error('Failed to clear text file at end of playlist', err);
        });
      }
    }
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    // Skip if typing in input fields or textareas
    if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
    
    // Skip if select element is focused (for visualizer dropdown)
    if (e.target.tagName === 'SELECT') return;
    
    // Get playlist element and check if it's scrollable (for arrow key checks)
    const list = document.getElementById('list');
    const isListFocused = list && (list === e.target || list.contains(e.target));
    const isListHScrollable = list && list.scrollWidth > list.clientWidth;
    const isListVScrollable = list && list.scrollHeight > list.clientHeight;
    
    if (e.code === 'Space') { 
      e.preventDefault(); 
      playPauseBtn.click(); 
    }
    else if (e.key === 'ArrowRight') {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux) modifier
      if (e.metaKey || e.ctrlKey) {
        // Cmd/Ctrl + Right → next track
        e.preventDefault();
        nextBtn.click();
      } else {
        // Plain Right → seek forward 5 seconds
        // Only prevent default if not focused on a horizontally scrollable playlist
        if (!(isListFocused && isListHScrollable)) {
          e.preventDefault();
          seekBy(SEEK_STEP);
        }
      }
    }
    else if (e.key === 'ArrowLeft') {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux) modifier
      if (e.metaKey || e.ctrlKey) {
        // Cmd/Ctrl + Left → previous track
        e.preventDefault();
        if (!prevBtn.disabled) prevBtn.click();
      } else {
        // Plain Left → seek backward 5 seconds
        // Only prevent default if not focused on a horizontally scrollable playlist
        if (!(isListFocused && isListHScrollable)) {
          e.preventDefault();
          seekBy(-SEEK_STEP);
        }
      }
    }
    else if (e.key === 'ArrowUp') {
      // Only prevent default if not focused on a vertically scrollable playlist
      if (!(isListFocused && isListVScrollable)) {
        e.preventDefault();
        adjustVolume(VOLUME_STEP);
      }
    }
    else if (e.key === 'ArrowDown') {
      // Only prevent default if not focused on a vertically scrollable playlist
      if (!(isListFocused && isListVScrollable)) {
        e.preventDefault();
        adjustVolume(-VOLUME_STEP);
      }
    }
    else if (e.key.toLowerCase() === 's') shuffleBtn.click();
    else if (e.key.toLowerCase() === 'l') loopBtn.click();
    else if (e.key.toLowerCase() === 'a' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName) && announceBtn && !announceBtn.disabled) {
      e.preventDefault();
      announceBtn.click();
    }
  });

  // Clean up object URLs when leaving
  window.addEventListener('beforeunload', revokeAll);

  // Load text file export configuration
  loadTextFileConfig().then(() => {
    // Clear the file on startup to avoid showing stale data
    return clearTextFileExport();
  }).catch(err => {
    console.error('Failed to load text file configuration', err);
  });

  // Restore previous folder if permission remains granted
  (async () => {
    const last = await loadLastHandle();
    if (!last) return;
    try {
      const perm = await last.queryPermission({ mode: 'read' });
      if (perm === 'granted') {
        await scanFolder(last);
      }
    } catch (err) {
      console.error('Unable to restore previous folder', err);
      setFolderPath(null);
    }
  })();
})();
