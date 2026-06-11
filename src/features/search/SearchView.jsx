import { useState, useEffect, useRef } from 'react';
import { getAllGenres, search, getAlbumTracks } from '../library/library.api';
import { AlbumCard } from '../../components/AlbumCard';
import { TrackRow } from '../../components/TrackRow';
import { ScrollRow, SectionHeader } from '../../components/Shelf';
import { Loader } from '../../components/Loader';
import { Icons } from '../../components/Icons';

const GENRE_COLORS = ['#7c3aed', '#2563eb', '#d97706', '#ef4444', '#059669', '#ec4899', '#0891b2', '#7c3aed'];

export function SearchView({ player, onAlbumSelect, onArtistSelect, playAndExpand }) {
  const [q,         setQ]         = useState('');
  const [results,   setResults]   = useState([]);
  const [genres,    setGenres]    = useState([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef(null);

  useEffect(() => { getAllGenres().then((r) => setGenres((r.Items || []).slice(0, 12))); }, []);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      const res = await search(q, 40);
      setResults(res.Items || []);
      setSearching(false);
    }, 350);
  }, [q]);

  const tracks  = results.filter((r) => r.Type === 'Audio');
  const albums  = results.filter((r) => r.Type === 'MusicAlbum');
  const artists = results.filter((r) => r.Type === 'MusicArtist');

  const playAlbum = async (a) => {
    const r = await getAlbumTracks(a.Id);
    if (r.Items?.length) playAndExpand(r.Items, 0);
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#f8fafc' }}>Search</h2>
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>{Icons.search('#475569')}</div>
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Songs, artists, albums..."
          style={{ width: '100%', padding: '12px 16px 12px 46px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#f1f5f9', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {!q && genres.length > 0 && (
        <div>
          <p style={{ color: '#475569', fontSize: 13, marginBottom: 12 }}>Browse by genre</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {genres.map((g, i) => {
              const c = GENRE_COLORS[i % GENRE_COLORS.length];
              return (
                <button key={g.Id} onClick={() => setQ(g.Name)} style={{ background: `${c}20`, border: `1px solid ${c}40`, borderRadius: 20, padding: '7px 16px', color: c, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  {g.Name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {searching && <Loader />}

      {artists.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="Artists" />
          <ScrollRow gap={20}>
            {artists.map((a) => (
              <div key={a.Id} onClick={() => onArtistSelect?.(a)} style={{ flexShrink: 0, width: 90, cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', background: '#1e1e2e', marginBottom: 8 }}>
                  <img src={`${import.meta.env.BASE_URL}artists/${a.Name}.jpg`} alt={a.Name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
                    onError={(e) => { e.target.src = `${import.meta.env.BASE_URL}artists/${encodeURIComponent(a.Name)}.jpg`; e.target.onerror = () => { e.target.style.display = 'none'; }; }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#f1f5f9', lineHeight: 1.3 }}>{a.Name}</div>
              </div>
            ))}
          </ScrollRow>
        </div>
      )}

      {albums.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="Albums" />
          <ScrollRow>
            {albums.map((a) => <AlbumCard key={a.Id} item={a} size={130} onPlay={() => (onAlbumSelect ? onAlbumSelect(a) : playAlbum(a))} />)}
          </ScrollRow>
        </div>
      )}

      {tracks.length > 0 && (
        <div>
          <SectionHeader title="Songs" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tracks.map((t, i) => <TrackRow key={t.Id} track={t} index={i} onPlay={() => playAndExpand(tracks, i)} isActive={player.currentTrack?.Id === t.Id} />)}
          </div>
        </div>
      )}

      {q && !searching && results.length === 0 && (
        <p style={{ color: '#475569', textAlign: 'center', marginTop: 48 }}>No results for "{q}"</p>
      )}
    </div>
  );
}
