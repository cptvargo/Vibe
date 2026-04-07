import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getRecentlyPlayed, getRecentlyAdded, getRecentPlaylists,
  getTopAlbums, getRecentAlbums, getMostPlayedThisMonth,
  getPlayHistory, getAllGenres, getByGenre, getVibeRadio,
  getInstantMix, getAlbums, getAllTracks, getAlbumTracks,
  search, getStreamUrl, getImageUrl, getAlbumImageUrl,
} from './api/jellyfin';
import { useVibePlayer } from './hooks/useVibePlayer';
import { extractColors } from './utils/colorExtract';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (s) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const fmtTicks = (t) => fmtTime((t || 0) / 10000000);

// ─── Album Art ────────────────────────────────────────────────────────────────
function AlbumArt({ track, album, size = 56, radius = 8, style = {} }) {
  const [colors, setColors] = useState(null);
  const imgUrl = track ? getAlbumImageUrl(track, size * 2) : album ? getImageUrl(album.Id, 'Primary', size * 2) : null;

  useEffect(() => {
    if (imgUrl) extractColors(imgUrl).then(setColors);
  }, [imgUrl]);

  const bg = colors
    ? `radial-gradient(ellipse at top left, ${colors.vibrant.hex}44 0%, ${colors.primary.hex} 60%)`
    : 'radial-gradient(ellipse at top left, #3730a344, #1e1e2e)';

  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      overflow: 'hidden', background: bg, ...style,
    }}>
      {imgUrl && (
        <img src={imgUrl} alt="" width={size} height={size}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.style.display = 'none'; }} />
      )}
    </div>
  );
}

// ─── Waveform ─────────────────────────────────────────────────────────────────
function Waveform({ isPlaying, accent = '#7c3aed', progress = 0, getWaveform }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const phaseRef  = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const bars = 64;

    const draw = () => {
      ctx2d.clearRect(0, 0, W, H);
      phaseRef.current += isPlaying ? 0.035 : 0;

      // Try real analyser data first
      const real = getWaveform ? getWaveform() : null;

      for (let i = 0; i < bars; i++) {
        const x = i * (W / bars);
        const barW = (W / bars) - 1.5;
        const played = i / bars < progress;

        let h;
        if (real && real[i] > 0) {
          h = Math.max(3, (real[i] / 255) * H * 0.9);
        } else {
          const wave =
            Math.sin(i * 0.28 + phaseRef.current) * 0.35 +
            Math.sin(i * 0.65 + phaseRef.current * 1.4) * 0.35 +
            Math.sin(i * 0.12 + phaseRef.current * 0.6) * 0.3;
          h = Math.max(3, (0.45 + wave * 0.55) * H * 0.85);
        }

        const y = (H - h) / 2;
        ctx2d.fillStyle = played ? accent : `${accent}40`;
        ctx2d.beginPath();
        ctx2d.roundRect(x, y, barW, h, 2);
        ctx2d.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, accent, progress, getWaveform]);

  return (
    <canvas ref={canvasRef} width={600} height={72}
      style={{ width: '100%', height: 72, display: 'block', cursor: 'pointer' }} />
  );
}

// ─── Track Row ────────────────────────────────────────────────────────────────
function TrackRow({ track, onPlay, isActive, index }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={() => onPlay(track)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
        borderRadius: 10, cursor: 'pointer',
        background: isActive ? 'rgba(124,58,237,0.12)' : hover ? 'rgba(255,255,255,0.04)' : 'transparent',
        transition: 'background 0.15s',
      }}>
      {index !== undefined && (
        <span style={{ width: 20, textAlign: 'right', fontSize: 12, color: '#334155', flexShrink: 0 }}>
          {isActive ? '▶' : index + 1}
        </span>
      )}
      <AlbumArt track={track} size={44} radius={6} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500,
          color: isActive ? '#a78bfa' : '#f1f5f9',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{track.Name}</div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>
          {track.AlbumArtist || track.Artists?.[0]} · {track.Album}
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#334155', flexShrink: 0 }}>{fmtTicks(track.RunTimeTicks)}</div>
    </div>
  );
}

