// ─────────────────────────────────────────────
//  Vibe · Jellyfin API Service
// ─────────────────────────────────────────────

import { VIBE_CONFIG } from '../config/vibeConfig';

const { serverUrl: BASE_URL, token: TOKEN, userId: USER_ID } = VIBE_CONFIG;

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Emby-Authorization': `MediaBrowser Client="Vibe", Device="VibeApp", DeviceId="vibe-001", Version="1.0.0", Token="${TOKEN}"`,
});

async function request(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`Jellyfin ${res.status}: ${path}`);
  return res.json();
}

// ── Library ───────────────────────────────────
export async function getRecentlyPlayed(limit = 20) {
  // IsPlayed=true ensures only tracks the user has actually played come back
  return request(`/Users/${USER_ID}/Items?SortBy=DatePlayed&SortOrder=Descending&IncludeItemTypes=Audio&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId&IsPlayed=true&Filters=IsPlayed`);
}

export async function getRecentlyAdded(limit = 20) {
  return request(`/Users/${USER_ID}/Items?SortBy=DateCreated&SortOrder=Descending&IncludeItemTypes=Audio&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId`);
}

export async function getRecentPlaylists(limit = 10) {
  return request(`/Users/${USER_ID}/Items?IncludeItemTypes=Playlist&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio`);
}

export async function getTopAlbums(limit = 20) {
  return request(`/Users/${USER_ID}/Items?SortBy=PlayCount&SortOrder=Descending&IncludeItemTypes=MusicAlbum&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio`);
}

export async function getRecentAlbums(limit = 20) {
  return request(`/Users/${USER_ID}/Items?SortBy=DateCreated&SortOrder=Descending&IncludeItemTypes=MusicAlbum&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio`);
}

export async function getPlayHistory(limit = 50) {
  return request(`/Users/${USER_ID}/Items?SortBy=DatePlayed&SortOrder=Descending&IncludeItemTypes=Audio&Limit=${limit}&Recursive=true&IsPlayed=true&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId`);
}

export async function getMostPlayedThisMonth(limit = 20) {
  const start = new Date();
  start.setDate(1); start.setHours(0, 0, 0, 0);
  return request(`/Users/${USER_ID}/Items?SortBy=PlayCount&SortOrder=Descending&IncludeItemTypes=Audio&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId`);
}

export async function getByGenre(genre, limit = 20) {
  return request(`/Users/${USER_ID}/Items?Genres=${encodeURIComponent(genre)}&IncludeItemTypes=Audio&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId`);
}

export async function getAllGenres() {
  return request(`/MusicGenres?UserId=${USER_ID}&Recursive=true&SortBy=SortName`);
}

export async function getAlbums(limit = 200) {
  return request(`/Users/${USER_ID}/Items?IncludeItemTypes=MusicAlbum&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio&SortBy=SortName`);
}

export async function getAlbumTracks(albumId) {
  return request(`/Users/${USER_ID}/Items?ParentId=${albumId}&IncludeItemTypes=Audio&Fields=PrimaryImageAspectRatio,AudioInfo`);
}

export async function getArtists(limit = 200) {
  return request(`/Artists?UserId=${USER_ID}&Limit=${limit}&Fields=PrimaryImageAspectRatio,Overview&SortBy=SortName`);
}

export function getArtistImageUrl(artistId, size = 200) {
  if (!artistId) return null;
  // Jellyfin stores artist images via the Items endpoint, not Artists endpoint
  return `${BASE_URL}/Items/${artistId}/Images/Primary?fillHeight=${size}&fillWidth=${size}&quality=90&api_key=${TOKEN}`;
}

export function getArtistBackdropUrl(artistId) {
  if (!artistId) return null;
  return `${BASE_URL}/Items/${artistId}/Images/Backdrop?fillWidth=800&quality=85&api_key=${TOKEN}`;
}

export async function getAllTracks(limit = 500) {
  return request(`/Users/${USER_ID}/Items?IncludeItemTypes=Audio&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId&SortBy=SortName`);
}

// ── Stations ──────────────────────────────────
export async function getInstantMix(itemId, limit = 50) {
  return request(`/Items/${itemId}/InstantMix?UserId=${USER_ID}&Limit=${limit}&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId`);
}

export async function getVibeRadio(limit = 100) {
  return request(`/Users/${USER_ID}/Items?IncludeItemTypes=Audio&Limit=${limit}&Recursive=true&SortBy=Random&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId`);
}

