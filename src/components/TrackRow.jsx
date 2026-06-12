import { useState } from 'react';
import { AlbumArt } from './AlbumArt';
import { HotIcon } from './HotIcon';
import { Icons } from './Icons';
import { isHot } from '../utils/hotTracks';
import { isFire, toggleFire } from '../utils/fireSongs';
import { fmtTicks } from '../utils/format';

export function TrackRow({ track, onPlay, isActive, index, accent = '#7c3aed' }) {
  const [fire, setFire] = useState(() => isFire(track.Id));

  const handleFire = (e) => {
    e.stopPropagation();
    const nowFire = toggleFire(track);
    setFire(nowFire);
  };

  return (
    <div
      onClick={() => onPlay(track)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px', borderRadius: 10, cursor: 'pointer', background: isActive ? `${accent}20` : 'transparent' }}
    >
      {index !== undefined && (
        <span style={{ width: 20, textAlign: 'right', fontSize: 12, color: '#334155', flexShrink: 0 }}>
          {isActive ? '▶' : index + 1}
        </span>
      )}
      <AlbumArt track={track} size={44} radius={6} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: isActive ? accent : '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {track.Name}
          </div>
          {isHot(track.Id) && <HotIcon />}
        </div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>
          {track.AlbumArtist || track.Artists?.[0]} · {track.Album}
        </div>
      </div>
      <button
        onClick={handleFire}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', flexShrink: 0, opacity: fire ? 1 : 0.3, transition: 'opacity 0.15s, transform 0.15s', transform: fire ? 'scale(1.15)' : 'scale(1)' }}
      >
        {Icons.fire(fire)}
      </button>
      <div style={{ fontSize: 12, color: '#334155', flexShrink: 0 }}>{fmtTicks(track.RunTimeTicks)}</div>
    </div>
  );
}
