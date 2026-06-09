export function StationCard({ icon, title, subtitle, accent, onPlay }) {
  return (
    <div
      onClick={onPlay}
      style={{ flexShrink: 0, width: 160, borderRadius: 14, padding: 16, background: `linear-gradient(135deg, ${accent}28, ${accent}0a)`, border: `1px solid ${accent}30`, cursor: 'pointer' }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, marginBottom: 12, background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 16px ${accent}33` }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 3, letterSpacing: -0.2 }}>{title}</div>
      <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{subtitle}</div>
    </div>
  );
}
