import { Icons } from '../components/Icons';
import { useAccent } from '../features/player/useAccent';
import { controlledAccent } from '../utils/colorUtils';

const items = [
  { id: 'home',    label: 'Home',    icon: Icons.home },
  { id: 'search',  label: 'Search',  icon: Icons.search },
  { id: 'library', label: 'Library', icon: Icons.library },
];

export function NavBar({ active, onChange, blocked = false }) {
  const accent = controlledAccent(useAccent());

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingTop: 'env(safe-area-inset-top)', pointerEvents: blocked ? 'none' : 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', height: 56 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -1, marginRight: 28, background: `linear-gradient(135deg, #f8fafc 30%, ${accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Vibe
        </div>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {items.map((item) => {
            const on = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                style={{ background: on ? `${accent}26` : 'none', border: 'none', borderRadius: 8, color: on ? accent : '#475569', padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {item.icon(on ? accent : '#475569')}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
