export const Icons = {
  home: (c) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  ),
  search: (c) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  library: (c) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
  prev: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c}>
      <polygon points="19,20 9,12 19,4" />
      <line x1="5" y1="4" x2="5" y2="20" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  next: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c}>
      <polygon points="5,4 15,12 5,20" />
      <line x1="19" y1="4" x2="19" y2="20" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  play: (c) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={c}>
      <polygon points="6,3 20,12 6,21" />
    </svg>
  ),
  pause: (c) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={c}>
      <rect x="5" y="3" width="4" height="18" rx="1.5" />
      <rect x="15" y="3" width="4" height="18" rx="1.5" />
    </svg>
  ),
  shuffle: (c) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16,3 21,3 21,8" /><line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21,16 21,21 16,21" /><line x1="15" y1="15" x2="21" y2="21" />
    </svg>
  ),
  repeat: (c) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17,1 21,5 17,9" /><path d="M3 11V9a4 4 0 014-4h14" />
      <polyline points="7,23 3,19 7,15" /><path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  ),
  volLow: (c) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  ),
  volHigh: (c) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
      <path d="M19.07 4.93a10 10 0 010 14.14" /><path d="M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  ),
  chevronDown: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  ),
  fire: (filled, color = '#f97316') => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c0 0-5 6.5-5 11a5 5 0 0 0 10 0c0-4.5-5-11-5-11z" />
      <path d="M12 13c0 0-2 2.5-2 3.5a2 2 0 0 0 4 0c0-1-2-3.5-2-3.5z" fill={filled ? '#fff6' : 'none'} stroke="none" />
    </svg>
  ),
  cloudDownload: (c = '#fff') => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 17 12 21 16 17" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
    </svg>
  ),
  sparkle: (c = '#fff') => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={c}>
      <path d="M12 2 C12 2 13.2 8.8 16 11 C18.8 13.2 24 12 24 12 C24 12 18.8 10.8 16 13 C13.2 15.2 12 22 12 22 C12 22 10.8 15.2 8 13 C5.2 10.8 0 12 0 12 C0 12 5.2 13.2 8 11 C10.8 8.8 12 2 12 2Z" />
      <path d="M19.5 4 C19.5 4 20 6.5 21.5 7.5 C23 8.5 24 8 24 8 C24 8 23 7.5 21.5 8.5 C20 9.5 19.5 12 19.5 12 C19.5 12 19 9.5 17.5 8.5 C16 7.5 15 8 15 8 C15 8 16 8.5 17.5 7.5 C19 6.5 19.5 4 19.5 4Z" opacity="0.6" />
    </svg>
  ),
  cloudDone: (c = '#4ade80') => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
      <polyline points="9 13 11 15 15 11" />
    </svg>
  ),
};
