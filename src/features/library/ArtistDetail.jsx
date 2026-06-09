import { useState, useEffect } from 'react';
import { getArtistAlbums, getArtistTracks, getImageUrl } from './library.api';
import { extractColors as extractColorsUtil } from '../../utils/colorExtract';
import { Icons } from '../../components/Icons';
import { Loader } from '../../components/Loader';
import { PageTransition } from '../../components/PageTransition';
import { SimilarArtists } from './SimilarArtists';

export function ArtistDetail({ artist, onClose, onAlbumSelect, player }) {
  const [albums,  setAlbums]  = useState([]);
  const [colors,  setColors]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    getArtistAlbums(artist.Id).then((r) => { setAlbums(r.Items || []); setLoading(false); });
    const localUrl = `/artists/${artist.Name}.jpg`;
    const img = new Image();
    img.onload = () => extractColorsUtil(localUrl).then(setColors);
    img.onerror = () => {
      getArtistAlbums(artist.Id).then((r) => {
        if (r.Items?.[0]) extractColorsUtil(getImageUrl(r.Items[0].Id, 'Primary', 200)).then(setColors);
      });
    };
    img.src = localUrl;
  }, [artist.Id]);

  const accent  = '#7c3aed'; // Always Vibe purple on artist page — consistent brand
  const primary = colors?.primary?.hex || '#0a0a14';

  const playAll = async () => {
    const r = await getArtistTracks(artist.Id, 100);
    if (!r.Items?.length) return;
    player.play(r.Items, 0); player.setPlayerExpanded(true); onClose();
  };
  const playShuffle = async () => {
    const r = await getArtistTracks(artist.Id, 100);
    if (!r.Items?.length) return;
    player.play([...r.Items].sort(() => Math.random() - 0.5), 0); player.setPlayerExpanded(true); onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
      <PageTransition>
        <div style={{ position: 'absolute', inset: 0, background: '#080810', overflowY: 'auto', scrollbarWidth: 'none' }}>
          {colors && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 500, background: `radial-gradient(ellipse at 50% 0%, ${accent}18, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }} />}

          {/* Hero */}
          <div style={{ position: 'relative', width: '100%', height: 420, overflow: 'hidden' }}>
            <img src={`/artists/${artist.Name}.jpg`} alt={artist.Name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} onError={(e) => { e.target.style.display = 'none'; }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(8,8,16,0.7) 65%, #080810 100%), linear-gradient(to right, rgba(8,8,16,0.4), transparent 40%)` }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: `linear-gradient(to top, ${accent}18, transparent)`, mixBlendMode: 'screen' }} />
            <button onClick={onClose} style={{ position: 'absolute', top: 'calc(14px + env(safe-area-inset-top))', left: 16, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
              {Icons.chevronDown('#f1f5f9')}
            </button>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 22px', zIndex: 5 }}>
              <div style={{ width: 32, height: 3, borderRadius: 2, background: accent, marginBottom: 10, boxShadow: `0 0 12px ${accent}88` }} />
              <h1 style={{ margin: 0, fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: -1.5, lineHeight: 1, textShadow: '0 2px 32px rgba(0,0,0,0.9)' }}>{artist.Name}</h1>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 500, letterSpacing: 0.5 }}>
                {albums.length} {albums.length === 1 ? 'ALBUM' : 'ALBUMS'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div style={{ padding: '20px 20px 12px', display: 'flex', gap: 12, position: 'relative', zIndex: 1 }}>
            <button onClick={playAll} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 30px', background: accent, border: 'none', borderRadius: 30, cursor: 'pointer', color: '#fff', fontSize: 15, fontWeight: 700, boxShadow: `0 4px 28px ${accent}66` }}>
              {Icons.play('#fff')} Play All
            </button>
            <button onClick={playShuffle} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 22px', background: 'rgba(255,255,255,0.08)', border: `1px solid ${accent}30`, borderRadius: 30, cursor: 'pointer', color: '#f1f5f9', fontSize: 15, fontWeight: 600 }}>
              {Icons.shuffle('#f1f5f9')} Shuffle
            </button>
          </div>

          <SimilarArtists artist={artist} onArtistSelect={onAlbumSelect} />

          {/* Discography */}
          <div style={{ padding: '8px 20px 40px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 3, height: 16, borderRadius: 2, background: accent }} />
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Discography</h2>
            </div>
            {loading ? <Loader /> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {albums.map((album) => (
                  <div key={album.Id} onClick={() => onAlbumSelect?.(album)} style={{ cursor: 'pointer' }}>
                    <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 12, overflow: 'hidden', background: '#1e1e2e', marginBottom: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                      <img src={getImageUrl(album.Id, 'Primary', 400)} alt={album.Name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.3 }}>{album.Name}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{album.ProductionYear || ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageTransition>
    </div>
  );
}
