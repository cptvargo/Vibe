import { AlbumArt } from './AlbumArt';
import { HotIcon } from './HotIcon';
import { isHot } from '../utils/hotTracks';
import { fmtTicks } from '../utils/format';

export function TrackRow({ track, onPlay, isActive, index }) {
  return (
    <div
      onClick={() => onPlay(track)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px', borderRadius: 10, cursor: 'pointer', background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent' }}
    >
      {index !== undefined && (
        <span style={{ width: 20, textAlign: 'right', fontSize: 12, color: '#334155', flexShrink: 0 }}>
          {isActive ? '▶' : index + 1}
        </span>
      )}
      <AlbumArt track={track} size={44} radius={6} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: isActive ? '#a78bfa' : '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {track.Name}
          </div>
          {isHot(track.Id) && <HotIcon />}
        </div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>
          {track.AlbumArtist || track.Artists?.[0]} · {track.Album}
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#334155', flexShrink: 0 }}>{fmtTicks(track.RunTimeTicks)}</div>
    </div>
  );
}
