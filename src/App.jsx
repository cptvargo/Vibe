import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import {
  getRecentlyPlayed, getRecentlyAdded, getRecentPlaylists,
  getTopAlbums, getRecentAlbums, getMostPlayedThisMonth,
  getPlayHistory, getAllGenres, getByGenre, getVibeRadio,
  getInstantMix, getAlbums, getAllTracks, getAlbumTracks,
  search, getImageUrl, getAlbumImageUrl,
} from './api/jellyfin';
import { useVibePlayer } from './hooks/useVibePlayer';
import { extractColors } from './utils/colorExtract';

// ─── Shared Color Context ─────────────────────────────────────────────────────
// Single extraction per track. MiniPlayer + FullPlayer both read from here.
// Zero duplicate extractColors() calls. Zero color mismatch.
const ColorCtx = createContext({ accent: '#7c3aed', primary: '#0a0a14' });

function ColorProvider({ track, children }) {
  const [colors, setColors] = useState({ accent: '#7c3aed', primary: '#0a0a14' });
  useEffect(() => {
    if (!track) return;
    extractColors(getAlbumImageUrl(track, 200)).then(c =>
      setColors({ accent: c.vibrant?.hex || '#7c3aed', primary: c.primary?.hex || '#0a0a14' })
    );
  }, [track?.Id]);
  return <ColorCtx.Provider value={colors}>{children}</ColorCtx.Provider>;
}
const useColors = () => useContext(ColorCtx);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (s) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};
const fmtTicks = (t) => fmtTime((t || 0) / 10000000);

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Icons = {
  home:        (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
  search:      (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  library:     (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  prev:        (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill={c}><polygon points="19,20 9,12 19,4"/><line x1="5" y1="4" x2="5" y2="20" stroke={c} strokeWidth="2.5" strokeLinecap="round"/></svg>,
  next:        (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill={c}><polygon points="5,4 15,12 5,20"/><line x1="19" y1="4" x2="19" y2="20" stroke={c} strokeWidth="2.5" strokeLinecap="round"/></svg>,
  play:        (c) => <svg width="26" height="26" viewBox="0 0 24 24" fill={c}><polygon points="6,3 20,12 6,21"/></svg>,
  pause:       (c) => <svg width="26" height="26" viewBox="0 0 24 24" fill={c}><rect x="5" y="3" width="4" height="18" rx="1.5"/><rect x="15" y="3" width="4" height="18" rx="1.5"/></svg>,
  shuffle:     (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16,3 21,3 21,8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21,16 21,21 16,21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>,
  repeat:      (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17,1 21,5 17,9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7,23 3,19 7,15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>,
  volLow:      (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>,
  volHigh:     (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>,
  chevronDown: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6,9 12,15 18,9"/></svg>,
};

// ─── Album Art ────────────────────────────────────────────────────────────────
function AlbumArt({ track, album, size = 56, radius = 8, style = {} }) {
  const imgUrl = track
    ? getAlbumImageUrl(track, Math.min(size * 2, 800))
    : album ? getImageUrl(album.Id, 'Primary', size * 2) : null;
  return (
    <div style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: 'hidden', background: '#1a1a2e', ...style }}>
      {imgUrl && <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />}
    </div>
  );
}

// ─── Waveform ─────────────────────────────────────────────────────────────────
function Waveform({ isPlaying, accent, progress = 0, getWaveform }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const phaseRef  = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, bars = 64;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      phaseRef.current += isPlaying ? 0.035 : 0;
      const real = getWaveform?.();
      for (let i = 0; i < bars; i++) {
        const x = i * (W / bars), barW = (W / bars) - 1.5;
        const played = i / bars < progress;
        let h;
        if (real?.[i] > 0) { h = Math.max(3, (real[i] / 255) * H * 0.9); }
        else {
          const wave = Math.sin(i * 0.28 + phaseRef.current) * 0.35 + Math.sin(i * 0.65 + phaseRef.current * 1.4) * 0.35 + Math.sin(i * 0.12 + phaseRef.current * 0.6) * 0.3;
          h = Math.max(3, (0.45 + wave * 0.55) * H * 0.85);
        }
        ctx.fillStyle = played ? accent : `${accent}40`;
        ctx.beginPath(); ctx.roundRect(x, (H - h) / 2, barW, h, 2); ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, accent, progress, getWaveform]);
  return <canvas ref={canvasRef} width={600} height={72} style={{ width: '100%', height: 72, display: 'block' }} />;
}

// ─── Track Row ────────────────────────────────────────────────────────────────
function TrackRow({ track, onPlay, isActive, index }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={() => onPlay(track)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px', borderRadius: 10, cursor: 'pointer',
        background: isActive ? 'rgba(124,58,237,0.12)' : hover ? 'rgba(255,255,255,0.04)' : 'transparent', transition: 'background 0.15s' }}>
      {index !== undefined && <span style={{ width: 20, textAlign: 'right', fontSize: 12, color: '#334155', flexShrink: 0 }}>{isActive ? '▶' : index + 1}</span>}
      <AlbumArt track={track} size={44} radius={6} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: isActive ? '#a78bfa' : '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.Name}</div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>{track.AlbumArtist || track.Artists?.[0]} · {track.Album}</div>
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
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onPlay} style={{ flexShrink: 0, cursor: 'pointer', width: size }}>
      <div style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', background: '#1e1e2e', position: 'relative',
        transform: hover ? 'scale(1.04)' : 'scale(1)', boxShadow: hover ? '0 12px 40px rgba(0,0,0,0.5)' : 'none', transition: 'transform 0.2s, box-shadow 0.2s' }}>
        <img src={imgUrl} alt={item.Name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
        {hover && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#000"><polygon points="6,3 20,12 6,21"/></svg>
            </div>
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
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onPlay}
      style={{ flexShrink: 0, width: 160, borderRadius: 14, padding: 16, background: `linear-gradient(135deg, ${accent}28, ${accent}0a)`,
        border: `1px solid ${accent}30`, cursor: 'pointer', transform: hover ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hover ? `0 10px 32px ${accent}30` : 'none', transition: 'all 0.2s' }}>
      <div style={{ fontSize: 30, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 11, color: '#64748b' }}>{subtitle}</div>
    </div>
  );
}

function ScrollRow({ children, gap = 16 }) {
  return <div style={{ display: 'flex', gap, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>{children}</div>;
}

function SectionHeader({ title }) {
  return <div style={{ marginBottom: 14 }}><h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f1f5f9', letterSpacing: -0.3 }}>{title}</h2></div>;
}

function Loader() {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '16px 0' }}>
      {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', animation: `vbounce 0.8s ease-in-out ${i * 0.15}s infinite alternate` }} />)}
      <style>{`@keyframes vbounce{from{transform:translateY(0);opacity:.4}to{transform:translateY(-8px);opacity:1}}`}</style>
    </div>
  );
}

// ─── Mini Player — reads from shared ColorCtx ─────────────────────────────────
function MiniPlayer({ track, isPlaying, progress, onToggle, onNext, onPrev, onExpand }) {
  const { accent } = useColors();
  if (!track) return null;
  return (
    <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 700,
      background: 'rgba(12,12,20,0.96)', backdropFilter: 'blur(24px)', borderRadius: 18, border: `1px solid ${accent}30`,
      boxShadow: `0 8px 48px rgba(0,0,0,0.7), 0 0 0 1px ${accent}12`, zIndex: 100, padding: '10px 14px 14px',
      display: 'flex', alignItems: 'center', gap: 12 }}>
      <div onClick={onExpand} style={{ cursor: 'pointer', flexShrink: 0 }}><AlbumArt track={track} size={44} radius={8} /></div>
      <div onClick={onExpand} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.Name}</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>{track.AlbumArtist || track.Artists?.[0]}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <button onClick={e => { e.stopPropagation(); onPrev(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>{Icons.prev('#94a3b8')}</button>
        <button onClick={e => { e.stopPropagation(); onToggle(); }} style={{ width: 42, height: 42, borderRadius: '50%', background: accent, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${accent}60`, flexShrink: 0 }}>{isPlaying ? Icons.pause('#fff') : Icons.play('#fff')}</button>
        <button onClick={e => { e.stopPropagation(); onNext(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>{Icons.next('#94a3b8')}</button>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 16, right: 16, height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
        <div style={{ height: '100%', background: accent, borderRadius: 2, width: `${progress * 100}%`, transition: 'width 0.25s linear' }} />
      </div>
    </div>
  );
}

// ─── Drag-to-Close Hook ───────────────────────────────────────────────────────
// Works from ANYWHERE on the player — album art, track info, anywhere.
// Scroll conflict resolution:
//   - If scrollTop > 0: let scroll happen, don't activate drag
//   - If scrollTop === 0 and gesture is downward: activate drag, lock scroll
//   - Grab handle always activates drag regardless of scrollTop
// Velocity + threshold close. GPU transform only. Snap-back spring.
function useDragToClose(onClose, scrollRef) {
  const elRef        = useRef(null);
  const startY       = useRef(0);
  const startTime    = useRef(0);
  const active       = useRef(false);
  const decided      = useRef(false); // have we decided drag vs scroll yet?
  const frameRef     = useRef(null);
  const fromHandle   = useRef(false);

  const setStyle = useCallback((y, radius, transition) => {
    const el = elRef.current;
    if (!el) return;
    el.style.transition   = transition || 'none';
    el.style.transform    = `translateY(${y}px)`;
    el.style.borderRadius = radius > 0 ? `${radius}px ${radius}px 0 0` : '0';
  }, []);

  // Called from grab handle — always drag
  const onHandlePointerDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    fromHandle.current  = true;
    active.current      = true;
    decided.current     = true;
    startY.current      = e.clientY;
    startTime.current   = Date.now();
    elRef.current?.setPointerCapture?.(e.pointerId);
    if (scrollRef.current) scrollRef.current.style.overflowY = 'hidden';
  }, [scrollRef]);

  // Called from the whole player surface
  const onPointerDown = useCallback((e) => {
    fromHandle.current = false;
    decided.current    = false;
    startY.current     = e.clientY;
    startTime.current  = Date.now();
    // Check scroll position at touch start
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    if (scrollTop <= 2) {
      // At top — pre-activate so drag is instant on first move
      active.current = true;
      elRef.current?.setPointerCapture?.(e.pointerId);
    } else {
      active.current = false;
    }
  }, [scrollRef]);

  const onPointerMove = useCallback((e) => {
    const delta = e.clientY - startY.current;

    // Handle — always drag
    if (fromHandle.current) {
      if (delta <= 0) return;
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => setStyle(delta, Math.min(delta * 0.18, 24)));
      return;
    }

    if (!active.current) return;

    // If user goes upward, cancel drag and restore scroll
    if (delta < 0) {
      active.current = false;
      if (scrollRef.current) scrollRef.current.style.overflowY = '';
      setStyle(0, 0, 'transform 0.2s ease');
      return;
    }

    // Lock scroll on first downward move
    if (!decided.current) {
      decided.current = true;
      if (scrollRef.current) scrollRef.current.style.overflowY = 'hidden';
    }

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => setStyle(delta, Math.min(delta * 0.18, 24)));
  }, [setStyle, scrollRef]);

  const onPointerUp = useCallback((e) => {
    fromHandle.current = false;
    if (scrollRef.current) scrollRef.current.style.overflowY = '';
    cancelAnimationFrame(frameRef.current);

    if (!active.current) { active.current = false; decided.current = false; return; }
    active.current  = false;
    decided.current = false;

    const delta    = e.clientY - startY.current;
    const elapsed  = Math.max(Date.now() - startTime.current, 1);
    const velocity = delta / elapsed;

    if (velocity > 0.45 || delta > 120) {
      setStyle(window.innerHeight, 0, 'transform 0.28s cubic-bezier(0.32,0.72,0,1)');
      setTimeout(onClose, 280);
    } else {
      setStyle(0, 0, 'transform 0.38s cubic-bezier(0.34,1.56,0.64,1)');
    }
  }, [setStyle, onClose, scrollRef]);

  return { elRef, onHandlePointerDown, onPointerDown, onPointerMove, onPointerUp };
}

// ─── Full Player — reads from shared ColorCtx ─────────────────────────────────
function FullPlayer({ track, isPlaying, progress, currentTime, duration, volume,
  isShuffle, repeatMode, onToggle, onNext, onPrev, onSeek, onVolume,
  onShuffle, onRepeat, onClose, getWaveform }) {

  const { accent, primary } = useColors();
  const scrollRef = useRef(null);
  const { elRef, onHandlePointerDown, onPointerDown, onPointerMove, onPointerUp } = useDragToClose(onClose, scrollRef);

  // Lock body scroll while player is mounted — prevents background jitter
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, []);

  if (!track) return null;

  return (
    <div
      ref={elRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ position: 'fixed', inset: 0, zIndex: 201, overflow: 'hidden', willChange: 'transform' }}>

      {/* Solid color background from album art — no blur, no jitter */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `linear-gradient(160deg, ${primary} 0%, #0a0a12 45%, #080810 100%)`,
      }} />

      {/* Scrollable content — overflow managed by drag hook */}
      <div ref={scrollRef} style={{
        position: 'relative', zIndex: 1, height: '100%',
        overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 24px 40px' }}>

          {/* Grab handle */}
          <div
            onPointerDown={onHandlePointerDown}
            style={{ width: 48, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '10px auto 2px', cursor: 'grab', flexShrink: 0, touchAction: 'none', userSelect: 'none' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)' }} />
          </div>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: 16, marginTop: 4 }}>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {Icons.chevronDown('#f1f5f9')}
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: 1.5, textTransform: 'uppercase' }}>Now Playing</div>
            </div>
            <div style={{ width: 34 }} />
          </div>

          {/* Album Art */}
          <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 18, overflow: 'hidden',
            boxShadow: `0 24px 72px ${accent}55`, marginBottom: 22, flexShrink: 0,
            transform: isPlaying ? 'scale(1)' : 'scale(0.96)',
            transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <AlbumArt track={track} size={480} radius={18} style={{ width: '100%', height: '100%' }} />
          </div>

          {/* Track info */}
          <div style={{ width: '100%', marginBottom: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', letterSpacing: -0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.Name}</div>
            <div style={{ fontSize: 14, color: '#64748b', marginTop: 3 }}>{track.AlbumArtist || track.Artists?.[0]} · {track.Album}</div>
          </div>

          {/* Waveform */}
          <div style={{ width: '100%', marginBottom: 2 }}>
            <Waveform isPlaying={isPlaying} accent={accent} progress={progress} getWaveform={getWaveform} />
          </div>

          {/* Seek */}
          <div style={{ width: '100%', marginBottom: 22 }}>
            <input type="range" min={0} max={duration || 1} step={0.1} value={currentTime}
              onChange={e => onSeek(parseFloat(e.target.value))} style={{ width: '100%', accentColor: accent }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#334155', marginTop: 4 }}>
              <span>{fmtTime(currentTime)}</span><span>{fmtTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 26 }}>
            <button onClick={onShuffle} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, opacity: isShuffle ? 1 : 0.3, transition: 'opacity 0.2s' }}>
              {Icons.shuffle(isShuffle ? accent : '#f1f5f9')}
              {isShuffle && <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent, margin: '2px auto 0' }} />}
            </button>
            <button onClick={onPrev} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', width: 54, height: 54, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.prev('#f1f5f9')}</button>
            <button onClick={onToggle} style={{ width: 72, height: 72, borderRadius: '50%', background: accent, border: 'none', cursor: 'pointer', boxShadow: `0 0 48px ${accent}88`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{isPlaying ? Icons.pause('#fff') : Icons.play('#fff')}</button>
            <button onClick={onNext} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', width: 54, height: 54, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.next('#f1f5f9')}</button>
            <button onClick={onRepeat} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, opacity: repeatMode !== 'none' ? 1 : 0.3, transition: 'opacity 0.2s' }}>
              {Icons.repeat(repeatMode !== 'none' ? accent : '#f1f5f9')}
              {repeatMode !== 'none' && <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent, margin: '2px auto 0' }} />}
            </button>
          </div>

          {/* Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
            {Icons.volLow('#475569')}
            <input type="range" min={0} max={1} step={0.01} value={volume}
              onChange={e => onVolume(parseFloat(e.target.value))} style={{ flex: 1, accentColor: accent }} />
            {Icons.volHigh('#475569')}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function NavBar({ active, onChange }) {
  const items = [
    { id: 'home', label: 'Home', icon: Icons.home },
    { id: 'search', label: 'Search', icon: Icons.search },
    { id: 'library', label: 'Library', icon: Icons.library },
  ];
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingTop: 'env(safe-area-inset-top)' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', height: 56 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -1, marginRight: 28, background: 'linear-gradient(135deg, #f8fafc 30%, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Vibe</div>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {items.map(item => {
            const on = active === item.id;
            return <button key={item.id} onClick={() => onChange(item.id)} style={{ background: on ? 'rgba(124,58,237,0.15)' : 'none', border: 'none', borderRadius: 8, color: on ? '#a78bfa' : '#475569', padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}>{item.icon(on ? '#a78bfa' : '#475569')}<span>{item.label}</span></button>;
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function HomeView({ player }) {
  const [recentPlayed, setRecentPlayed] = useState([]);
  const [recentAdded,  setRecentAdded]  = useState([]);
  const [playlists,    setPlaylists]    = useState([]);
  const [topAlbums,    setTopAlbums]    = useState([]);
  const [recentAlbums, setRecentAlbums] = useState([]);
  const [mostPlayed,   setMostPlayed]   = useState([]);
  const [history,      setHistory]      = useState([]);
  const [genres,       setGenres]       = useState([]);
  const [genreTracks,  setGenreTracks]  = useState([]);
  const [activeGenre,  setActiveGenre]  = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [rp, ra, pl, ta, ral, mp, h, g] = await Promise.all([
          getRecentlyPlayed(12), getRecentlyAdded(12), getRecentPlaylists(6),
          getTopAlbums(12), getRecentAlbums(12), getMostPlayedThisMonth(12),
          getPlayHistory(20), getAllGenres(),
        ]);
        setRecentPlayed(rp.Items || []); setRecentAdded(ra.Items || []);
        setPlaylists(pl.Items || []); setTopAlbums(ta.Items || []);
        setRecentAlbums(ral.Items || []); setMostPlayed(mp.Items || []);
        setHistory(h.Items || []); setGenres((g.Items || []).slice(0, 8));
        if (g.Items?.length) {
          setActiveGenre(g.Items[0].Name);
          const gt = await getByGenre(g.Items[0].Name, 8);
          setGenreTracks(gt.Items || []);
        }
      } catch(e) { console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  const handleGenre = async (name) => { setActiveGenre(name); const gt = await getByGenre(name, 8); setGenreTracks(gt.Items || []); };
  const playTracks = (tracks, idx = 0) => player.play(tracks, idx);
  const playAlbum  = async (album) => { const r = await getAlbumTracks(album.Id); if (r.Items?.length) player.play(r.Items, 0); };
  const playRadio  = async () => { const r = await getVibeRadio(100); if (r.Items?.length) player.play(r.Items, 0); };
  const playMix    = async (id) => { const r = await getInstantMix(id, 50); if (r.Items?.length) player.play(r.Items, 0); };
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return <div style={{ padding: '32px 0' }}><h1 style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', marginBottom: 8 }}>{greeting}, Zeus 👋</h1><Loader /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#f8fafc', letterSpacing: -0.8 }}>{greeting}, Zeus 👋</h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 14 }}>Ready to vibe?</p>
      </div>

      {(recentPlayed.length > 0 || recentAdded.length > 0) && (() => {
        const list = recentPlayed.length > 0 ? recentPlayed : recentAdded;
        return (
          <div>
            <SectionHeader title={recentPlayed.length > 0 ? 'Recently Played' : 'Jump Back In'} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {list.map((t, i) => <TrackRow key={t.Id} track={t} index={i} onPlay={() => playTracks(list, i)} isActive={player.currentTrack?.Id === t.Id} />)}
            </div>
          </div>
        );
      })()}

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

      <div>
        <SectionHeader title="Stations" />
        <ScrollRow gap={12}>
          <StationCard icon="🎤" title="Artist Mix" subtitle="Seeded from your library" accent="#7c3aed" onPlay={() => recentPlayed[0] && playMix(recentPlayed[0].Id)} />
          <StationCard icon="💿" title="Album Mix" subtitle="Deep cuts & gems" accent="#2563eb" onPlay={() => topAlbums[0] && playMix(topAlbums[0].Id)} />
          <StationCard icon="📻" title="Vibe Radio" subtitle="Everything, shuffled" accent="#d97706" onPlay={playRadio} />
          <StationCard icon="🔥" title="Top This Month" subtitle="Your most played" accent="#ef4444" onPlay={() => playTracks(mostPlayed, 0)} />
        </ScrollRow>
      </div>

      {topAlbums.length > 0 && <div><SectionHeader title="Top Albums" /><ScrollRow>{topAlbums.map(a => <AlbumCard key={a.Id} item={a} size={140} onPlay={() => playAlbum(a)} />)}</ScrollRow></div>}
      {recentAlbums.length > 0 && <div><SectionHeader title="Recently Added Albums" /><ScrollRow>{recentAlbums.map(a => <AlbumCard key={a.Id} item={a} size={140} onPlay={() => playAlbum(a)} />)}</ScrollRow></div>}

      {genres.length > 0 && (
        <div>
          <SectionHeader title={`More In: ${activeGenre || 'Genre'}`} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {genres.map(g => <button key={g.Id} onClick={() => handleGenre(g.Name)} style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', background: activeGenre === g.Name ? '#7c3aed' : 'rgba(255,255,255,0.07)', color: activeGenre === g.Name ? '#fff' : '#64748b', fontSize: 12, fontWeight: 500, transition: 'all 0.2s' }}>{g.Name}</button>)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {genreTracks.map((t, i) => <TrackRow key={t.Id} track={t} index={i} onPlay={() => playTracks(genreTracks, i)} isActive={player.currentTrack?.Id === t.Id} />)}
          </div>
        </div>
      )}

      {playlists.length > 0 && (
        <div>
          <SectionHeader title="Recent Playlists" />
          <ScrollRow gap={12}>
            {playlists.map(pl => (
              <div key={pl.Id} onClick={() => playMix(pl.Id)} style={{ flexShrink: 0, width: 150, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
                <AlbumArt album={pl} size={150} radius={14} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '24px 10px 10px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{pl.Name}</div>
                </div>
              </div>
            ))}
          </ScrollRow>
        </div>
      )}

      {mostPlayed.length > 0 && <div><SectionHeader title="Most Played · This Month" /><div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{mostPlayed.map((t, i) => <TrackRow key={t.Id} track={t} index={i} onPlay={() => playTracks(mostPlayed, i)} isActive={player.currentTrack?.Id === t.Id} />)}</div></div>}

      {history.length > 0 && (
        <div style={{ marginBottom: 100 }}>
          <SectionHeader title="History" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {history.map((t, i) => <TrackRow key={`h-${t.Id}-${i}`} track={t} index={i} onPlay={() => playTracks(history, i)} isActive={player.currentTrack?.Id === t.Id} />)}
          </div>
        </div>
      )}

      {!loading && recentPlayed.length === 0 && recentAdded.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#475569' }}>Your library is empty</p>
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

  useEffect(() => { getAllGenres().then(r => setGenres((r.Items || []).slice(0, 12))); }, []);
  useEffect(() => {
    clearTimeout(debounce.current);
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    debounce.current = setTimeout(async () => { const res = await search(q, 40); setResults(res.Items || []); setSearching(false); }, 350);
  }, [q]);

  const tracks = results.filter(r => r.Type === 'Audio');
  const albums = results.filter(r => r.Type === 'MusicAlbum');
  const playAlbum = async (a) => { const r = await getAlbumTracks(a.Id); if (r.Items?.length) player.play(r.Items, 0); };

  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#f8fafc' }}>Search</h2>
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>{Icons.search('#475569')}</div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Songs, artists, albums..."
          style={{ width: '100%', padding: '12px 16px 12px 46px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#f1f5f9', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
      </div>
      {!q && genres.length > 0 && (
        <div>
          <p style={{ color: '#475569', fontSize: 13, marginBottom: 12 }}>Browse by genre</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {genres.map((g, i) => { const cs = ['#7c3aed','#2563eb','#d97706','#ef4444','#059669','#ec4899','#0891b2','#7c3aed']; const c = cs[i % cs.length]; return <button key={g.Id} onClick={() => setQ(g.Name)} style={{ background: `${c}20`, border: `1px solid ${c}40`, borderRadius: 20, padding: '7px 16px', color: c, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{g.Name}</button>; })}
          </div>
        </div>
      )}
      {searching && <Loader />}
      {albums.length > 0 && <div style={{ marginBottom: 24 }}><SectionHeader title="Albums" /><ScrollRow>{albums.map(a => <AlbumCard key={a.Id} item={a} size={130} onPlay={() => playAlbum(a)} />)}</ScrollRow></div>}
      {tracks.length > 0 && <div><SectionHeader title="Songs" /><div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{tracks.map((t, i) => <TrackRow key={t.Id} track={t} index={i} onPlay={() => player.play(tracks, i)} isActive={player.currentTrack?.Id === t.Id} />)}</div></div>}
      {q && !searching && results.length === 0 && <p style={{ color: '#475569', textAlign: 'center', marginTop: 48 }}>No results for "{q}"</p>}
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
    (tab === 'albums' ? getAlbums(300).then(r => setAlbums(r.Items || [])) : getAllTracks(500).then(r => setTracks(r.Items || []))).finally(() => setLoading(false));
  }, [tab]);

  const playAlbum = async (a) => { const r = await getAlbumTracks(a.Id); if (r.Items?.length) player.play(r.Items, 0); };

  return (
    <div style={{ paddingBottom: 100 }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#f8fafc' }}>Library</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['albums','tracks'].map(t => <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', background: tab === t ? '#7c3aed' : 'rgba(255,255,255,0.07)', color: tab === t ? '#fff' : '#64748b', fontSize: 13, fontWeight: 500, transition: 'all 0.2s', textTransform: 'capitalize' }}>{t}</button>)}
      </div>
      {loading && <Loader />}
      {tab === 'albums' && !loading && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 20 }}>{albums.map(a => <AlbumCard key={a.Id} item={a} size={140} onPlay={() => playAlbum(a)} />)}</div>}
      {tab === 'tracks' && !loading && <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{tracks.map((t, i) => <TrackRow key={t.Id} track={t} index={i} onPlay={() => player.play(tracks, i)} isActive={player.currentTrack?.Id === t.Id} />)}</div>}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const player = useVibePlayer();
  const [view, setView] = useState('home');
  const progress = player.duration > 0 ? player.currentTime / player.duration : 0;

  return (
    <ColorProvider track={player.currentTrack}>
      <div style={{ minHeight: '100vh', background: '#080810', color: '#f1f5f9' }}>
        <style>{`*{scrollbar-width:none;-ms-overflow-style:none}*::-webkit-scrollbar{display:none}`}</style>
        <NavBar active={view} onChange={setView} />
        <main style={{ paddingTop: 'calc(72px + env(safe-area-inset-top))', paddingBottom: 120, paddingLeft: 20, paddingRight: 20, maxWidth: 760, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {view === 'home'    && <HomeView    player={player} />}
          {view === 'search'  && <SearchView  player={player} />}
          {view === 'library' && <LibraryView player={player} />}
        </main>
        {player.currentTrack && !player.playerExpanded && (
          <MiniPlayer track={player.currentTrack} isPlaying={player.isPlaying} progress={progress}
            onToggle={player.togglePlay} onNext={player.next} onPrev={player.prev}
            onExpand={() => player.setPlayerExpanded(true)} />
        )}
        {player.playerExpanded && (
          <FullPlayer track={player.currentTrack} isPlaying={player.isPlaying} progress={progress}
            currentTime={player.currentTime} duration={player.duration} volume={player.volume}
            isShuffle={player.isShuffle} repeatMode={player.repeatMode} getWaveform={player.getWaveform}
            onToggle={player.togglePlay} onNext={player.next} onPrev={player.prev}
            onSeek={player.seek} onVolume={player.changeVolume}
            onShuffle={player.toggleShuffle} onRepeat={player.cycleRepeat}
            onClose={() => player.setPlayerExpanded(false)} />
        )}
      </div>
    </ColorProvider>
  );
}
