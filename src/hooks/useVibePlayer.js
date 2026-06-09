import { useEffect, useCallback, useRef } from 'react';
import { vibePlayer } from '../audio/VibePlayer';
import { usePlayerStore } from '../features/player/player.store';
import { extractColors, getCachedColors } from '../utils/colorExtract';
import { getAlbumImageUrl } from '../api/jellyfin';

// Apply extracted accent to CSS variable and store — called only when playback starts
function applyAccent(color) {
  if (!color) return;
  document.documentElement.style.setProperty('--color-accent', color);
  usePlayerStore.getState().setLockedAccent(color);
}

export function useVibePlayer() {
  const store = usePlayerStore();

  // Pending extracted accent — set on track change, applied on playback start
  const extractedRef = useRef({ accent: null });
  const pendingId    = useRef(null);

  useEffect(() => {
    const onTrack = (e) => {
      const track = e.detail.track;
      usePlayerStore.getState().setCurrentTrack(track);

      // Extract accent from album art; guard against stale responses
      const id = track.Id;
      pendingId.current = id;
      extractColors(getAlbumImageUrl(track, 200)).then((c) => {
        if (pendingId.current !== id) return;
        const accent = c.vibrant?.hex ?? null;
        extractedRef.current = { accent };
        // If already playing (e.g. sweet-fade track change), apply immediately
        if (vibePlayer.isPlaying && accent) applyAccent(accent);
      });
    };

    const onState = (e) => {
      usePlayerStore.getState().setIsPlaying(e.detail.isPlaying);
      // Lock accent only when playback starts, never on album browse
      if (e.detail.isPlaying && extractedRef.current.accent) {
        applyAccent(extractedRef.current.accent);
      }
    };

    const onProgress = (e) => usePlayerStore.getState().setProgress(e.detail.currentTime, e.detail.duration);
    const onShuffle  = (e) => usePlayerStore.getState().setIsShuffle(e.detail.isShuffle);
    const onRepeat   = (e) => usePlayerStore.getState().setRepeatMode(e.detail.repeatMode);

    vibePlayer.addEventListener('track-changed',   onTrack);
    vibePlayer.addEventListener('playback-state',  onState);
    vibePlayer.addEventListener('progress',        onProgress);
    vibePlayer.addEventListener('shuffle-changed', onShuffle);
    vibePlayer.addEventListener('repeat-changed',  onRepeat);

    return () => {
      vibePlayer.removeEventListener('track-changed',   onTrack);
      vibePlayer.removeEventListener('playback-state',  onState);
      vibePlayer.removeEventListener('progress',        onProgress);
      vibePlayer.removeEventListener('shuffle-changed', onShuffle);
      vibePlayer.removeEventListener('repeat-changed',  onRepeat);
    };
  }, []);

  useEffect(() => { vibePlayer.setVolume(store.volume); }, [store.volume]);

  const play = useCallback((tracks, idx = 0) => {
    const nextTrack = tracks[idx];
    usePlayerStore.getState().setCurrentTrack(nextTrack);
    usePlayerStore.getState().setQueue(tracks, idx);
    // Apply accent synchronously from cache so the play button has color immediately
    const cached = getCachedColors(getAlbumImageUrl(nextTrack, 200));
    const cachedAccent = cached?.vibrant?.hex ?? null;
    if (cachedAccent) applyAccent(cachedAccent);
    vibePlayer.setQueue(tracks, idx);
  }, []);

  const togglePlay   = useCallback(() => vibePlayer.togglePlay(), []);
  const next         = useCallback(() => vibePlayer.next(), []);
  const prev         = useCallback(() => vibePlayer.prev(), []);
  const seek         = useCallback((s) => vibePlayer.seek(s), []);
  const changeVolume = useCallback((v) => { store.setVolume(v); vibePlayer.setVolume(v); }, [store.setVolume]);
  const toggleShuffle = useCallback(() => vibePlayer.toggleShuffle(), []);
  const cycleRepeat   = useCallback(() => vibePlayer.cycleRepeat(), []);
  const getWaveform   = useCallback(() => vibePlayer.getWaveformData(), []);

  const playAt = useCallback(async (index) => {
    const { queue } = usePlayerStore.getState();
    if (index < 0 || index >= queue.length) return;
    usePlayerStore.getState().setCurrentTrack(queue[index]);
    vibePlayer.queueIndex = index;
    await vibePlayer.playTrack(queue[index]);
  }, []);

  return {
    ...store,
    play, togglePlay, next, prev, seek,
    changeVolume, toggleShuffle, cycleRepeat, getWaveform, playAt,
    queue:      store.queue,
    queueIndex: store.queueIndex,
  };
}
