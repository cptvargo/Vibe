import { useState, useEffect } from 'react';
import { getAlbums, getAllTracks, getAlbumTracks } from './library.api';
import { AlbumCard } from '../../components/AlbumCard';
import { TrackRow } from '../../components/TrackRow';
import { Loader } from '../../components/Loader';

export function LibraryView({ player, onAlbumSelect, playAndExpand }) {
  const [tab,     setTab]     = useState('albums');
  const [albums,  setAlbums]  = useState([]);
  const [tracks,  setTracks]  = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    (tab === 'albums'
      ? getAlbums(300).then((r) => setAlbums(r.Items || []))
      : getAllTracks(500).then((r) => setTracks(r.Items || []))
    ).finally(() => setLoading(false));
  }, [tab]);

  const playAlbum = async (a) => {
    const r = await getAlbumTracks(a.Id);
    if (r.Items?.length) playAndExpand(r.Items, 0);
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#f8fafc' }}>Library</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['albums', 'tracks'].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', background: tab === t ? '#7c3aed' : 'rgba(255,255,255,0.07)', color: tab === t ? '#fff' : '#64748b', fontSize: 13, fontWeight: 500, transition: 'all 0.2s', textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>
      {loading && <Loader />}
      {tab === 'albums' && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 20 }}>
          {albums.map((a) => (
            <AlbumCard key={a.Id} item={a} size={140} onPlay={() => (onAlbumSelect ? onAlbumSelect(a) : playAlbum(a))} />
          ))}
        </div>
      )}
      {tab === 'tracks' && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tracks.map((t, i) => (
            <TrackRow key={t.Id} track={t} index={i} onPlay={() => playAndExpand(tracks, i)} isActive={player.currentTrack?.Id === t.Id} />
          ))}
        </div>
      )}
    </div>
  );
}
