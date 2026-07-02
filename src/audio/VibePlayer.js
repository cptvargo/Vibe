// ─────────────────────────────────────────────
//  Vibe · Audio Engine
//  Playback via native <audio> (iOS background safe).
//  Analysis via separate muted element connected to Web Audio.
// ─────────────────────────────────────────────

import { getStreamUrl, getStreamUrlFallback, reportPlaybackStart, reportPlaybackStopped, markPlayed, getAlbumImageUrl } from '../api/jellyfin';
import { getOfflineUrl } from '../utils/offlineStorage';

// Synchronous native detection — window.Capacitor is injected by the Capacitor runtime
// before any JS runs, so this is always accurate on first evaluation.
const IS_NATIVE = !!(window.Capacitor?.isNativePlatform?.());

const FADE_DURATION   = 6;   // seconds
const FADE_STEPS      = 120; // steps over FADE_DURATION
const PRELOAD_BEFORE  = 25;  // seconds before end to preload next
const PRELOAD_AFTER   = 4;   // seconds after start to preload next (so manual skips feel instant)

class VibePlayer extends EventTarget {
  constructor() {
    super();
    this.ctx          = null;
    this.analyser     = null;
    this._audioA      = null;
    this._audioB      = null;
    this._analyserEl  = null; // muted, connected to Web Audio for analysis only
    this.activeSlot   = 'A';
    this.queue        = [];
    this.queueIndex   = -1;
    this.isPlaying    = false;
    this.isShuffle    = false;
    this.repeatMode   = 'none';
    this.volume       = 0.8;
    this.currentTrack = null;
    this.duration     = 0;
    this.currentTime  = 0;
    this._isFading    = false;
    this._preloaded   = false;
    this._progressInterval = null;
    this._playGeneration   = 0;
    this._isNative    = IS_NATIVE;
    this._native      = null;
    this._nativeReady = false;
  }

  async _initNativeAudio() {
    if (!IS_NATIVE) return;
    try {
      const { registerPlugin } = await import('@capacitor/core');
      this._native = registerPlugin('NativeAudio');
      // Verify the plugin is actually connected (throws if Swift side isn't registered)
      await this._native.getDuration();
      this._native.addListener('timeupdate', ({ currentTime, slot }) => {
        if (slot !== this.activeSlot) return;
        this.currentTime = currentTime;
        if (this.duration < 1) {
          this._native.getDuration().then(({ duration }) => { if (duration > 0) this.duration = duration; }).catch(() => {});
        }
        if (this.duration > 0) {
          this._emit('progress', { currentTime, duration: this.duration });
          const remaining = this.duration - currentTime;
          if (currentTime > 2 && remaining <= PRELOAD_BEFORE && !this._preloaded && this._hasNext()) this._preloadNext();
          if (remaining <= FADE_DURATION && !this._isFading && this._hasNext()) this._sweetFade();
        }
      });
      this._native.addListener('ended', ({ slot }) => {
        if (slot !== this.activeSlot || this._isFading) return;
        this.next();
      });
      this._nativeReady = true;
    } catch(e) {
      console.warn('[Vibe] Native audio init failed:', e);
      this._isNative = false; // fall back to HTML5 if plugin fails
    }
  }

