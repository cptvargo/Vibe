import { useRef, useEffect, useMemo, useCallback } from 'react';
import { useAccent } from './useAccent';
import { useDragToClose } from './useDragToClose';
import { controlledAccent } from '../../utils/colorUtils';
import { Icons } from '../../components/Icons';
import { QueueTrackList } from './QueueTrackList';
import { fmtTime } from '../../utils/format';
import { getAlbumImageUrl } from '../../api/jellyfin';

export function Player({ track, isPlaying, progress, currentTime, duration, volume, isShuffle, repeatMode, onToggle, onNext, onPrev, onSeek, onVolume, onShuffle, onRepeat, onClose, getWaveform, queue, queueIndex, onPlayAt }) {
  const rawAccent = useAccent();
  const accent    = controlledAccent(rawAccent);
  const scrollRef = useRef(null);
  const { elRef, onHandlePointerDown, onPointerDown, onPointerMove, onPointerUp } = useDragToClose(onClose, scrollRef);

  const bgRef       = useRef(null);
  const artRef      = useRef(null);
  const accentRef   = useRef(accent);
  const waveformRef = useRef(getWaveform);
  const rafRef      = useRef(null);

  useEffect(() => { accentRef.current = accent; }, [accent]);
  useEffect(() => { waveformRef.current = getWaveform; }, [getWaveform]);

  // Beat pulse rAF — scales album art with bass energy when analyser is available
  useEffect(() => {
    const loop = () => {
      const data = waveformRef.current?.() ?? new Uint8Array(128);
      const bass = (data[1] + data[2] + data[3] + data[4]) / (4 * 255);
      if (artRef.current) artRef.current.style.transform = `scale(${(1 + bass * 0.035).toFixed(4)})`;
      if (bgRef.current)  bgRef.current.style.transform  = `scale(${(1.15 + bass * 0.02).toFixed(4)})`;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Slide-in animation
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const onEnd = () => { el.style.animation = 'none'; };
    el.addEventListener('animationend', onEnd, { once: true });
    return () => el.removeEventListener('animationend', onEnd);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!track) return null;

  const repeatAll = repeatMode === 'all' || (repeatMode !== 'none' && repeatMode !== 'one');
  const repeatOne = repeatMode === 'one';
  const DIM    = 'rgba(255,255,255,0.35)';
  const ACTIVE = '#fff';

  return (
    <div
      ref={elRef}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, overflow: 'hidden', backgroundColor: '#000', willChange: 'transform', animation: 'vibeSlideUp 0.38s cubic-bezier(0.32,0.72,0,1) both' }}
    >
      <style>{`@keyframes vibeSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

      {/* Full-screen blurred atmosphere — low-res art, heavily blurred */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        <img
          ref={bgRef}
          src={getAlbumImageUrl(track, 200)}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'blur(48px) brightness(0.22)', transformOrigin: 'center center', willChange: 'transform' }}
        />
      </div>

      {/* Dark overlay */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to bottom, rgba(4,4,14,0.3) 0%, rgba(4,4,14,0.55) 55%, #04040e 100%)', pointerEvents: 'none' }} />

      {/* Accent color bloom at bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', zIndex: 1, background: `radial-gradient(ellipse at 50% 110%, ${accent}16 0%, transparent 65%)`, pointerEvents: 'none', transition: 'background 600ms ease' }} />

      {/* Scrollable surface */}
      <div
        ref={scrollRef}
        style={{ position: 'relative', zIndex: 2, height: '100%', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', touchAction: 'pan-y' }}
      >
        {/* Main view — full viewport height */}
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>

          {/* Drag handle */}
          <div
            onPointerDown={onHandlePointerDown}
            style={{ width: '100%', height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', cursor: 'grab' }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.22)' }} />
          </div>

          {/* Album art — contained square, beat-pulsed, doubles as drag zone */}
          <div
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 20px', touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div
              ref={artRef}
              style={{ width: '100%', maxWidth: 380, aspectRatio: '1 / 1', borderRadius: 16, overflow: 'hidden', boxShadow: `0 28px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.07)`, willChange: 'transform', transformOrigin: 'center center', flexShrink: 0 }}
            >
              <img
                src={getAlbumImageUrl(track, 1000)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
              />
            </div>
          </div>

          {/* Controls anchored to bottom */}
          <div style={{ padding: '0 28px' }}>

            {/* Track info */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: -0.5, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {track.Name}
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 5 }}>
                {track.AlbumArtist || track.Artists?.[0]}
                {track.Album ? <span style={{ color: 'rgba(255,255,255,0.27)' }}> · {track.Album}</span> : null}
              </div>
            </div>

            {/* Waveform + seek */}
            <WaveformProgress trackId={track.Id} progress={progress} currentTime={currentTime} duration={duration} accent={accent} onSeek={onSeek} />

            {/* Playback controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 }}>
              <button onClick={onShuffle} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                {Icons.shuffle(isShuffle ? ACTIVE : DIM)}
                {isShuffle && <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent }} />}
              </button>

              <button onClick={onPrev} style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.07)', width: 58, height: 58, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {Icons.prev('rgba(255,255,255,0.88)')}
              </button>

              <button onClick={onToggle} style={{ width: 74, height: 74, borderRadius: '50%', background: accent, border: 'none', cursor: 'pointer', boxShadow: `0 0 48px ${accent}70, 0 4px 24px rgba(0,0,0,0.5)`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s, box-shadow 0.2s, background 0.35s ease', flexShrink: 0 }}>
                {isPlaying ? Icons.pause('#fff') : Icons.play('#fff')}
              </button>

              <button onClick={onNext} style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.07)', width: 58, height: 58, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {Icons.next('rgba(255,255,255,0.88)')}
              </button>

              <button onClick={onRepeat} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative' }}>
                {Icons.repeat(repeatAll || repeatOne ? ACTIVE : DIM)}
                {repeatOne && <div style={{ position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#04040e' }}>1</div>}
                {repeatAll && <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent }} />}
              </button>
            </div>

            {/* Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              {Icons.volLow('rgba(255,255,255,0.28)')}
              <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => onVolume(parseFloat(e.target.value))} style={{ flex: 1, accentColor: accent }} />
              {Icons.volHigh('rgba(255,255,255,0.28)')}
            </div>
          </div>
        </div>

        {/* Queue section */}
        {queue?.length > 1 && (
          <div style={{ background: '#04040e', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <QueueTrackList queue={queue} queueIndex={queueIndex} currentTrackId={track?.Id} accent={accent} onPlayAt={onPlayAt} />
          </div>
        )}
      </div>
    </div>
  );
}

// Seeded pseudo-random waveform — consistent per track, natural-looking shape
function generateWaveform(trackId, count = 70) {
  let s = 0;
  for (let i = 0; i < trackId.length; i++) s = (Math.imul(s, 31) + trackId.charCodeAt(i)) | 0;
  const rand = () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return (s >>> 0) / 0x100000000; };
  const raw = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const shape = 0.3 + 0.4 * Math.sin(t * Math.PI)           // overall arc (quiet intro/outro)
      + 0.15 * Math.sin(t * 4 * Math.PI + rand() * 2)          // verse/chorus variation
      + 0.08 * Math.sin(t * 11 * Math.PI + rand() * 3);        // phrase-level detail
    return Math.max(0.05, Math.min(0.97, shape + 0.12 * rand()));
  });
  // Smooth with a 5-point weighted average
  return raw.map((v, i) => {
    const a = raw[Math.max(0, i - 2)], b = raw[Math.max(0, i - 1)];
    const d = raw[Math.min(count - 1, i + 1)], e = raw[Math.min(count - 1, i + 2)];
    return (a + b * 2 + v * 3 + d * 2 + e) / 9;
  });
}

function WaveformProgress({ trackId, progress, currentTime, duration, accent, onSeek }) {
  const canvasRef = useRef(null);
  const seeking   = useRef(false);
  // Mutable state read by draw — avoids recreating draw on every progress tick
  const stateRef  = useRef({ progress, accent, bars: [] });
  stateRef.current.progress = progress;
  stateRef.current.accent   = accent;

  useEffect(() => { stateRef.current.bars = generateWaveform(trackId); }, [trackId]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    if (!W || !H) return;
    const { progress, accent, bars } = stateRef.current;
    if (!bars.length) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const n = bars.length;
    const barW = W / n;
    const gap  = Math.max(1, barW * 0.22);
    const bw   = Math.max(1, barW - gap);
    const fill = progress * n;
    for (let i = 0; i < n; i++) {
      const barH = Math.max(2, bars[i] * H * 0.88);
      const x = i * barW + gap / 2;
      const y = (H - barH) / 2;
      ctx.fillStyle = i < fill ? accent + 'dd' : 'rgba(255,255,255,0.14)';
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(bw), Math.round(barH));
    }
  }, []); // stable — reads from stateRef

  // Redraw when anything visible changes
  useEffect(() => { draw(); }, [draw, trackId, progress, accent]);

  // Size canvas and redraw on resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = Math.round(canvas.offsetWidth  * dpr);
      canvas.height = Math.round(canvas.offsetHeight * dpr);
      draw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  const getSeekPos = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect ? Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) : 0;
  };

  return (
    <div style={{ marginBottom: 4 }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: 52, display: 'block', cursor: 'pointer', touchAction: 'none', borderRadius: 2 }}
        onPointerDown={(e) => { seeking.current = true; e.currentTarget.setPointerCapture(e.pointerId); onSeek(getSeekPos(e) * (duration || 0)); }}
        onPointerMove={(e) => { if (seeking.current) onSeek(getSeekPos(e) * (duration || 0)); }}
        onPointerUp={() => { seeking.current = false; }}
        onPointerCancel={() => { seeking.current = false; }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 5, letterSpacing: 0.2 }}>
        <span>{fmtTime(currentTime)}</span>
        <span>{fmtTime(duration)}</span>
      </div>
    </div>
  );
}
