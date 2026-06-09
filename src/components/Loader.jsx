export function Loader() {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '16px 0' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', animation: `vbounce 0.8s ease-in-out ${i * 0.15}s infinite alternate` }} />
      ))}
      <style>{`@keyframes vbounce{from{transform:translateY(0);opacity:.4}to{transform:translateY(-8px);opacity:1}}`}</style>
    </div>
  );
}
