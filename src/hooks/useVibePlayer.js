import { useEffect, useCallback } from 'react';
import { vibePlayer } from '../audio/VibePlayer';
import { useVibeStore } from '../stores/vibeStore';

export function useVibePlayer() {
  const store = useVibeStore();

  useEffect(() => {
    const onTrack    = (e) => store.setCurrentTrack(e.detail.track);
    const onState    = (e) => store.setIsPlaying(e.detail.isPlaying);
    const onProgress = (e) => store.setProgress(e.detail.currentTime, e.detail.duration);
    const onShuffle  = (e) => store.setIsShuffle(e.detail.isShuffle);
    const onRepeat   = (e) => store.setRepeatMode(e.detail.repeatMode);

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

  const play         = useCallback((tracks, idx = 0) => { vibePlayer.setQueue(tracks, idx); store.setQueue(tracks, idx); }, []);
  const togglePlay   = useCallback(() => vibePlayer.togglePlay(), []);
  const next         = useCallback(() => vibePlayer.next(), []);
  const prev         = useCallback(() => vibePlayer.prev(), []);
  const seek         = useCallback((s) => vibePlayer.seek(s), []);
  const changeVolume = useCallback((v) => { store.setVolume(v); vibePlayer.setVolume(v); }, []);
  const toggleShuffle = useCallback(() => vibePlayer.toggleShuffle(), []);
  const cycleRepeat   = useCallback(() => vibePlayer.cycleRepeat(), []);
  const getWaveform   = useCallback(() => vibePlayer.getWaveformData(), []);

  return {
    ...store,
    play, togglePlay, next, prev, seek,
    changeVolume, toggleShuffle, cycleRepeat, getWaveform,
  };
}
