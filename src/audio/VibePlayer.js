// ─────────────────────────────────────────────
//  Vibe · Audio Engine (iOS SAFE HYBRID)
// ─────────────────────────────────────────────

import {
  getStreamUrl,
  getStreamUrlFallback,
  reportPlaybackStart,
  reportPlaybackStopped,
  markPlayed
} from '../api/jellyfin';

const IS_IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

class VibePlayer extends EventTarget {
  constructor() {
    super();

    this.audio = new Audio();

    this.queue = [];
    this.queueIndex = -1;
    this.isPlaying = false;
    this.isShuffle = false;
    this.repeatMode = 'none';
    this.volume = 0.8;
    this.currentTrack = null;
    this.duration = 0;
    this.currentTime = 0;

    this._progressInterval = null;

    this._initAudio();
  }

  _initAudio() {
    const a = this.audio;

    a.crossOrigin = 'anonymous';
    a.preload = 'auto';

    // ✅ iOS critical flags
    a.setAttribute('playsinline', '');
    a.setAttribute('webkit-playsinline', '');
    a.setAttribute('x-webkit-airplay', 'allow');

    a.addEventListener('ended', () => this.next());

    this._progressInterval = setInterval(() => {
      if (!a || a.paused) return;

      this.currentTime = a.currentTime;

      if (a.duration && isFinite(a.duration)) {
        this.duration = a.duration;
      }

      this._emit('progress', {
        currentTime: this.currentTime,
        duration: this.duration
      });

      // 🔥 NEW: keep lock screen in sync
      if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
        try {
          navigator.mediaSession.setPositionState({
            duration: this.duration || 0,
            playbackRate: 1,
            position: this.currentTime || 0
          });
        } catch (e) {}
      }

    }, 250);
  }

  // ── Queue ─────────────────────────────────────
  setQueue(tracks, startIndex = 0) {
    this.queue = tracks;
    this.queueIndex = startIndex;
    this.playTrack(tracks[startIndex]);
  }

  addToQueue(track) {
    this.queue.push(track);
  }

  addNext(track) {
    this.queue.splice(this.queueIndex + 1, 0, track);
  }

  _hasNext() {
    if (this.repeatMode !== 'none') return true;
    return this.queueIndex < this.queue.length - 1;
  }

  _getNextIndex() {
    if (this.repeatMode === 'one') return this.queueIndex;

    if (this.isShuffle) {
      let idx;
      do {
        idx = Math.floor(Math.random() * this.queue.length);
      } while (idx === this.queueIndex && this.queue.length > 1);
      return idx;
    }

    if (this.queueIndex < this.queue.length - 1) return this.queueIndex + 1;
    if (this.repeatMode === 'all') return 0;

    return -1;
  }

  // ── Playback ──────────────────────────────────
  async playTrack(track) {
    const audio = this.audio;

    audio.pause();
    audio.src = '';
    audio.load();

    audio.src = getStreamUrl(track.Id) + `&t=${Date.now()}`;
    audio.muted = false;
    audio.volume = this.volume;

    try {
      await audio.play();
    } catch (e) {
      try {
        audio.src = getStreamUrlFallback(track.Id);
        await audio.play();
      } catch (e2) {
        console.error('Playback failed:', e2);
        return;
      }
    }

    this.isPlaying = true;
    this.currentTrack = track;

    // 🔥 NEW: sync playback state
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }

    this._emit('track-changed', { track });
    this._emit('playback-state', { isPlaying: true });

    reportPlaybackStart(track.Id);
    this._updateMediaSession(track);
  }

  async next() {
    const idx = this._getNextIndex();

    if (idx === -1) {
      this.isPlaying = false;
      this._emit('playback-state', { isPlaying: false });
      return;
    }

    this.queueIndex = idx;
    await this.playTrack(this.queue[idx]);
  }

  async prev() {
    if (this.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }

    const idx = Math.max(0, this.queueIndex - 1);
    this.queueIndex = idx;
    await this.playTrack(this.queue[idx]);
  }

  async togglePlay() {
    const audio = this.audio;

    if (!audio.src) return;

    if (audio.paused) {
      try {
        await audio.play();
        this.isPlaying = true;
      } catch (e) {
        return;
      }
    } else {
      audio.pause();
      this.isPlaying = false;
    }

    // 🔥 CRITICAL FIX
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
    }

    this._emit('playback-state', { isPlaying: this.isPlaying });
  }

  seek(seconds) {
    this.audio.currentTime = seconds;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    this.audio.volume = this.volume;
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    this._emit('shuffle-changed', { isShuffle: this.isShuffle });
  }

  cycleRepeat() {
    const modes = ['none', 'one', 'all'];
    this.repeatMode = modes[(modes.indexOf(this.repeatMode) + 1) % modes.length];
    this._emit('repeat-changed', { repeatMode: this.repeatMode });
  }

  // ── Media Session ─────────────────────────────
  _updateMediaSession(track) {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.Name,
      artist: track.AlbumArtist || track.Artists?.[0],
      album: track.Album,
      artwork: [
        {
          src: getStreamUrl(track.Id),
          sizes: '512x512',
          type: 'image/jpeg'
        }
      ]
    });

    // 🔥 keep in sync
navigator.mediaSession.playbackState = 'playing';

// 🔥 FIXED: explicit play handler
navigator.mediaSession.setActionHandler('play', async () => {
  try {
    const audio = this.audio;

    // Save state
    const time = audio.currentTime;
    const src = audio.src;

    // 🔥 HARD REBIND (this is the fix)
    audio.src = '';
    audio.src = src;

    audio.currentTime = time;
    audio.muted = false;
    audio.volume = this.volume;

    await audio.play();

    this.isPlaying = true;

    navigator.mediaSession.playbackState = 'playing';
    this._emit('playback-state', { isPlaying: true });

  } catch (e) {
    console.warn('Lockscreen play failed:', e);
  }
});

// 🔥 FIXED: explicit pause handler
navigator.mediaSession.setActionHandler('pause', () => {
  const audio = this.audio;

  audio.pause();

  this.isPlaying = false;

  navigator.mediaSession.playbackState = 'paused';
  this._emit('playback-state', { isPlaying: false });
});

// keep these the same
navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
navigator.mediaSession.setActionHandler('seekto', (details) => {
  if (details.seekTime != null) this.seek(details.seekTime);
});
  }

  _emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

export const vibePlayer = new VibePlayer();