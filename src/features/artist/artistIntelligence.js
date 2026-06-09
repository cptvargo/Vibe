// Combines raw analytics stats with the live track list for an artist
// into a single, UI-ready insights object.

import { resolveArtistId } from '../analytics/recordPlay';

/**
 * @param {object}   stats        — output of getArtistStats()
 * @param {object[]} artistTracks — full track objects for this artist
 * @returns {object} insights
 */
export function computeArtistInsights(stats, artistTracks) {
  // Build a fast lookup: trackId → track object
  const byId = {};
  for (const t of artistTracks) byId[t.Id || t.id] = t;

  // Hydrate top tracks (all-time) with full track objects + play count annotation
  const topTracks = stats.topTracks
    .map(({ trackId, count }) => {
      const track = byId[trackId];
      if (!track) return null;
      return { ...track, _playCount: count };
    })
    .filter(Boolean);

  // Hydrate recent tracks (last 7 days), preserving recency order, deduped
  const seen = new Set();
  const recentTracks = stats.recentTrackIds
    .map((id) => byId[id])
    .filter((t) => {
      if (!t) return false;
      const key = t.Id || t.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return {
    artistId:         stats.artistId,
    totalPlays:       stats.totalPlays,
    topTracks,                          // full track objects, sorted by play count
    recentTracks,                       // full track objects, sorted by recency (last 7d)
    listeningPattern: stats.listeningPattern,
    isRepeatHeavy:    stats.isRepeatHeavy,
    hasHistory:       stats.totalPlays > 0,
    hasRecentHistory: recentTracks.length > 0,
  };
}
