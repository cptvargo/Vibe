// Write side of the analytics system.
// Tracks what is playing, how long, whether it completed.

import { dbAdd, dbPatch } from './analyticsDB';

// Stable session ID — new ID per browser tab session
const SESSION_ID = (() => {
  const key = 'vibe-session-id';
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessionStorage.setItem(key, id);
  return id;
})();

// Extract a consistent artistId from a Jellyfin or vibe-server track object
export function resolveArtistId(track) {
  return track?.ArtistItems?.[0]?.Id   // Jellyfin — most specific
      || track?.artistId               // vibe-server
      || track?.AlbumArtist            // Jellyfin fallback (name-as-id, still stable per artist)
      || 'unknown';
}

// Resolve duration to milliseconds regardless of source format
function resolveDurationMs(track) {
  if (track?.RunTimeTicks)  return track.RunTimeTicks / 10000;   // Jellyfin (100-ns ticks → ms)
  if (track?.duration)      return track.duration * 1000;        // vibe-server (seconds → ms)
  return 0;
}

let _activeId  = null; // IndexedDB key of the in-progress play record
let _lastWrite = 0;    // throttle timestamp

// Call when a new track begins (track-changed event)
export async function startPlay(track) {
  _activeId = null;
  _lastWrite = 0;

  const play = {
    trackId:    track.Id    || track.id,
    artistId:   resolveArtistId(track),
    albumId:    track.AlbumId || track.albumId || null,
    timestamp:  Date.now(),
    durationMs: resolveDurationMs(track),
    playedMs:   0,
    completed:  false,
    sessionId:  SESSION_ID,
  };

  _activeId = await dbAdd(play);
}

// Call periodically with currentTime/duration in seconds (from progress event)
// Throttled to one write every 5 s to avoid hammering IndexedDB
export async function updateProgress(currentTimeSec, durationSec) {
  if (_activeId === null || !durationSec) return;

  const now = Date.now();
  if (now - _lastWrite < 5000) return;
  _lastWrite = now;

  const playedMs  = currentTimeSec * 1000;
  const completed = (currentTimeSec / durationSec) >= 0.8;
  await dbPatch(_activeId, { playedMs, completed });
}

// Call when the play session ends (track changes, tab closes)
export function finalizePlay() {
  _activeId = null;
}
