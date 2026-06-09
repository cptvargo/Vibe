import { useEffect } from 'react';
import { useAccent } from '../player/useAccent';
import { PageTransition } from '../../components/PageTransition';
import { TrackRow } from '../../components/TrackRow';

export function TrackListPage({ title, tracks, onClose, player, playAndExpand }) {
  const accent = useAccent();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
      <PageTransition>
        <div style={{ position: 'absolute', inset: 0, background: '#080810', overflowY: 'auto', scrollbarWidth: 'none' }}>
          {/* Header */}
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(8,8,16,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: 'calc(env(safe-area-inset-top) + 14px) 20px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f1f5f9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15,18 9,12 15,6" />
              </svg>
            </button>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', letterSpacing: -0.3 }}>{title}</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>{tracks.length} songs</div>
            </div>
          </div>

          {/* Play All bar */}
          <div style={{ padding: '16px 20px 8px', display: 'flex', gap: 10 }}>
            <button
              onClick={() => playAndExpand(tracks, 0)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', background: accent, border: 'none', borderRadius: 30, cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: `0 4px 20px ${accent}44` }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><polygon points="6,3 20,12 6,21" /></svg>
              Play All
            </button>
            <button
              onClick={() => playAndExpand([...tracks].sort(() => Math.random() - 0.5), 0)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 30, cursor: 'pointer', color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f1f5f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16,3 21,3 21,8" /><line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21,16 21,21 16,21" /><line x1="15" y1="15" x2="21" y2="21" />
              </svg>
              Shuffle
            </button>
          </div>

          {/* Track list */}
          <div style={{ padding: '8px 16px 120px' }}>
            {tracks.map((t, i) => (
              <TrackRow key={`${t.Id}-${i}`} track={t} index={i} onPlay={() => playAndExpand(tracks, i)} isActive={player.currentTrack?.Id === t.Id} />
            ))}
          </div>
        </div>
      </PageTransition>
    </div>
  );
}