  _initCtx() {
    if (this.ctx) return;
    if (IS_NATIVE && !this._native) this._initNativeAudio();
    this.ctx      = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    // Route through a silent gain — keeps the graph rendering for analysis without audible output
    const silentGain = this.ctx.createGain();
    silentGain.gain.value = 0.00001; // -100 dB: inaudible but non-zero keeps Chromium processing the graph
    this.analyser.connect(silentGain);
    silentGain.connect(this.ctx.destination);

    // ── Playback elements — NOT connected to Web Audio ────────────
    // Native <audio> plays through iOS audio session in background.
    this._audioA = new Audio();
    this._audioB = new Audio();
    [this._audioA, this._audioB].forEach(a => {
      a.preload     = 'auto';
      a.playsInline = true;
      a.volume      = this.volume;
    });

    // ── Analysis element — muted, Web Audio only ──────────────────
    // Mirrors the playing track when page is visible; pauses on hide.
    this._analyserEl = new Audio();
    this._analyserEl.crossOrigin = 'anonymous';
    this._analyserEl.preload     = 'auto'; // must buffer continuously; 'none' starves after ~2s
    this._analyserEl.volume      = 0;
    this._analyserEl.muted       = true;
    const analyserSrc = this.ctx.createMediaElementSource(this._analyserEl);
    analyserSrc.connect(this.analyser);

    // Revive analyser element if it stalls or pauses unexpectedly (but not when we
    // intentionally paused it on tab hide — checked via visibilityState).
    this._analyserEl.addEventListener('pause', () => {
      if (this.isPlaying && document.visibilityState === 'visible') {
        this._analyserEl.play().catch(() => {});
      }
    });
    this._analyserEl.addEventListener('stalled', () => {
      if (this.isPlaying && document.visibilityState === 'visible') {
        setTimeout(() => this._analyserEl.play().catch(() => {}), 200);
      }
    });

    // ── Progress polling ──────────────────────────────────────────
    this._progressInterval = setInterval(() => {
      const audio = this._activeAudio();
      if (!audio || audio.paused) return;
      this.currentTime = audio.currentTime;
      const dur = audio.duration;
      if (!dur || !isFinite(dur) || dur < 1) return;
      this.duration = dur;
      this._emit('progress', { currentTime: this.currentTime, duration: this.duration });
      // Watchdog: revive analyser element if it has stopped while main audio plays
      if (document.visibilityState === 'visible' && this._analyserEl?.paused && this._analyserEl?.src) {
        this._analyserEl.play().catch(() => {});
      }
      const remaining = this.duration - this.currentTime;
      if (this.currentTime < 2) return;
      if (remaining <= PRELOAD_BEFORE && !this._preloaded && this._hasNext()) this._preloadNext();
      if (remaining <= FADE_DURATION  && !this._isFading   && this._hasNext()) this._sweetFade();
    }, 250);

    // ── Ended guards ──────────────────────────────────────────────
    this._audioA.addEventListener('ended', () => {
      if (this.activeSlot !== 'A' || this._isFading) return;
      const a = this._audioA;
      if (a.duration && a.currentTime < a.duration - 1.5) return; // spurious ended
      this.next();
    });
    this._audioB.addEventListener('ended', () => {
      if (this.activeSlot !== 'B' || this._isFading) return;
      const a = this._audioB;
      if (a.duration && a.currentTime < a.duration - 1.5) return;
      this.next();
    });

    // ── Visibility: pause/resume analyser; keep native audio alive ─
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this._analyserEl.pause();
      } else {
        this._syncAnalyser();
        this._resumeAudio();
      }
    });
    window.addEventListener('focus',    () => this._resumeAudio());
    window.addEventListener('pageshow', () => this._resumeAudio());
  }

  _activeAudio() { return this.activeSlot === 'A' ? this._audioA : this._audioB; }

  // ── Analyser sync ─────────────────────────────────────────────
  _syncAnalyser() {
    const audio = this._activeAudio();
    if (!audio?.src || !this.ctx) return;
    if (this._analyserEl.src !== audio.src) {
      this._analyserEl.src = audio.src;
      // No load() call — setting src with preload='auto' starts buffering immediately.
      // No currentTime seek — slight offset is imperceptible for a visualizer and
      // seeking resets the buffer, which is what was causing the 2-second stall.
    }
    if (!audio.paused) {
      this.ctx.resume().catch(() => {});
      this._analyserEl.play().catch(() => {});
    }
  }

  async _resumeAudio() {
    if (!this.isPlaying) return;
    const audio = this._activeAudio();
    if (audio?.src && audio.paused && !audio.ended) {
      try { await audio.play(); } catch(e) {}
    }
  }

  // ── Queue ─────────────────────────────────────────────────────
  // Pre-buffer a track without playing — call when user opens an album so
  // audio data starts arriving before they hit play.
  async prime(track) {
    if (!track) return;
    this._initCtx();
    const offlineUrl = await getOfflineUrl(track.Id);
    const inactive = this.activeSlot === 'A' ? this._audioB : this._audioA;
    // Only prime if this track isn't already loaded somewhere
    const streamUrl = offlineUrl || getStreamUrl(track.Id);
    if (inactive.src !== streamUrl && this._activeAudio().src !== streamUrl) {
      inactive.src = streamUrl;
      inactive.volume = 0;
      inactive.load();
    }
  }

  setQueue(tracks, startIndex = 0) {
    this.queue      = tracks;
    this.queueIndex = startIndex;
    this.playTrack(tracks[startIndex]);
  }
  addToQueue(track) { this.queue.push(track); }
  addNext(track)    { this.queue.splice(this.queueIndex + 1, 0, track); }

  _hasNext() {
    if (this.repeatMode !== 'none') return true;
    return this.queueIndex < this.queue.length - 1;
  }

  _getNextIndex() {
    if (this.repeatMode === 'one') return this.queueIndex;
    if (this.isShuffle) {
      let idx;
      do { idx = Math.floor(Math.random() * this.queue.length); }
      while (idx === this.queueIndex && this.queue.length > 1);
      return idx;
    }
    if (this.queueIndex < this.queue.length - 1) return this.queueIndex + 1;
    if (this.repeatMode === 'all') return 0;
    return -1;
  }

  // ── Playback ──────────────────────────────────────────────────
  async playTrack(track) {
    this._initCtx();
    const gen = ++this._playGeneration;

    const offlineUrl = await getOfflineUrl(track.Id);
    if (gen !== this._playGeneration) return;
    const streamUrl = offlineUrl || getStreamUrl(track.Id);

    let usedNative = false;
    if (this._isNative && this._nativeReady && this._native) {
      // ── Native AVPlayer path ──────────────────────────────────
      try {
        await this._native.play({ url: streamUrl, slot: this.activeSlot });
        if (gen !== this._playGeneration) return;
        this.duration = 0;
        this._native.getDuration().then(({ duration }) => { if (duration > 0) this.duration = duration; }).catch(() => {});
        usedNative = true;
      } catch(e) {
        console.warn('[Vibe] Native play failed, falling back to HTML5:', e);
      }
    }

    if (!usedNative) {
      // ── HTML5 audio path (PWA / web / native fallback) ────────
      const audio = this._activeAudio();
      const other = this.activeSlot === 'A' ? this._audioB : this._audioA;
      audio.pause();
      audio.src = '';
      audio.load();
      audio.playsInline = true;
      audio.volume = this.volume;
      other.pause();
      other.volume = 0;
      audio.src = streamUrl;
      try {
        await audio.play();
        if (gen !== this._playGeneration) { audio.pause(); return; }
      } catch(e) {
        if (gen !== this._playGeneration) return;
        console.warn('Direct stream failed, trying fallback...', e);
        try {
          audio.src = getStreamUrlFallback(track.Id);
          await audio.play();
          if (gen !== this._playGeneration) { audio.pause(); return; }
        } catch(e2) { console.error('Fallback stream also failed:', e2); return; }
      }
      if (document.visibilityState === 'visible') this._syncAnalyser();
    }

    this.isPlaying    = true;
    this.currentTrack = track;
    this._isFading    = false;
    this._preloaded   = false;
    this._emit('track-changed', { track });
    this._emit('playback-state', { isPlaying: true });
    reportPlaybackStart(track.Id);
    this._updateMediaSession(track);
    if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
      try { navigator.mediaSession.setPositionState({ duration: track.RunTimeTicks ? track.RunTimeTicks / 10_000_000 : 0, playbackRate: 1, position: 0 }); } catch (_) {}
    }
    // Preload next track early so manual skips feel instant
    setTimeout(() => {
      if (this.currentTrack?.Id === track.Id && !this._preloaded && this._hasNext()) {
        this._preloadNext();
      }
    }, PRELOAD_AFTER * 1000);
  }

  async next() {
    this._isFading  = false;
    this._preloaded = false;
    const idx = this._getNextIndex();
    if (idx === -1) { this.isPlaying = false; this._emit('playback-state', { isPlaying: false }); return; }
    this.queueIndex = idx;
    await this.playTrack(this.queue[idx]);
  }

  async prev() {
    this._isFading  = false;
    this._preloaded = false;
    if (this.currentTime > 3) {
      if (this._isNative && this._nativeReady && this._native) {
        await this._native.seek({ seconds: 0 }).catch(() => {});
      } else {
        this._activeAudio().currentTime = 0;
      }
      return;
    }
    const idx = Math.max(0, this.queueIndex - 1);
    this.queueIndex = idx;
    await this.playTrack(this.queue[idx]);
  }

  async togglePlay() {
    if (this._isNative && this._nativeReady && this._native) {
      if (this.isPlaying) {
        await this._native.pause().catch(() => {});
        this.isPlaying = false;
      } else {
        await this._native.resume().catch(() => {});
        this.isPlaying = true;
      }
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
      this._updateNowPlaying();
      this._emit('playback-state', { isPlaying: this.isPlaying });
      return;
    }
    const audio = this._activeAudio();
    if (!audio.src) return;
    if (audio.paused) {
      if (this.ctx?.state === 'suspended') await this.ctx.resume().catch(() => {});
      try {
        await audio.play();
        this.isPlaying = true;
        if (document.visibilityState === 'visible') this._syncAnalyser();
      } catch(e) { console.warn('Play failed:', e); return; }
    } else {
      audio.pause();
      this._analyserEl.pause();
      this.isPlaying = false;
    }
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
    this._emit('playback-state', { isPlaying: this.isPlaying });
  }

  seek(seconds) {
    if (this._isNative && this._nativeReady && this._native) {
      this._native.seek({ seconds }).catch(() => {});
      this.currentTime = seconds;
      return;
    }
    this._activeAudio().currentTime = seconds;
    if (this._analyserEl.src) this._analyserEl.currentTime = seconds;
    if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
      try { navigator.mediaSession.setPositionState({ duration: this.duration, playbackRate: 1, position: seconds }); } catch (_) {}
    }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this._isNative && this._nativeReady && this._native) {
      this._native.setVolume({ volume: this.volume, slot: this.activeSlot }).catch(() => {});
      return;
    }
    const audio = this._activeAudio();
    if (audio) audio.volume = this.volume;
  }

  _updateNowPlaying() {
    if (!this._isNative || !this._native || !this.currentTrack) return;
    this._native.setNowPlaying({
      title:       this.currentTrack.Name || '',
      artist:      this.currentTrack.AlbumArtist || this.currentTrack.Artists?.[0] || '',
      album:       this.currentTrack.Album || '',
      duration:    this.duration,
      currentTime: this.currentTime,
      isPlaying:   this.isPlaying,
      artworkUrl:  getAlbumImageUrl(this.currentTrack, 300) || '',
    }).catch(() => {});
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

  // ── Sweet Fade ────────────────────────────────────────────────
  async _preloadNext() {
    this._preloaded = true;
    const nextIdx = this._getNextIndex();
    if (nextIdx === -1) return;
    const nextTrack = this.queue[nextIdx];
    const offlineUrl = await getOfflineUrl(nextTrack.Id);
    const streamUrl = offlineUrl || getStreamUrl(nextTrack.Id);
    if (this._isNative && this._nativeReady && this._native) {
      const nextSlot = this.activeSlot === 'A' ? 'B' : 'A';
      this._native.preload({ url: streamUrl, slot: nextSlot }).catch(() => {});
      return;
    }
    const nextAudio = this.activeSlot === 'A' ? this._audioB : this._audioA;
    nextAudio.pause();
    nextAudio.src = '';
    nextAudio.load();
    nextAudio.volume = 0;
    nextAudio.src = streamUrl;
  }

  async _sweetFade() {
    this._isFading = true;
    const nextIdx = this._getNextIndex();
    if (nextIdx === -1) return;

    const nextTrack = this.queue[nextIdx];
    const nextSlot  = this.activeSlot === 'A' ? 'B' : 'A';

    if (this._isNative && this._nativeReady && this._native) {
      const offlineUrl = await getOfflineUrl(nextTrack.Id);
      const streamUrl = offlineUrl || getStreamUrl(nextTrack.Id);
      await this._native.play({ url: streamUrl, slot: nextSlot }).catch(() => {});
      this._native.setVolume({ volume: 0, slot: this.activeSlot }).catch(() => {});
      const stepMs = (FADE_DURATION * 1000) / FADE_STEPS;
      const vol = this.volume;
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const t = Math.min(step / FADE_STEPS, 1);
        this._native.setVolume({ volume: vol * (1 - t), slot: this.activeSlot }).catch(() => {});
        this._native.setVolume({ volume: vol * t, slot: nextSlot }).catch(() => {});
        if (t >= 1) { clearInterval(timer); this._isFading = false; }
      }, stepMs);
      this.activeSlot   = nextSlot;
      this.queueIndex   = nextIdx;
      this.currentTrack = nextTrack;
      this._preloaded   = false;
      this.duration     = 0;
      this._emit('track-changed', { track: nextTrack });
      this._emit('playback-state', { isPlaying: true });
      markPlayed(this.queue[this.queueIndex - 1]?.Id);
      reportPlaybackStart(nextTrack.Id);
      this._updateMediaSession(nextTrack);
      return;
    }

    // HTML5 crossfade path
    const currAudio = this._activeAudio();
    const nextAudio = nextSlot === 'A' ? this._audioA : this._audioB;
    nextAudio.pause();
    nextAudio.src = '';
    nextAudio.load();
    nextAudio.volume = 0;
    nextAudio.playsInline = true;
    nextAudio.src = getStreamUrl(nextTrack.Id);
    try { await nextAudio.play(); } catch(e) { this._isFading = false; return; }

    const stepMs  = (FADE_DURATION * 1000) / FADE_STEPS;
    const startVol = this.volume;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const t = Math.min(step / FADE_STEPS, 1);
      currAudio.volume = startVol * (1 - t);
      nextAudio.volume = startVol * t;
      if (t >= 1) {
        clearInterval(timer);
        currAudio.pause();
        currAudio.src = '';
        this._isFading = false;
      }
    }, stepMs);

    this.activeSlot   = nextSlot;
    this.queueIndex   = nextIdx;
    this.currentTrack = nextTrack;
    this._preloaded   = false;
    this._emit('track-changed', { track: nextTrack });
    this._emit('playback-state', { isPlaying: true });
    markPlayed(this.queue[this.queueIndex - 1]?.Id);
    reportPlaybackStart(nextTrack.Id);
    this._updateMediaSession(nextTrack);
    if (document.visibilityState === 'visible') setTimeout(() => this._syncAnalyser(), 200);
  }

  // ── Media Session ─────────────────────────────────────────────
  _updateMediaSession(track) {
    if (this._isNative) { this._updateNowPlaying(); return; }
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   track.Name || '',
      artist:  track.AlbumArtist || track.Artists?.[0] || '',
      album:   track.Album || '',
      artwork: [{ src: getAlbumImageUrl(track, 300), sizes: '300x300', type: 'image/jpeg' }],
    });
    navigator.mediaSession.playbackState = 'playing';
    navigator.mediaSession.setActionHandler('play', () => {
      const audio = this._activeAudio();
      if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
      audio.play().catch(() => {});
      this.isPlaying = true;
      navigator.mediaSession.playbackState = 'playing';
      this._emit('playback-state', { isPlaying: true });
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      const audio = this._activeAudio();
      audio.pause();
      if (this._analyserEl) this._analyserEl.pause();
      this.isPlaying = false;
      navigator.mediaSession.playbackState = 'paused';
      this._emit('playback-state', { isPlaying: false });
    });
    navigator.mediaSession.setActionHandler('nexttrack',     () => this.next());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
    navigator.mediaSession.setActionHandler('seekto', (d) => { if (d.seekTime != null) this.seek(d.seekTime); });
  }

  // ── Analyser data ─────────────────────────────────────────────
  getWaveformData() {
    if (!this.analyser) return new Uint8Array(128);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  _emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

// Native lock screen command bridge — forwards MPRemoteCommandCenter events to VibePlayer
function setupNativeCommandBridge(player) {
  window.addEventListener('vibePlay',  () => { player.togglePlay(); });
  window.addEventListener('vibePause', () => { player.togglePlay(); });
  window.addEventListener('vibeNext',  () => { player.next(); });
  window.addEventListener('vibePrev',  () => { player.prev(); });
}

export const vibePlayer =
  window.__vibePlayer ?? (window.__vibePlayer = new VibePlayer());

setupNativeCommandBridge(vibePlayer);
