import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const usePlayerStore = create(
  persist(
    (set) => ({
      currentTrack:   null,
      isPlaying:      false,
      currentTime:    0,
      duration:       0,
      volume:         0.8,
      isShuffle:      false,
      repeatMode:     'none',
      queue:          [],
      queueIndex:     -1,
      playerExpanded: false,
      lockedAccent:   null,

      setCurrentTrack:   (t)    => set({ currentTrack: t }),
      setIsPlaying:      (v)    => set({ isPlaying: v }),
      setProgress:       (c, d) => set({ currentTime: c, duration: d }),
      setVolume:         (v)    => set({ volume: v }),
      setIsShuffle:      (v)    => set({ isShuffle: v }),
      setRepeatMode:     (v)    => set({ repeatMode: v }),
      setQueue:          (q, i) => set({ queue: q, queueIndex: i }),
      setPlayerExpanded: (v)    => set({ playerExpanded: v }),
      setLockedAccent:   (v)    => set({ lockedAccent: v }),
    }),
    {
      name: 'vibe-player-store',
      partialize: (s) => ({ volume: s.volume, isShuffle: s.isShuffle, repeatMode: s.repeatMode }),
    }
  )
);
