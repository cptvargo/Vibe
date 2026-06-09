const HOT_THRESHOLD = 5;

export const getPlayCounts = () => {
  try { return JSON.parse(localStorage.getItem('vibe_play_counts') || '{}'); }
  catch { return {}; }
};

export const recordPlay = (trackId) => {
  try {
    const counts = getPlayCounts();
    counts[trackId] = (counts[trackId] || 0) + 1;
    localStorage.setItem('vibe_play_counts', JSON.stringify(counts));
    return counts[trackId];
  } catch { return 0; }
};

export const isHot = (trackId) => (getPlayCounts()[trackId] || 0) >= HOT_THRESHOLD;
