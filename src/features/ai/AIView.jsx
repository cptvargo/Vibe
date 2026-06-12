import { useState, useEffect } from 'react';
import { getAIAlbums, getAIArtists, getAITracks, getAlbumTracks, getImageUrl } from './ai.api';
import { AlbumCard } from '../../components/AlbumCard';
import { TrackRow } from '../../components/TrackRow';
import { ScrollRow } from '../../components/Shelf';
import { Loader } from '../../components/Loader';
import { Icons } from '../../components/Icons';

const SW_MAGENTA = '#e040fb';
const SW_CYAN    = '#18ffff';
const SW_PURPLE  = '#9c27b0';

const imgName = (name) => name.replace(/Æ/g, 'AE').replace(/æ/g, 'ae');

function AIHeader({ title }) {
  return (
    <h2 style={{
      margin: '0 0 14px', fontSize: 17, fontWeight: 700, letterSpacing: -0.3,
      background: `linear-gradient(90deg, ${SW_MAGENTA}, ${SW_CYAN})`,
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      display: 'inline-block',
    }}>
      {title}
    </h2>
  );
}

export function AIView({ player, onAlbumSelect, onArtistSelect, playAndExpand }) {
  const [albums,  setAlbums]  = useState([]);
  const [artists, setArtists] = useState([]);
  const [tracks,  setTracks]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [a, ar, t] = await Promise.all([getAIAlbums(), getAIArtists(), getAITracks()]);
        setAlbums(a.Items || []);
        setArtists(ar.Items || []);
        setTracks(t.Items || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const playAll  = () => { if (tracks.length) playAndExpand(tracks, 0); };
  const shuffle  = () => { if (tracks.length) playAndExpand([...tracks].sort(() => Math.random() - 0.5), 0); };
  const playAlbum = async (album) => {
    const r = await getAlbumTracks(album.Id);
    if (r.Items?.length) playAndExpand(r.Items, 0);
  };

  if (loading) return <div style={{ padding: '32px 0' }}><Loader /></div>;

  const featured = albums[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Synthwave grid overlay — unmounts when tab changes */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(224,64,251,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(24,255,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: '36px 36px',
      }} />
      {/* Synthwave horizon glow at the bottom */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: '35%',
        zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 120%, ${SW_PURPLE}30 0%, transparent 65%)`,
      }} />

      {/* Hero */}
      {featured && (
        <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', minHeight: 220 }}>
          {/* blurred album art bg */}
          <img
            src={getImageUrl(featured.Id, 'Primary', 600)} alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(28px) brightness(0.45)', transform: 'scale(1.1)' }}
          />
          {/* synthwave gradient overlay */}
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, rgba(156,39,176,0.6) 0%, rgba(0,0,0,0.4) 50%, rgba(0,229,255,0.15) 100%)` }} />
          {/* scanlines */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 20, padding: '28px 22px 24px', alignItems: 'flex-end' }}>
            {/* Square art */}
            <div style={{ width: 110, height: 110, flexShrink: 0, borderRadius: 12, overflow: 'hidden', boxShadow: `0 0 0 1px ${SW_MAGENTA}55, 0 8px 32px rgba(0,0,0,0.6)` }}>
              <img src={getImageUrl(featured.Id, 'Primary', 220)} alt={featured.Name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: SW_CYAN, marginBottom: 6, textShadow: `0 0 10px ${SW_CYAN}` }}>
                AI Generated
              </div>
              <h1 style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 900, letterSpacing: -0.5, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {featured.Name}
              </h1>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                {featured.AlbumArtist}{tracks.length > 0 && ` · ${tracks.length} tracks`}
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={playAll} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', background: SW_MAGENTA, border: 'none', borderRadius: 30, cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: `0 4px 20px ${SW_MAGENTA}55`, flexShrink: 0 }}>
                  {Icons.play('#fff')} Play All
                </button>
                <button onClick={shuffle} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 30, cursor: 'pointer', color: '#f1f5f9', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                  {Icons.shuffle('#f1f5f9')} Shuffle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Artists */}
      {artists.length > 0 && (
        <div>
          <AIHeader title="Artists" />
          <ScrollRow gap={20}>
            {artists.map((a) => (
              <div key={a.Id} onClick={() => onArtistSelect?.({ Id: a.Id, Name: a.Name, _theme: 'synthwave', _aiArtistIds: artists.map(x => x.Id) })} style={{ flexShrink: 0, width: 90, textAlign: 'center', cursor: 'pointer' }}>
                <div style={{
                  width: 90, height: 90, borderRadius: '50%', overflow: 'hidden',
                  background: '#1a0030', marginBottom: 8,
                  boxShadow: `0 0 0 2px ${SW_MAGENTA}55, 0 4px 20px ${SW_MAGENTA}30`,
                }}>
                  <img
                    src={`${import.meta.env.BASE_URL}artists/${imgName(a.Name)}.png`}
                    alt={a.Name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
                    onError={(e) => { e.target.src = `${import.meta.env.BASE_URL}artists/${imgName(a.Name)}.jpg`; e.target.onerror = () => { e.target.style.display = 'none'; }; }}
                  />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.3 }}>{a.Name}</div>
                <div style={{ fontSize: 10, color: SW_CYAN, marginTop: 2, letterSpacing: 1, textTransform: 'uppercase', textShadow: `0 0 8px ${SW_CYAN}` }}>AI Artist</div>
              </div>
            ))}
          </ScrollRow>
        </div>
      )}

      {/* Albums row */}
      {albums.length > 0 && (
        <div>
          <AIHeader title="Albums" />
          <ScrollRow>
            {albums.map((a) => (
              <div key={a.Id} style={{ flexShrink: 0, position: 'relative' }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 14, zIndex: 1, pointerEvents: 'none',
                  boxShadow: `0 0 0 1px ${SW_MAGENTA}33, 0 6px 20px ${SW_MAGENTA}18`,
                }} />
                <AlbumCard item={a} size={140} onPlay={() => onAlbumSelect(a)} />
              </div>
            ))}
          </ScrollRow>
        </div>
      )}

      {/* Track list */}
      {tracks.length > 0 && (
        <div style={{ marginBottom: 80 }}>
          <AIHeader title="Tracks" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tracks.map((t, i) => (
              <TrackRow
                key={t.Id} track={t} index={i}
                onPlay={() => playAndExpand(tracks, i)}
                isActive={player.currentTrack?.Id === t.Id}
                accent={SW_MAGENTA}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && albums.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 13, color: '#475569' }}>No AI music found</div>
        </div>
      )}

    </div>
  );
}
