const KEY = 'vibe_fire_songs';

export function getFireSongs() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function isFire(id) {
  return getFireSongs().some((s) => s.Id === id);
}

export function toggleFire(track) {
  const songs = getFireSongs();
  const idx   = songs.findIndex((s) => s.Id === track.Id);
  if (idx >= 0) songs.splice(idx, 1);
  else songs.push({
    Id: track.Id, Name: track.Name,
    AlbumArtist: track.AlbumArtist || track.Artists?.[0],
    Artists: track.Artists || [],
    Album: track.Album, AlbumId: track.AlbumId,
    RunTimeTicks: track.RunTimeTicks || 0,
  });
  try { localStorage.setItem(KEY, JSON.stringify(songs)); } catch {}
  return idx < 0; // returns true if it was added (now fire)
}
