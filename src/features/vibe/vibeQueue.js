// Smart queue builder for "Vibe Mode" — blends an artist's tracks with
// behavioral weighting, duration affinity, and anti-repeat rules.

const DEFAULT_LENGTH = 25;

/**
 * @param {object[]} artistTracks — all tracks for the artist
 * @param {object}   insights     — output of computeArtistInsights()
 * @param {number}   maxLength
 * @returns {object[]} ordered track list ready to pass to player.play()
 */
export function generateVibeQueue(artistTracks, insights, maxLength = DEFAULT_LENGTH) {
  if (!artistTracks.length) return [];

  const { topTracks, isRepeatHeavy } = insights;
  const topIdToCount = new Map(topTracks.map((t) => [t.Id || t.id, t._playCount]));

  // Score every track
  const scored = artistTracks.map((track) => {
    const id         = track.Id || track.id;
    const playCount  = topIdToCount.get(id) || 0;
    const playScore  = Math.min(playCount / 5, 1); // 0–1, saturates at 5 plays
    const durationMs = _durationMs(track);
    return { track, id, playScore, durationMs, isFavorite: playScore > 0 };
  });

  // Separate into pools
  const favorites = scored.filter((s) => s.isFavorite).sort((a, b) => b.playScore - a.playScore);
  const others    = _shuffle(scored.filter((s) => !s.isFavorite));

  // Interleave: repeat-heavy listeners get more favorites
  const favoriteEvery = isRepeatHeavy ? 2 : 3; // insert 1 other every N favorites
  const merged        = _interleave(favorites, others, favoriteEvery, maxLength);

  // Duration affinity: if the first track sets a tempo (~duration), cluster similar ones
  if (merged.length > 3) {
    const anchorDuration = merged[0].durationMs;
    // Stable-sort to group similar durations without losing the favorite weighting
    merged.sort((a, b) => {
      const dDiff = Math.abs(a.durationMs - anchorDuration) - Math.abs(b.durationMs - anchorDuration);
      const sDiff = b.playScore - a.playScore;
      // Only apply duration affinity within similar play-score tier (±0.2)
      return Math.abs(sDiff) > 0.2 ? sDiff : dDiff;
    });
  }

  // Anti-repeat: no track can appear back-to-back
  const queue = [];
  for (const s of merged) {
    const lastId = queue[queue.length - 1]?.Id || queue[queue.length - 1]?.id;
    if (s.id !== lastId) queue.push(s.track);
    if (queue.length >= maxLength) break;
  }

  return queue;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _durationMs(track) {
  if (track.RunTimeTicks) return track.RunTimeTicks / 10000;
  if (track.duration)     return track.duration * 1000;
  return 210000; // assume 3.5 min if unknown
}

function _shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function _interleave(favorites, others, favoriteEvery, maxLength) {
  const out = [];
  let fi = 0, oi = 0, sinceOther = 0;
  while (out.length < maxLength && (fi < favorites.length || oi < others.length)) {
    const wantOther = sinceOther >= favoriteEvery && oi < others.length;
    if (wantOther) {
      out.push(others[oi++]);
      sinceOther = 0;
    } else if (fi < favorites.length) {
      out.push(favorites[fi++]);
      sinceOther++;
    } else {
      out.push(others[oi++]);
    }
  }
  return out;
}
