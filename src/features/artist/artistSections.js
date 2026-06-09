// Determines which sections to show on an artist page and in what order,
// based entirely on behavioral data. No UI. Returns a plain ordered array.

/**
 * @param {object}   insights — output of computeArtistInsights()
 * @param {object[]} albums   — album objects for this artist
 * @returns {Array<{ type: string, tracks?: object[], albums?: object[] }>}
 */
export function getArtistPageSections(insights, albums = []) {
  const { topTracks, recentTracks, isRepeatHeavy, hasHistory, hasRecentHistory } = insights;
  const sections = [];

  if (!hasHistory) {
    // Cold start — show discography only
    sections.push({ type: 'ALBUMS', albums });
    return sections;
  }

  // ON_REPEAT: lead with this when a track has been replayed 3+ times
  const repeatCandidate = topTracks[0]?._playCount >= 3 ? topTracks : null;
  if (repeatCandidate) {
    sections.push({ type: 'ON_REPEAT', tracks: repeatCandidate.slice(0, 5) });
  }

  // RECENTLY_PLAYED: exists and different from ON_REPEAT tracks
  if (hasRecentHistory) {
    const recentIds  = new Set(recentTracks.map((t) => t.Id || t.id));
    const repeatIds  = new Set((repeatCandidate || []).map((t) => t.Id || t.id));
    const freshOnly  = recentTracks.filter((t) => !repeatIds.has(t.Id || t.id));
    if (freshOnly.length > 0 || !repeatCandidate) {
      sections.push({ type: 'RECENT', tracks: recentTracks.slice(0, 10) });
    }
  }

  // FAVORITES: all-time top tracks (skip if already shown as ON_REPEAT)
  if (!repeatCandidate && topTracks.length > 0) {
    sections.push({ type: 'FAVORITES', tracks: topTracks.slice(0, 10) });
  }

  // RECOMMENDED_FLOW: only unlocked by repeat behavior — vibeQueue fills the tracks
  if (isRepeatHeavy) {
    sections.push({ type: 'RECOMMENDED_FLOW', tracks: [] });
  }

  // ALBUMS: always appended; comes first only on cold start (handled above)
  sections.push({ type: 'ALBUMS', albums });

  return sections;
}
