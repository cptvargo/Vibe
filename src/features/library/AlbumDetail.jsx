import { useState, useEffect } from 'react';
import { getAlbumTracks, getImageUrl } from './library.api';
import { extractColors, getCachedColors } from '../../utils/colorExtract';
import { fmtTicks } from '../../utils/format';
import { Icons } from '../../components/Icons';
import { Loader } from '../../components/Loader';
import { PageTransition } from '../../components/PageTransition';
import { isFire, toggleFire } from '../../utils/fireSongs';
import { isAlbumDownloaded, downloadAlbum, removeAlbum } from '../../utils/offlineStorage';
import { Toast, useToast } from '../../components/Toast';
import { vibePlayer } from '../../audio/VibePlayer';

function AlbumTrackRow({ track, index, accent, isActive, onPlay }) {
  const [fire, setFire] = useState(() => isFire(track.Id));
  return (
    <div onClick={onPlay} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', background: isActive ? `${accent}18` : 'transparent', transition: 'background 0.15s' }}>
      <div style={{ width: 24, textAlign: 'center', flexShrink: 0 }}>
        {isActive ? <span style={{ color: accent, fontSize: 14 }}>▶</span> : <span style={{ fontSize: 13, color: '#334155' }}>{track.IndexNumber || index + 1}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: isActive ? '#fff' : '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.Name}</div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); const nowFire = toggleFire(track); setFire(nowFire); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', flexShrink: 0, opacity: fire ? 1 : 0.3, transition: 'opacity 0.15s, transform 0.15s', transform: fire ? 'scale(1.15)' : 'scale(1)' }}
      >
        {Icons.fire(fire)}
      </button>
      <div style={{ fontSize: 12, color: '#334155', flexShrink: 0 }}>{fmtTicks(track.RunTimeTicks)}</div>
    </div>
  );
}

export function AlbumDetail({ album, onClose, onArtistSelect, player }) {
  const [tracks,       setTracks]       = useState([]);
  const [colors,       setColors]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [dlState,      setDlState]      = useState('none'); // 'none' | 'downloading' | 'done'
  const [dlProgress,   setDlProgress]   = useState(0);     // 0–1
  const { toastMessage, toastVisible, showToast } = useToast();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    getAlbumTracks(album.Id).then((r) => { const items = r.Items || []; setTracks(items); setLoading(false); if (items[0]) vibePlayer.prime(items[0]); });
    isAlbumDownloaded(album.Id).then(dl => { if (dl) setDlState('done'); });
    // Use 200px — same key AlbumCard primes, so cache is usually warm before this opens
    const extractUrl = getImageUrl(album.Id, 'Primary', 200);
    const cached = getCachedColors(extractUrl);
    if (cached) { setColors(cached); } else { extractColors(extractUrl).then(setColors); }
  }, [album.Id]);

  const accent  = colors?.vibrant?.hex || '#2a2a3e'; // neutral dark until extracted
  const primary = colors?.primary?.hex || '#0a0a14';
  const imgUrl  = getImageUrl(album.Id, 'Primary', 600);
  const total   = tracks.reduce((s, t) => s + (t.RunTimeTicks || 0), 0);

  const playAll     = (idx = 0) => { if (!tracks.length) return; player.play(tracks, idx); player.setPlayerExpanded(true); onClose(); };
  const playShuffle = ()       => { if (!tracks.length) return; player.play([...tracks].sort(() => Math.random() - 0.5), 0); player.setPlayerExpanded(true); onClose(); };

  const handleDownload = async () => {
    if (loading || !tracks.length) return;
    setDlState('downloading'); setDlProgress(0);
    await downloadAlbum(album, tracks, (done, total) => setDlProgress(done / total));
    setDlState('done');
    showToast(`${album.Name} saved offline`);
  };
  const handleRemove = async () => {
    await removeAlbum(album.Id);
    setDlState('none'); setDlProgress(0);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
      <PageTransition>
        <div style={{ position: 'absolute', inset: 0, background: '#080810', overflowY: 'auto', scrollbarWidth: 'none' }}>
          <div style={{ position: 'relative', width: '100%', paddingTop: 'env(safe-area-inset-top)' }}>
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
              <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3, filter: 'blur(40px)', transform: 'scale(1.1)' }} />
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${primary}99 0%, #080810 100%)` }} />
            </div>
            <button onClick={onClose} style={{ position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', left: 16, zIndex: 10, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {Icons.chevronDown('#f1f5f9')}
            </button>
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px 0' }}>
              <div style={{ width: '65%', maxWidth: 260, aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden', boxShadow: `0 24px 60px ${accent}44`, marginBottom: 20 }}>
                <img src={imgUrl} alt={album.Name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f8fafc', textAlign: 'center', letterSpacing: -0.5 }}>{album.Name}</h1>
              <p onClick={() => onArtistSelect?.({ Id: album.AlbumArtistId, Name: album.AlbumArtist })} style={{ margin: '6px 0 0', fontSize: 15, color: 'rgba(255,255,255,0.65)', fontWeight: 500, cursor: 'pointer' }}>{album.AlbumArtist}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                {album.ProductionYear && `${album.ProductionYear} · `}{tracks.length} songs · {fmtTicks(total)}
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 20, marginBottom: 8, alignItems: 'center' }}>
                <button onClick={() => playAll(0)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: loading ? 'rgba(255,255,255,0.1)' : accent, border: 'none', borderRadius: 30, cursor: loading ? 'default' : 'pointer', color: '#fff', fontSize: 15, fontWeight: 700, boxShadow: loading ? 'none' : `0 4px 24px ${accent}55`, transition: 'background 0.2s' }}>
                  {loading ? '…' : <>{Icons.play('#fff')} Play</>}
                </button>
                <button onClick={playShuffle} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 30, cursor: loading ? 'default' : 'pointer', color: '#f1f5f9', fontSize: 15, fontWeight: 600, opacity: loading ? 0.4 : 1 }}>
                  {Icons.shuffle('#f1f5f9')} Shuffle
                </button>
                {/* Download button */}
                <button
                  onClick={dlState === 'done' ? handleRemove : handleDownload}
                  disabled={dlState === 'downloading' || loading}
                  style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: dlState === 'done' ? `${accent}22` : 'rgba(255,255,255,0.08)', cursor: dlState === 'downloading' ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', transition: 'background 0.3s' }}
                >
                  {dlState === 'done' && Icons.cloudDone(accent)}
                  {dlState === 'none' && Icons.cloudDownload('rgba(255,255,255,0.7)')}
                  {dlState === 'downloading' && (
                    <>
                      {Icons.cloudDownload('rgba(255,255,255,0.35)')}
                      <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', pointerEvents: 'none' }}>
                        <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                        <circle cx="22" cy="22" r="19" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 19}`}
                          strokeDashoffset={`${2 * Math.PI * 19 * (1 - dlProgress)}`}
                          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                        />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div style={{ padding: '16px 16px 120px' }}>
            {loading ? <Loader /> : tracks.map((t, i) => <AlbumTrackRow key={t.Id} track={t} index={i} accent={accent} isActive={player.currentTrack?.Id === t.Id} onPlay={() => playAll(i)} />)}
          </div>
        </div>
      </PageTransition>
      <Toast message={toastMessage} visible={toastVisible} />
    </div>
  );
}
