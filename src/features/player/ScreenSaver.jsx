import { useState, useEffect, useMemo } from 'react';
import { getAlbumImageUrl } from '../../api/jellyfin';

const CSS = `
@keyframes kb0 { from { transform: scale(1.0)  translate(0%,    0%);   } to { transform: scale(1.05) translate(-1.5%, -1%);  } }
@keyframes kb1 { from { transform: scale(1.04) translate(-1%,   0.5%); } to { transform: scale(1.0)  translate(1.5%,  -0.5%); } }
@keyframes kb2 { from { transform: scale(1.0)  translate(1%,   -0.5%); } to { transform: scale(1.04) translate(-0.5%,  1%);   } }
@keyframes kb3 { from { transform: scale(1.04) translate(1%,    1%);   } to { transform: scale(1.0)  translate(-1%,   -1%);   } }
@keyframes ssFadeIn { from { opacity: 0; } to { opacity: 1; } }
`;

const KB_ANIMS = [
  'kb0 30s ease-in-out infinite alternate',
  'kb1 34s ease-in-out infinite alternate',
  'kb2 28s ease-in-out infinite alternate',
  'kb3 32s ease-in-out infinite alternate',
];

function hashId(id = '') {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function setThemeColor(color) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', color);
}

export function ScreenSaver({ track, currentTime, duration, accent, onDismiss }) {
  const [now, setNow] = useState(new Date());

  // Set status bar to black while screensaver is active (Android); restore on dismiss
  useEffect(() => {
    setThemeColor('#000000');
    return () => setThemeColor('#080810');
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const variant  = useMemo(() => hashId(track.Id) % KB_ANIMS.length, [track.Id]);
  const progress = duration > 0 ? currentTime / duration : 0;
  const imgUrl   = getAlbumImageUrl(track, 600);
  const safe     = accent || '#7c3aed';

  const day = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const handleDismiss = () => { setThemeColor('#080810'); onDismiss(); };

  return (
    <div
      onClick={handleDismiss}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, overflow: 'hidden', animation: 'ssFadeIn 1s ease forwards', cursor: 'none' }}
    >
      <style>{CSS}</style>

      {/* Full-bleed art — barely any zoom so the whole cover stays readable */}
      <div style={{ position: 'absolute', inset: '-4%', animation: KB_ANIMS[variant] }}>
        <img
          src={imgUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.55) saturate(1.4)' }}
        />
      </div>

      {/* Top fade for clock legibility */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 35%, transparent 50%, rgba(0,0,0,0.78) 100%)', pointerEvents: 'none' }} />

      {/* Accent tint */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: `${safe}14`, pointerEvents: 'none' }} />

      {/* ── Date ── */}
      <div style={{ position: 'absolute', top: 'calc(52px + env(safe-area-inset-top))', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.55)', letterSpacing: 2, textTransform: 'uppercase' }}>{day}</div>
      </div>

      {/* ── Song info + progress ── */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 28px calc(48px + env(safe-area-inset-bottom))', pointerEvents: 'none' }}>
        <div style={{ height: 2, background: 'rgba(255,255,255,0.15)', borderRadius: 1, marginBottom: 22, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: safe, borderRadius: 1, transition: 'width 0.25s linear', boxShadow: `0 0 10px ${safe}99` }} />
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Now Playing</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -0.3, lineHeight: 1.2, marginBottom: 5, textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>
          {track.Name}
        </div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>
          {track.AlbumArtist || track.Artists?.[0]}
        </div>
      </div>

      {/* Tap hint */}
      <div style={{ position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', right: 20, zIndex: 1, fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, pointerEvents: 'none' }}>
        tap to dismiss
      </div>
    </div>
  );
}
