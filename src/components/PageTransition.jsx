export function PageTransition({ children }) {
  return (
    <div style={{ position: 'absolute', inset: 0, animation: 'vibeSlideUp 0.36s cubic-bezier(0.32,0.72,0,1) both' }}>
      {children}
    </div>
  );
}
