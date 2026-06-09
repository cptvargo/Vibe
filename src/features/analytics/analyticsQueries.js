// Read side of the analytics system.
// All functions return plain objects — no IndexedDB cursors exposed outside this file.

import { dbGetByArtist } from './analyticsDB';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Full stats object for one artist
export async function getArtistStats(artistId) {
  const plays  = await dbGetByArtist(artistId);
  return _compute(artistId, plays);
}

// Top N tracks by play count for an artist
export async function getTopTracks(artistId, limit = 10) {
  const plays = await dbGetByArtist(artistId);
  return _rankTracks(plays).slice(0, limit);
}

// Time-of-day breakdown (morning / afternoon / night) for an artist
export async function getListeningPatterns(artistId) {
  const plays = await dbGetByArtist(artistId);
  return _patterns(plays);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _compute(artistId, plays) {
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const recent = plays.filter((p) => p.timestamp >= cutoff);

  const topTracks    = _rankTracks(plays);
  const recentTracks = _rankTracks(recent);

  // "Repeat heavy" — any single track played 3+ times in the last 7 days
  const isRepeatHeavy = recentTracks.some((t) => t.count >= 3);

  return {
    artistId,
    totalPlays:      plays.length,
    topTracks,                                         // [{ trackId, count }] all-time
    recentTrackIds:  [...new Set(recent.map((p) => p.trackId))], // ordered by recency
    recentPlays:     recent,                           // raw play records, last 7 days
    listeningPattern: _patterns(plays),
    isRepeatHeavy,
  };
}

function _rankTracks(plays) {
  const counts = {};
  for (const p of plays) {
    counts[p.trackId] = (counts[p.trackId] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([trackId, count]) => ({ trackId, count }));
}

function _patterns(plays) {
  let morning = 0, afternoon = 0, night = 0;
  for (const p of plays) {
    const h = new Date(p.timestamp).getHours();
    if      (h >= 5  && h < 12) morning++;
    else if (h >= 12 && h < 18) afternoon++;
    else                         night++;
  }
  const total = plays.length || 1;
  return {
    morning:   morning   / total,
    afternoon: afternoon / total,
    night:     night     / total,
  };
}