// ─── Album Card ───────────────────────────────────────────────────────────────
function AlbumCard({ item, onPlay, size = 150 }) {
  const [hover, setHover] = useState(false);
  const imgUrl = getImageUrl(item.Id, 'Primary', size * 2);

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={onPlay} style={{ flexShrink: 0, cursor: 'pointer', width: size }}>
      <div style={{
        width: size, height: size, borderRadius: 12, overflow: 'hidden',
        background: '#1e1e2e', position: 'relative',
        transform: hover ? 'scale(1.04)' : 'scale(1)',
        boxShadow: hover ? '0 12px 40px rgba(0,0,0,0.5)' : 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}>
        <img src={imgUrl} alt={item.Name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none'; }} />
        {hover && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.95)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>▶</div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: '#f1f5f9', lineHeight: 1.3 }}>{item.Name}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.AlbumArtist || item.Name}</div>
    </div>
  );
}

// ─── Station Card ─────────────────────────────────────────────────────────────
function StationCard({ icon, title, subtitle, accent, onPlay }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={onPlay} style={{
        flexShrink: 0, width: 160, borderRadius: 14, padding: 16,
        background: `linear-gradient(135deg, ${accent}28, ${accent}0a)`,
        border: `1px solid ${accent}30`, cursor: 'pointer',
        transform: hover ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hover ? `0 10px 32px ${accent}30` : 'none',
        transition: 'all 0.2s',
      }}>
      <div style={{ fontSize: 30, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 11, color: '#64748b' }}>{subtitle}</div>
    </div>
  );
}

// ─── Scroll Row ───────────────────────────────────────────────────────────────
function ScrollRow({ children, gap = 16 }) {
  return (
    <div style={{
      display: 'flex', gap, overflowX: 'auto', paddingBottom: 8,
      scrollbarWidth: 'none',
    }}>{children}</div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f1f5f9', letterSpacing: -0.3 }}>{title}</h2>
      {subtitle && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>{subtitle}</p>}
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────
function Loader() {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '16px 0' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%', background: '#7c3aed',
          animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
        }} />
      ))}
      <style>{`@keyframes bounce { from { transform: translateY(0); opacity: 0.4; } to { transform: translateY(-8px); opacity: 1; } }`}</style>
    </div>
  );
}