// ── Search ────────────────────────────────────
export async function search(query, limit = 40) {
  // Search tracks, albums AND artists
  const [items, artists] = await Promise.all([
    request(`/Users/${USER_ID}/Items?SearchTerm=${encodeURIComponent(query)}&IncludeItemTypes=Audio,MusicAlbum&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId`),
    request(`/Artists?UserId=${USER_ID}&SearchTerm=${encodeURIComponent(query)}&Limit=10&Fields=PrimaryImageAspectRatio`),
  ]);
  // Merge artists (marked as MusicArtist type) into results
  const artistItems = (artists.Items || []).map(a => ({ ...a, Type: 'MusicArtist' }));
  return { Items: [...artistItems, ...(items.Items || [])] };
}

// ── Streaming & Images ────────────────────────
export function getStreamUrl(itemId) {
  // Static direct stream for M4A/MP3/FLAC — no transcoding needed
  return `${BASE_URL}/Audio/${itemId}/stream?static=true&api_key=${TOKEN}&UserId=${USER_ID}&Container=m4a,mp3,flac,wav,aac,ogg`;
}

export function getStreamUrlFallback(itemId) {
  // Transcoded AAC stream fallback
  return `${BASE_URL}/Audio/${itemId}/stream?api_key=${TOKEN}&UserId=${USER_ID}&AudioCodec=aac&Container=ts&MaxStreamingBitrate=140000000`;
}

export function getImageUrl(itemId, type = 'Primary', size = 400) {
  if (!itemId) return null;
  return `${BASE_URL}/Items/${itemId}/Images/${type}?fillHeight=${size}&fillWidth=${size}&quality=90&api_key=${TOKEN}`;
}

export function getAlbumImageUrl(track, size = 400) {
  // Try album image first, fall back to track image
  const albumId = track?.AlbumId || track?.ParentId;
  if (albumId) return getImageUrl(albumId, 'Primary', size);
  return getImageUrl(track?.Id, 'Primary', size);
}

// ── Playback Reporting ────────────────────────
export async function reportPlaybackStart(itemId) {
  return fetch(`${BASE_URL}/Sessions/Playing`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ ItemId: itemId, CanSeek: true, IsPaused: false }),
  }).catch(() => {});
}

export async function reportPlaybackProgress(itemId, positionTicks) {
  return fetch(`${BASE_URL}/Sessions/Playing/Progress`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ ItemId: itemId, PositionTicks: positionTicks }),
  }).catch(() => {});
}

export async function reportPlaybackStopped(itemId, positionTicks) {
  return fetch(`${BASE_URL}/Sessions/Playing/Stopped`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ ItemId: itemId, PositionTicks: positionTicks }),
  }).catch(() => {});
}

export async function getAlbumTracks_forMix(albumId, limit = 50) {
  return request(`/Users/${USER_ID}/Items?ParentId=${albumId}&IncludeItemTypes=Audio&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId&SortBy=IndexNumber`);
}

export async function getArtistTracks(artistId, limit = 30) {
  return request(`/Users/${USER_ID}/Items?ArtistIds=${artistId}&IncludeItemTypes=Audio&Recursive=true&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId&SortBy=Random&Limit=${limit}`);
}

export { USER_ID, request };

export async function getArtistDetails(artistId) {
  return request(`/Users/${USER_ID}/Items/${artistId}`);
}

export async function getArtistAlbums(artistId) {
  return request(`/Users/${USER_ID}/Items?AlbumArtistIds=${artistId}&IncludeItemTypes=MusicAlbum&Recursive=true&Fields=PrimaryImageAspectRatio&SortBy=ProductionYear&SortOrder=Descending`);
}

export async function getArtistSingles(artistId) {
  return request(`/Users/${USER_ID}/Items?ArtistIds=${artistId}&IncludeItemTypes=Audio&Recursive=true&Fields=PrimaryImageAspectRatio,AudioInfo,ParentId&SortBy=ProductionYear&SortOrder=Descending&Limit=50`);
}

export async function searchArtists(query) {
  return request(`/Artists?UserId=${USER_ID}&SearchTerm=${encodeURIComponent(query)}&Fields=PrimaryImageAspectRatio&Limit=20`);
}

export async function markPlayed(itemId) {
  return fetch(`${BASE_URL}/Users/${USER_ID}/PlayedItems/${itemId}`, {
    method: 'POST',
    headers: headers(),
  }).catch(() => {});
}
