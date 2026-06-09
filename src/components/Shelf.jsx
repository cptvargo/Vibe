export function ScrollRow({ children, gap = 16 }) {
  return (
    <div style={{ display: 'flex', gap, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
      {children}
    </div>
  );
}

export function SectionHeader({ title }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f1f5f9', letterSpacing: -0.3 }}>{title}</h2>
    </div>
  );
}