// ─── Mini Player ──────────────────────────────────────────────────────────────
function MiniPlayer({ track, isPlaying, progress, onToggle, onNext, onPrev, onExpand }) {
  const [accent, setAccent] = useState('#7c3aed');
  useEffect(() => {
    if (track) {
      const url = getAlbumImageUrl(track, 100);
      extractColors(url).then(c => setAccent(c.vibrant.hex));
    }
  }, [track?.Id]);

  if (!track) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)', maxWidth: 700,
      background: 'rgba(12,12,20,0.94)', backdropFilter: 'blur(24px)',
      borderRadius: 18, border: `1px solid ${accent}30`,
      boxShadow: `0 8px 48px rgba(0,0,0,0.7), 0 0 0 1px ${accent}12`,
      zIndex: 100, padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div onClick={onExpand} style={{ cursor: 'pointer', flexShrink: 0 }}>
        <AlbumArt track={track} size={44} radius={8} />
      </div>
      <div onClick={onExpand} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.Name}</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>{track.AlbumArtist || track.Artists?.[0]}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button onClick={onPrev} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}>⏮</button>
        <button onClick={onToggle} style={{
          width: 40, height: 40, borderRadius: '50%', background: accent,
          border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 20px ${accent}60`,
        }}>{isPlaying ? '⏸' : '▶'}</button>
        <button onClick={onNext} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}>⏭</button>
      </div>
      {/* Progress line */}
      <div style={{ position: 'absolute', bottom: 0, left: 16, right: 16, height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
        <div style={{ height: '100%', background: accent, borderRadius: 2, width: `${progress * 100}%`, transition: 'width 0.25s linear' }} />
      </div>
    </div>
  );
}

// ─── Full Player ──────────────────────────────────────────────────────────────
function FullPlayer({ track, isPlaying, progress, currentTime, duration, volume, isShuffle, repeatMode,
  onToggle, onNext, onPrev, onSeek, onVolume, onShuffle, onRepeat, onClose, getWaveform }) {

  const [colors, setColors] = useState(null);
  useEffect(() => {
    if (track) {
      const url = getAlbumImageUrl(track, 200);
      extractColors(url).then(setColors);
    }
  }, [track?.Id]);

  if (!track) return null;
  const accent = colors?.vibrant?.hex || '#7c3aed';
  const bg1    = colors?.primary?.hex || '#0f0a1e';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: `radial-gradient(ellipse at 25% 15%, ${accent}55 0%, ${bg1} 50%, #080810 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px 28px',
      fontFamily: "'Outfit', sans-serif",
    }}>
      {/* Close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 20, left: 20,
        background: 'rgba(255,255,255,0.08)', border: 'none',
        color: '#f1f5f9', width: 36, height: 36, borderRadius: '50%',
        cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>‹</button>

      {/* Album Art */}
      <div style={{
        borderRadius: 22,
        boxShadow: `0 32px 80px ${accent}55, 0 0 0 1px ${accent}22`,
        marginBottom: 30, overflow: 'hidden',
        animation: isPlaying ? 'none' : 'none',
      }}>
        <AlbumArt track={track} size={240} radius={22} />
      </div>

      {/* Track info */}
      <div style={{ textAlign: 'center', marginBottom: 24, width: '100%', maxWidth: 500 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', letterSpacing: -0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.Name}</div>
        <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{track.AlbumArtist || track.Artists?.[0]} · {track.Album}</div>
      </div>

      {/* Waveform */}
      <div style={{ width: '100%', maxWidth: 520, marginBottom: 6 }}>
        <Waveform isPlaying={isPlaying} accent={accent} progress={progress} getWaveform={getWaveform} />
      </div>

      {/* Seek */}
      <div style={{ width: '100%', maxWidth: 520, marginBottom: 22 }}>
        <input type="range" min={0} max={duration || 1} step={0.1} value={currentTime}
          onChange={e => onSeek(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: accent }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#334155', marginTop: 4 }}>
          <span>{fmtTime(currentTime)}</span>
          <span>{fmtTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
        <button onClick={onShuffle} title="Shuffle" style={{
          background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
          color: isShuffle ? accent : '#334155', transition: 'color 0.2s',
        }}>⇄</button>
        <button onClick={onPrev} style={{
          background: 'rgba(255,255,255,0.08)', border: 'none',
          color: '#f1f5f9', width: 50, height: 50, borderRadius: '50%',
          fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>⏮</button>
        <button onClick={onToggle} style={{
          width: 70, height: 70, borderRadius: '50%',
          background: accent, border: 'none', color: '#fff',
          fontSize: 28, cursor: 'pointer',
          boxShadow: `0 0 48px ${accent}88, 0 0 96px ${accent}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.1s',
        }}>{isPlaying ? '⏸' : '▶'}</button>
        <button onClick={onNext} style={{
          background: 'rgba(255,255,255,0.08)', border: 'none',
          color: '#f1f5f9', width: 50, height: 50, borderRadius: '50%',
          fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>⏭</button>
        <button onClick={onRepeat} title={`Repeat: ${repeatMode}`} style={{
          background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
          color: repeatMode !== 'none' ? accent : '#334155', transition: 'color 0.2s',
          position: 'relative',
        }}>
          {repeatMode === 'one' ? '🔂' : '🔁'}
          {repeatMode !== 'none' && (
            <span style={{
              position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
              width: 4, height: 4, borderRadius: '50%', background: accent, display: 'block',
            }} />
          )}
        </button>
      </div>

      {/* Volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: 300 }}>
        <span style={{ fontSize: 14, color: '#475569' }}>🔈</span>
        <input type="range" min={0} max={1} step={0.01} value={volume}
          onChange={e => onVolume(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: accent }} />
        <span style={{ fontSize: 14, color: '#475569' }}>🔊</span>
      </div>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function NavBar({ active, onChange }) {
  const items = [
    { id: 'home', label: 'Home', icon: '⌂' },
    { id: 'search', label: 'Search', icon: '◎' },
    { id: 'library', label: 'Library', icon: '▤' },
  ];
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', padding: '0 20px', height: 56,
    }}>
      <div style={{
        fontSize: 22, fontWeight: 800, letterSpacing: -1, marginRight: 28,
        background: 'linear-gradient(135deg, #f8fafc 30%, #7c3aed)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>Vibe</div>
      <div style={{ display: 'flex', gap: 4, flex: 1 }}>
        {items.map(item => (
          <button key={item.id} onClick={() => onChange(item.id)} style={{
            background: active === item.id ? 'rgba(124,58,237,0.15)' : 'none',
            border: 'none', borderRadius: 8,
            color: active === item.id ? '#a78bfa' : '#475569',
            padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{item.icon}</span><span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function HomeView({ player }) {
  const [recentPlayed,  setRecentPlayed]  = useState([]);
  const [recentAdded,   setRecentAdded]   = useState([]);
  const [playlists,     setPlaylists]     = useState([]);
  const [topAlbums,     setTopAlbums]     = useState([]);
  const [recentAlbums,  setRecentAlbums]  = useState([]);
  const [mostPlayed,    setMostPlayed]    = useState([]);
  const [history,       setHistory]       = useState([]);
  const [genres,        setGenres]        = useState([]);
  const [genreTracks,   setGenreTracks]   = useState([]);
  const [activeGenre,   setActiveGenre]   = useState(null);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [rp, ra, pl, ta, ral, mp, h, g] = await Promise.all([
          getRecentlyPlayed(12),
          getRecentlyAdded(12),
          getRecentPlaylists(6),
          getTopAlbums(12),
          getRecentAlbums(12),
          getMostPlayedThisMonth(12),
          getPlayHistory(20),
          getAllGenres(),
        ]);
        setRecentPlayed(rp.Items || []);
        setRecentAdded(ra.Items || []);
        setPlaylists(pl.Items || []);
        setTopAlbums(ta.Items || []);
        setRecentAlbums(ral.Items || []);
        setMostPlayed(mp.Items || []);
        setHistory(h.Items || []);
        setGenres((g.Items || []).slice(0, 8));
        // Load first genre
        if (g.Items?.length) {
          const first = g.Items[0];
          setActiveGenre(first.Name);
          const gt = await getByGenre(first.Name, 8);
          setGenreTracks(gt.Items || []);
        }
      } catch(e) { console.error('Home load error:', e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleGenre = async (name) => {
    setActiveGenre(name);
    const gt = await getByGenre(name, 8);
    setGenreTracks(gt.Items || []);
  };

  const playTracks = (tracks, idx = 0) => player.play(tracks, idx);
  const playAlbum  = async (album) => {
    const res = await getAlbumTracks(album.Id);
    if (res.Items?.length) player.play(res.Items, 0);
  };
  const playRadio  = async () => {
    const res = await getVibeRadio(100);
    if (res.Items?.length) player.play(res.Items, 0);
  };
  const playMix = async (itemId) => {
    const res = await getInstantMix(itemId, 50);
    if (res.Items?.length) player.play(res.Items, 0);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <div style={{ padding: '32px 0' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', marginBottom: 8 }}>{greeting}, Zeus 👋</h1>
      <Loader />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#f8fafc', letterSpacing: -0.8 }}>
          {greeting}, Zeus 👋
        </h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 14 }}>Ready to vibe?</p>
      </div>

      {/* Recently Played — falls back to Recently Added on first load */}
      {(recentPlayed.length > 0 || recentAdded.length > 0) && (
        <div>
          <SectionHeader title={recentPlayed.length > 0 ? 'Recently Played' : 'Jump Back In'} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(recentPlayed.length > 0 ? recentPlayed : recentAdded).map((t, i) => {
              const list = recentPlayed.length > 0 ? recentPlayed : recentAdded;
              return (
                <TrackRow key={t.Id} track={t} index={i}
                  onPlay={() => playTracks(list, i)}
                  isActive={player.currentTrack?.Id === t.Id} />
              );
            })}
          </div>
        </div>
      )}

      {/* Recently Added */}
      {recentAdded.length > 0 && (
        <div>
          <SectionHeader title="Recently Added in Vibe" />
          <ScrollRow>
            {recentAdded.map(t => (
              <div key={t.Id} style={{ flexShrink: 0, width: 130 }}>
                <AlbumCard item={{ Id: t.AlbumId || t.Id, Name: t.Album || t.Name, AlbumArtist: t.AlbumArtist }}
                  size={130} onPlay={() => t.AlbumId ? playAlbum({ Id: t.AlbumId }) : playTracks([t], 0)} />
              </div>
            ))}
          </ScrollRow>
        </div>
      )}

      {/* Stations */}
      <div>
        <SectionHeader title="Stations" />
        <ScrollRow gap={12}>
          <StationCard icon="🎤" title="Artist Mix" subtitle="Seeded from your library"
            accent="#7c3aed" onPlay={() => recentPlayed[0] && playMix(recentPlayed[0].Id)} />
          <StationCard icon="💿" title="Album Mix" subtitle="Deep cuts & gems"
            accent="#2563eb" onPlay={() => topAlbums[0] && playMix(topAlbums[0].Id)} />
          <StationCard icon="📻" title="Vibe Radio" subtitle="Everything, shuffled"
            accent="#d97706" onPlay={playRadio} />
          <StationCard icon="🔥" title="Top This Month" subtitle="Your most played"
            accent="#ef4444" onPlay={() => playTracks(mostPlayed, 0)} />
        </ScrollRow>
      </div>

      {/* Top Albums */}
      {topAlbums.length > 0 && (
        <div>
          <SectionHeader title="Top Albums" />
          <ScrollRow>
            {topAlbums.map(a => (
              <AlbumCard key={a.Id} item={a} size={140} onPlay={() => playAlbum(a)} />
            ))}
          </ScrollRow>
        </div>
      )}

      {/* Recently Added Albums */}
      {recentAlbums.length > 0 && (
        <div>
          <SectionHeader title="Recently Added Albums" />
          <ScrollRow>
            {recentAlbums.map(a => (
              <AlbumCard key={a.Id} item={a} size={140} onPlay={() => playAlbum(a)} />
            ))}
          </ScrollRow>
        </div>
      )}

      {/* Genre section */}
      {genres.length > 0 && (
        <div>
          <SectionHeader title={`More In: ${activeGenre || 'Genre'}`} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {genres.map(g => (
              <button key={g.Id} onClick={() => handleGenre(g.Name)} style={{
                padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: activeGenre === g.Name ? '#7c3aed' : 'rgba(255,255,255,0.07)',
                color: activeGenre === g.Name ? '#fff' : '#64748b',
                fontSize: 12, fontWeight: 500, transition: 'all 0.2s',
              }}>{g.Name}</button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {genreTracks.map((t, i) => (
              <TrackRow key={t.Id} track={t} index={i}
                onPlay={() => playTracks(genreTracks, i)}
                isActive={player.currentTrack?.Id === t.Id} />
            ))}
          </div>
        </div>
      )}

      {/* Playlists */}
      {playlists.length > 0 && (
        <div>
          <SectionHeader title="Recent Playlists" />
          <ScrollRow gap={12}>
            {playlists.map(pl => (
              <div key={pl.Id} onClick={() => playMix(pl.Id)} style={{
                flexShrink: 0, width: 150, borderRadius: 14, overflow: 'hidden',
                cursor: 'pointer', position: 'relative',
              }}>
                <AlbumArt album={pl} size={150} radius={14} />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                  padding: '24px 10px 10px', borderRadius: '0 0 14px 14px',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{pl.Name}</div>
                </div>
              </div>
            ))}
          </ScrollRow>
        </div>
      )}

      {/* Most Played This Month */}
      {mostPlayed.length > 0 && (
        <div>
          <SectionHeader title="Most Played · This Month" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {mostPlayed.map((t, i) => (
              <TrackRow key={t.Id} track={t} index={i}
                onPlay={() => playTracks(mostPlayed, i)}
                isActive={player.currentTrack?.Id === t.Id} />
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginBottom: 100 }}>
          <SectionHeader title="History" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {history.map((t, i) => (
              <TrackRow key={`h-${t.Id}-${i}`} track={t} index={i}
                onPlay={() => playTracks(history, i)}
                isActive={player.currentTrack?.Id === t.Id} />
            ))}
          </div>
        </div>
      )}

      {!loading && recentPlayed.length === 0 && recentAdded.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#334155' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#475569' }}>Your library is empty</p>
          <p style={{ fontSize: 13, color: '#334155', marginTop: 6 }}>Add music to Jellyfin and it'll show up here</p>
        </div>
      )}
    </div>
  );
}

// ─── Search ───────────────────────────────────────────────────────────────────
function SearchView({ player }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [genres, setGenres] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    getAllGenres().then(r => setGenres((r.Items || []).slice(0, 12)));
  }, []);

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

  const tracks  = results.filter(r => r.Type === 'Audio');
  const albums  = results.filter(r => r.Type === 'MusicAlbum');

  const playAlbum = async (album) => {
    const res = await getAlbumTracks(album.Id);
    if (res.Items?.length) player.play(res.Items, 0);
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#f8fafc' }}>Search</h2>
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#475569' }}>◎</span>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Songs, artists, albums..."
          style={{
            width: '100%', padding: '12px 16px 12px 42px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, color: '#f1f5f9', fontSize: 15, outline: 'none', boxSizing: 'border-box',
          }} />
      </div>

      {!q && genres.length > 0 && (
        <div>
          <p style={{ color: '#475569', fontSize: 13, marginBottom: 12 }}>Browse by genre</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {genres.map((g, i) => {
              const colors = ['#7c3aed','#2563eb','#d97706','#ef4444','#059669','#ec4899','#0891b2','#7c3aed'];
              const c = colors[i % colors.length];
              return (
                <button key={g.Id} onClick={() => setQ(g.Name)} style={{
                  background: `${c}20`, border: `1px solid ${c}40`,
                  borderRadius: 20, padding: '7px 16px',
                  color: c, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}>{g.Name}</button>
              );
            })}
          </div>
        </div>
      )}

      {searching && <Loader />}

      {albums.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="Albums" />
          <ScrollRow>
            {albums.map(a => <AlbumCard key={a.Id} item={a} size={130} onPlay={() => playAlbum(a)} />)}
          </ScrollRow>
        </div>
      )}

      {tracks.length > 0 && (
        <div>
          <SectionHeader title="Songs" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tracks.map((t, i) => (
              <TrackRow key={t.Id} track={t} index={i}
                onPlay={() => player.play(tracks, i)}
                isActive={player.currentTrack?.Id === t.Id} />
            ))}
          </div>
        </div>
      )}

      {q && !searching && results.length === 0 && (
        <p style={{ color: '#475569', textAlign: 'center', marginTop: 48 }}>No results for "{q}"</p>
      )}
    </div>
  );
}

// ─── Library ──────────────────────────────────────────────────────────────────
function LibraryView({ player }) {
  const [tab, setTab] = useState('albums');
  const [albums, setAlbums] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const load = tab === 'albums'
      ? getAlbums(300).then(r => setAlbums(r.Items || []))
      : getAllTracks(500).then(r => setTracks(r.Items || []));
    load.finally(() => setLoading(false));
  }, [tab]);

  const playAlbum = async (album) => {
    const res = await getAlbumTracks(album.Id);
    if (res.Items?.length) player.play(res.Items, 0);
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#f8fafc' }}>Library</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['albums','tracks'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: tab === t ? '#7c3aed' : 'rgba(255,255,255,0.07)',
            color: tab === t ? '#fff' : '#64748b', fontSize: 13, fontWeight: 500,
            transition: 'all 0.2s', textTransform: 'capitalize',
          }}>{t}</button>
        ))}
      </div>

      {loading && <Loader />}

      {tab === 'albums' && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 20 }}>
          {albums.map(a => <AlbumCard key={a.Id} item={a} size={140} onPlay={() => playAlbum(a)} />)}
        </div>
      )}

      {tab === 'tracks' && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tracks.map((t, i) => (
            <TrackRow key={t.Id} track={t} index={i}
              onPlay={() => player.play(tracks, i)}
              isActive={player.currentTrack?.Id === t.Id} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const player = useVibePlayer();
  const [view, setView] = useState('home');

  const progress = player.duration > 0 ? player.currentTime / player.duration : 0;
  const accent   = '#7c3aed';

  return (
    <div style={{ minHeight: '100vh', background: '#080810', color: '#f1f5f9' }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 320,
        background: `radial-gradient(ellipse at top, ${accent}12, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />

      <NavBar active={view} onChange={setView} />

      <main style={{
        paddingTop: 72, paddingBottom: 120, padding: '72px 20px 120px',
        maxWidth: 760, margin: '0 auto', position: 'relative', zIndex: 1,
      }}>
        {view === 'home'    && <HomeView    player={player} />}
        {view === 'search'  && <SearchView  player={player} />}
        {view === 'library' && <LibraryView player={player} />}
      </main>

      {player.currentTrack && !player.playerExpanded && (
        <MiniPlayer
          track={player.currentTrack}
          isPlaying={player.isPlaying}
          progress={progress}
          onToggle={player.togglePlay}
          onNext={player.next}
          onPrev={player.prev}
          onExpand={() => player.setPlayerExpanded(true)} />
      )}

      {player.playerExpanded && (
        <FullPlayer
          track={player.currentTrack}
          isPlaying={player.isPlaying}
          progress={progress}
          currentTime={player.currentTime}
          duration={player.duration}
          volume={player.volume}
          isShuffle={player.isShuffle}
          repeatMode={player.repeatMode}
          getWaveform={player.getWaveform}
          onToggle={player.togglePlay}
          onNext={player.next}
          onPrev={player.prev}
          onSeek={player.seek}
          onVolume={player.changeVolume}
          onShuffle={player.toggleShuffle}
          onRepeat={player.cycleRepeat}
          onClose={() => player.setPlayerExpanded(false)} />
      )}
    </div>
  );
}
