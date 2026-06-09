import { TrackRow } from '../../components/TrackRow';

export function MostPlayedSection({ tracks, player, onPlay, onViewAll }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f1f5f9', letterSpacing: -0.3 }}>Most Played · This Month</h2>
        {tracks.length > 4 && (
          <button onClick={() => onViewAll?.(tracks)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#7c3aed', fontSize: 12, fontWeight: 600, padding: '4px 0' }}>
            All {tracks.length}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9,18 15,12 9,6" />
            </svg>
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {tracks.slice(0, 4).map((t, i) => (
          <TrackRow key={`mp-${t.Id}-${i}`} track={t} index={i} onPlay={() => onPlay(tracks, i)} isActive={player.currentTrack?.Id === t.Id} />
        ))}
      </div>
    </div>
  );
}
