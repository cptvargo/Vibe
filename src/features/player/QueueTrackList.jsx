import { useRef } from 'react';
import { HotIcon } from '../../components/HotIcon';
import { isHot } from '../../utils/hotTracks';
import { fmtTicks } from '../../utils/format';
import { getAlbumImageUrl } from '../../api/jellyfin';

export function QueueTrackList({ queue, queueIndex, currentTrackId, accent, onPlayAt }) {
  const activeRef = useRef(null);
  if (!queue?.length) return null;

  return (
    <div style={{ width: '100%', marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.6, textTransform: 'uppercase' }}>Up Next</span>
      </div>
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        style={{ borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
      >
        {queue.map((t, i) => {
          const active = t.Id === currentTrackId;
          const played = i < queueIndex;
          const hot    = isHot(t.Id);
          const imgUrl = getAlbumImageUrl(t, 80);
          return (
            <div
              key={`q-${t.Id}-${i}`}
              ref={active ? activeRef : null}
              onClick={() => onPlayAt(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', background: active ? 'rgba(255,255,255,0.08)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s', opacity: played ? 0.4 : 1 }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#1e1e2e', position: 'relative', boxShadow: active ? `0 0 0 2px ${accent}` : 'none' }}>
                <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                {active && (
                  <div style={{ position: 'absolute', inset: 0, background: `${accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><polygon points="6,3 20,12 6,21" /></svg>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.Name}</span>
                  {hot && <HotIcon />}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.AlbumArtist || t.Artists?.[0]}</div>
              </div>
              <div style={{ fontSize: 11, color: '#334155', flexShrink: 0, letterSpacing: 0.3 }}>{fmtTicks(t.RunTimeTicks)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
