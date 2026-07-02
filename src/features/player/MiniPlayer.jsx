import { useAccent } from './useAccent';
import { controlledAccent } from '../../utils/colorUtils';
import { AlbumArt } from '../../components/AlbumArt';
import { Icons } from '../../components/Icons';

export function MiniPlayer({ track, isPlaying, progress, onToggle, onNext, onPrev, onExpand }) {
  const accent = controlledAccent(useAccent());
  if (!track) return null;

  return (
    <div
      data-miniplayer="true"
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 700, margin: '0 auto', background: 'rgba(12,12,20,0.96)', backdropFilter: 'blur(24px)', borderRadius: '18px 18px 0 0', border: `1px solid ${accent}30`, borderBottom: 'none', boxShadow: `0 -4px 32px rgba(0,0,0,0.5), 0 0 0 1px ${accent}12`, zIndex: 400, padding: `10px 14px calc(14px + env(safe-area-inset-bottom))`, display: 'flex', alignItems: 'center', gap: 12 }}
    >
      <div onClick={onExpand} style={{ cursor: 'pointer', flexShrink: 0 }}>
        <AlbumArt track={track} size={44} radius={8} />
      </div>
      <div onClick={onExpand} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.Name}</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>{track.AlbumArtist || track.Artists?.[0]}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
          {Icons.prev('#94a3b8')}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }} style={{ width: 42, height: 42, borderRadius: '50%', background: accent, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${accent}60`, flexShrink: 0 }}>
          {isPlaying ? Icons.pause('#fff') : Icons.play('#fff')}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onNext(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
          {Icons.next('#94a3b8')}
        </button>
      </div>
      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 16, right: 16, height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
        <div style={{ height: '100%', background: accent, borderRadius: 2, width: `${progress * 100}%`, transition: 'width 0.25s linear' }} />
      </div>
    </div>
  );
}
