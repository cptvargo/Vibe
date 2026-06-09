// Clean API interface — swap this file's implementation when moving off Jellyfin.
// Feature components import from here, never from ../../api/jellyfin directly.

export {
  getRecentlyPlayed,
  getRecentlyAdded,
  getRecentPlaylists,
  getTopAlbums,
  getRecentAlbums,
  getMostPlayedThisMonth,
  getPlayHistory,
  getAllGenres,
  getByGenre,
  getAlbums,
  getArtists,
  getAllTracks,
  getAlbumTracks,
  getAlbumTracks_forMix,
  getArtistAlbums,
  getArtistTracks,
  getArtistImageUrl,
  getVibeRadio,
  getInstantMix,
  search,
  searchArtists,
  getImageUrl,
  getAlbumImageUrl,
} from '../../api/jellyfin';

import { VIBE_CONFIG } from '../../config/vibeConfig';

export async function getSimilarArtists(artistId, limit = 8) {
  const { serverUrl, token, userId } = VIBE_CONFIG;
  const res = await fetch(
    `${serverUrl}/Artists/${artistId}/Similar?UserId=${userId}&Limit=${limit}&Fields=PrimaryImageAspectRatio`,
    { headers: { 'X-Emby-Token': token } },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.Items || []).filter((a) => a.Id !== artistId);
}
