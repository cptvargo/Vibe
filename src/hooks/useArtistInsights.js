import { useState, useEffect } from 'react';
import { getArtistStats } from '../features/analytics/analyticsQueries';
import { computeArtistInsights } from '../features/artist/artistIntelligence';
import { getArtistPageSections } from '../features/artist/artistSections';
import { generateVibeQueue } from '../features/vibe/vibeQueue';

const EMPTY = { sections: [], stats: null, vibeQueue: [], loading: true };

/**
 * Loads analytics for one artist and derives the dynamic page layout.
 *
 * @param {string}   artistId      — Jellyfin artist ID (or AlbumArtist name as fallback)
 * @param {object[]} artistTracks  — full track objects for this artist
 * @param {object[]} albums        — album objects for this artist
 *
 * Usage:
 *   const { sections, stats, vibeQueue, loading } = useArtistInsights(
 *     artist.Id,
 *     tracks,
 *     albums,
 *   );
 *
 *   sections example:
 *   [
 *     { type: 'ON_REPEAT',         tracks: [...] },
 *     { type: 'RECENT',            tracks: [...] },
 *     { type: 'RECOMMENDED_FLOW',  tracks: [] },   // vibeQueue fills this
 *     { type: 'ALBUMS',            albums: [...] },
 *   ]
 */
export function useArtistInsights(artistId, artistTracks = [], albums = []) {
  const [state, setState] = useState(EMPTY);

  useEffect(() => {
    if (!artistId) return;
    let cancelled = false;
    setState(EMPTY);

    async function load() {
      const stats     = await getArtistStats(artistId);
      const insights  = computeArtistInsights(stats, artistTracks);
      const sections  = getArtistPageSections(insights, albums);
      // Inject the vibe queue into the RECOMMENDED_FLOW section if present
      const vibeQueue = generateVibeQueue(artistTracks, insights);
      const resolvedSections = sections.map((s) =>
        s.type === 'RECOMMENDED_FLOW' ? { ...s, tracks: vibeQueue } : s,
      );

      if (!cancelled) setState({ sections: resolvedSections, stats: insights, vibeQueue, loading: false });
    }

    load();
    return () => { cancelled = true; };

  // Re-run if artist changes or tracks finish loading (length change is the signal)
  }, [artistId, artistTracks.length, albums.length]);

  return state;
}
