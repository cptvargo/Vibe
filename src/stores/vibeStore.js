import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useVibeStore = create(
  persist(
    (set, get) => ({
      currentTrack:    null,
      isPlaying:       false,
      currentTime:     0,
      duration:        0,
      volume:          0.8,
      isShuffle:       false,
      repeatMode:      'none',
      queue:           [],
      queueIndex:      -1,
      activeView:      'home',
      playerExpanded:  false,
      theme:           'dark',

      setCurrentTrack:   (t)    => set({ currentTrack: t }),
      setIsPlaying:      (v)    => set({ isPlaying: v }),
      setProgress:       (c, d) => set({ currentTime: c, duration: d }),
      setVolume:         (v)    => set({ volume: v }),
      setIsShuffle:      (v)    => set({ isShuffle: v }),
      setRepeatMode:     (v)    => set({ repeatMode: v }),
      setQueue:          (q, i) => set({ queue: q, queueIndex: i }),
      setActiveView:     (v)    => set({ activeView: v }),
      setPlayerExpanded: (v)    => set({ playerExpanded: v }),
    }),
    {
      name: 'vibe-store',
      partialize: (s) => ({ volume: s.volume, isShuffle: s.isShuffle, repeatMode: s.repeatMode, theme: s.theme }),
    }
  )
);
