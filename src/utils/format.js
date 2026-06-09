export const fmtTime = (s) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export const fmtTicks = (t) => fmtTime((t || 0) / 10000000);
