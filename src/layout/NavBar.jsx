import { Icons } from '../components/Icons';
import { useAccent } from '../features/player/useAccent';
import { controlledAccent } from '../utils/colorUtils';

const SW_MAGENTA = '#e040fb';

const items = [
  { id: 'home',    label: 'Home',    icon: Icons.home },
  { id: 'search',  label: 'Search',  icon: Icons.search },
  { id: 'library', label: 'Library', icon: Icons.library },
  { id: 'ai',      label: 'AI',      icon: Icons.sparkle, synthwave: true },
];

export function NavBar({ active, onChange, blocked = false }) {
  const accent = controlledAccent(useAccent());

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingTop: 'env(safe-area-inset-top)', pointerEvents: blocked ? 'none' : 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', height: 56 }}>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -1, marginRight: 12, flexShrink: 0, background: `linear-gradient(135deg, #f8fafc 30%, ${accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Vibe
        </div>
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {items.map((item) => {
            const on       = active === item.id;
            const btnColor = on ? (item.synthwave ? SW_MAGENTA : accent) : '#475569';
            const btnBg    = on ? (item.synthwave ? `${SW_MAGENTA}22` : `${accent}26`) : 'none';
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                style={{ background: btnBg, border: 'none', borderRadius: 8, color: btnColor, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
              >
                {item.icon(btnColor)}
                <span style={on && item.synthwave ? { background: `linear-gradient(90deg, ${SW_MAGENTA}, #b388ff)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : {}}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
