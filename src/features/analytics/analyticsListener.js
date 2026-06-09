// One-time setup — call initAnalyticsListener() once at app boot (main.jsx).
// Attaches to vibePlayer events without touching useVibePlayer.js.

import { vibePlayer } from '../../audio/VibePlayer';
import { startPlay, updateProgress, finalizePlay } from './recordPlay';

let _initialized = false;

export function initAnalyticsListener() {
  if (_initialized) return;
  _initialized = true;

  vibePlayer.addEventListener('track-changed', (e) => {
    finalizePlay();
    if (e.detail?.track) startPlay(e.detail.track);
  });

  // progress fires every 250ms from VibePlayer — updateProgress throttles internally to 5s
  vibePlayer.addEventListener('progress', (e) => {
    updateProgress(e.detail.currentTime, e.detail.duration);
  });

  // Best-effort finalize when the tab closes mid-track
  window.addEventListener('beforeunload', finalizePlay);
}
