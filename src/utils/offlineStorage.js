import { getStreamUrl } from '../api/jellyfin';

const DB_NAME    = 'vibe_offline';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('tracks')) db.createObjectStore('tracks', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('albums')) db.createObjectStore('albums', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbGet(db, store, key) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbPut(db, store, value) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).put(value);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

function idbDelete(db, store, key) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

function idbGetAll(db, store) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// Blob URL cache — created once per session, revoked when no longer needed
const _blobCache = new Map();

export async function getOfflineUrl(trackId) {
  if (_blobCache.has(trackId)) return _blobCache.get(trackId);
  try {
    const db    = await openDB();
    const entry = await idbGet(db, 'tracks', trackId);
    if (!entry) return null;
    const blob = new Blob([entry.data], { type: 'audio/mp4' });
    const url  = URL.createObjectURL(blob);
    _blobCache.set(trackId, url);
    return url;
  } catch { return null; }
}

export async function isAlbumDownloaded(albumId) {
  try {
    const db = await openDB();
    const a  = await idbGet(db, 'albums', albumId);
    return !!a;
  } catch { return false; }
}

export async function getDownloadedAlbumIds() {
  try {
    const db      = await openDB();
    const albums  = await idbGetAll(db, 'albums');
    return new Set(albums.map(a => a.id));
  } catch { return new Set(); }
}

export async function downloadAlbum(album, tracks, onProgress) {
  const db   = await openDB();
  let done   = 0;
  const total = tracks.length;

  for (const track of tracks) {
    try {
      const existing = await idbGet(db, 'tracks', track.Id);
      if (!existing) {
        const res    = await fetch(getStreamUrl(track.Id));
        if (!res.ok) throw new Error('fetch failed');
        const buffer = await res.arrayBuffer();
        await idbPut(db, 'tracks', { id: track.Id, data: buffer, albumId: album.Id, ts: Date.now() });
      }
    } catch (e) {
      console.warn('[Vibe] Failed to download track:', track.Name, e);
    }
    done++;
    onProgress?.(done, total);
  }

  await idbPut(db, 'albums', {
    id: album.Id,
    name: album.Name,
    artist: album.AlbumArtist,
    trackIds: tracks.map(t => t.Id),
    ts: Date.now(),
  });
}

export async function removeAlbum(albumId) {
  try {
    const db    = await openDB();
    const album = await idbGet(db, 'albums', albumId);
    if (!album) return;
    for (const trackId of (album.trackIds || [])) {
      await idbDelete(db, 'tracks', trackId);
      if (_blobCache.has(trackId)) {
        URL.revokeObjectURL(_blobCache.get(trackId));
        _blobCache.delete(trackId);
      }
    }
    await idbDelete(db, 'albums', albumId);
  } catch (e) { console.warn('[Vibe] Failed to remove album:', e); }
}
