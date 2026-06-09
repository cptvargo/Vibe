// IndexedDB schema and low-level read/write operations.
// Nothing in here knows about tracks, artists, or app logic.

const DB_NAME    = 'vibe-analytics';
const DB_VERSION = 1;
const STORE      = 'plays';

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db    = e.target.result;
      const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      store.createIndex('artistId',  'artistId',  { unique: false });
      store.createIndex('trackId',   'trackId',   { unique: false });
      store.createIndex('timestamp', 'timestamp', { unique: false });
    };

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror   = ()  => reject(req.error);
  });
}

export async function dbAdd(play) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).add(play);
    req.onsuccess = () => resolve(req.result); // returns the auto-incremented id
    req.onerror   = () => reject(req.error);
  });
}

export async function dbPatch(id, patch) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const get   = store.get(id);
    get.onsuccess = () => {
      if (!get.result) return resolve(); // record disappeared (shouldn't happen)
      const put = store.put({ ...get.result, ...patch });
      put.onsuccess = () => resolve();
      put.onerror   = () => reject(put.error);
    };
    get.onerror = () => reject(get.error);
  });
}

export async function dbGetByArtist(artistId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readonly');
    const index = tx.objectStore(STORE).index('artistId');
    const req   = index.getAll(IDBKeyRange.only(artistId));
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function dbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
