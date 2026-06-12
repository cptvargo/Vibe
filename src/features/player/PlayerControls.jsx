import { Icons } from '../../components/Icons';

const DIM    = 'rgba(255,255,255,0.35)';
const ACTIVE = 'rgba(255,255,255,0.90)';

export function PlayerControls({ isPlaying, isShuffle, repeatMode, accent, volume, onToggle, onNext, onPrev, onShuffle, onRepeat, onVolume }) {
  const repeatAll = repeatMode === 'all' || (repeatMode !== 'none' && repeatMode !== 'one');
  const repeatOne = repeatMode === 'one';

  return (
    <>
      {/* Shuffle / Prev / Play / Next / Repeat */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 32 }}>
        <button onClick={onShuffle} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          {Icons.shuffle(isShuffle ? ACTIVE : DIM)}
          {isShuffle && <div style={{ width: 4, height: 4, borderRadius: '50%', background: ACTIVE }} />}
        </button>

        <button onClick={onPrev} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', width: 52, height: 52, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Icons.prev('rgba(255,255,255,0.85)')}
        </button>

        <button onClick={onToggle} style={{ width: 70, height: 70, borderRadius: '50%', background: accent, border: 'none', cursor: 'pointer', boxShadow: `0 0 32px ${accent}66, 0 4px 20px rgba(0,0,0,0.4)`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s, box-shadow 0.2s, background 0.35s ease' }}>
          {isPlaying ? Icons.pause('#fff') : Icons.play('#fff')}
        </button>

        <button onClick={onNext} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', width: 52, height: 52, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Icons.next('rgba(255,255,255,0.85)')}
        </button>

        <button onClick={onRepeat} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative' }}>
          {Icons.repeat(repeatAll || repeatOne ? ACTIVE : DIM)}
          {repeatOne && (
            <div style={{ position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: '50%', background: ACTIVE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#080810' }}>1</div>
          )}
          {repeatAll && <div style={{ width: 4, height: 4, borderRadius: '50%', background: ACTIVE }} />}
        </button>
      </div>

      {/* Volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginBottom: 4 }}>
        {Icons.volLow('rgba(255,255,255,0.3)')}
        <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => onVolume(parseFloat(e.target.value))} style={{ flex: 1, accentColor: accent, background: `linear-gradient(to right, ${accent} ${volume * 100}%, rgba(255,255,255,0.12) ${volume * 100}%)` }} />
        {Icons.volHigh('rgba(255,255,255,0.3)')}
      </div>
    </>
  );
}
