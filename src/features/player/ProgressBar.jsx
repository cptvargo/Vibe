import { fmtTime } from '../../utils/format';

export function ProgressBar({ currentTime, duration, onSeek, accent }) {
  return (
    <div style={{ width: '100%', marginBottom: 28 }}>
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={currentTime}
        onChange={(e) => onSeek(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: accent, background: `linear-gradient(to right, ${accent} ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.12) ${duration ? (currentTime / duration) * 100 : 0}%)` }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, letterSpacing: 0.3 }}>
        <span>{fmtTime(currentTime)}</span>
        <span>{fmtTime(duration)}</span>
      </div>
    </div>
  );
}
