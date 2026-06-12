import { useState, useEffect } from 'react';

export function Toast({ message, visible }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(90px + env(safe-area-inset-bottom))',
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.25s ease, transform 0.25s ease',
      pointerEvents: 'none',
      zIndex: 9999,
      background: 'rgba(30,30,50,0.92)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 24,
      padding: '9px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      whiteSpace: 'nowrap',
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="7" fill="#4ade80" />
        <polyline points="3.5,7 6,9.5 10.5,4.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9', letterSpacing: 0.1 }}>{message}</span>
    </div>
  );
}

export function useToast() {
  const [state, setState] = useState({ message: '', visible: false });
  const timerRef = { current: null };

  const show = (message, duration = 2500) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ message, visible: true });
    timerRef.current = setTimeout(() => setState(s => ({ ...s, visible: false })), duration);
  };

  return { toastMessage: state.message, toastVisible: state.visible, showToast: show };
}
