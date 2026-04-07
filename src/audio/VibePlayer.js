// ─────────────────────────────────────────────
//  Vibe · Audio Engine
//  Sweet Fades, Web Audio, Queue Management
// ─────────────────────────────────────────────

import { getStreamUrl, getStreamUrlFallback, reportPlaybackStart, reportPlaybackStopped, markPlayed } from '../api/jellyfin';

const FADE_DURATION  = 6;
const PRELOAD_BEFORE = 25;

class VibePlayer extends EventTarget {
  constructor() {
    super();
    this.ctx          = null;
    this.analyser     = null;
    this.gainA        = null;
    this.gainB        = null;
    this._audioA      = null;
    this._audioB      = null;
    this.sourceA      = null;
    this.sourceB      = null;
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
  }

  _initCtx() {
    if (this.ctx) return;
    this.ctx      = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.connect(this.ctx.destination);

    this.gainA = this.ctx.createGain();
    this.gainB = this.ctx.createGain();
    this.gainA.connect(this.analyser);
    this.gainB.connect(this.analyser);
    this.gainA.gain.value = this.volume;
    this.gainB.gain.value = 0;

    this._audioA = new Audio();
    this._audioB = new Audio();
    [this._audioA, this._audioB].forEach(a => {
      a.crossOrigin = 'anonymous';
      a.preload = 'auto';
    });

    this.sourceA = this.ctx.createMediaElementSource(this._audioA);
    this.sourceB = this.ctx.createMediaElementSource(this._audioB);
    this.sourceA.connect(this.gainA);
    this.sourceB.connect(this.gainB);

    this._progressInterval = setInterval(() => {
      const audio = this._activeAudio();
      if (!audio || audio.paused) return;
      this.currentTime = audio.currentTime;
      this.duration    = audio.duration || 0;
      this._emit('progress', { currentTime: this.currentTime, duration: this.duration });

      const remaining = this.duration - this.currentTime;
      if (remaining <= PRELOAD_BEFORE && !this._preloaded && this._hasNext()) {
        this._preloadNext();
      }
      if (remaining <= FADE_DURATION && !this._isFading && this._hasNext()) {
        this._sweetFade();
      }
    }, 250);

    this._audioA.addEventListener('ended', () => { if (this.activeSlot === 'A' && !this._isFading) this.next(); });
    this._audioB.addEventListener('ended', () => { if (this.activeSlot === 'B' && !this._isFading) this.next(); });
  }

  _activeAudio() { return this.activeSlot === 'A' ? this._audioA : this._audioB; }
  _activeGain()  { return this.activeSlot === 'A' ? this.gainA   : this.gainB;   }

  // ── Queue ─────────────────────────────────────
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

  // ── Playback ──────────────────────────────────
  async playTrack(track) {
    this._initCtx();
    if (this.ctx.state !== 'running') {
      try { await this.ctx.resume(); } catch(e) { console.warn('AudioContext resume failed', e); }
    }

    const audio = this._activeAudio();
    const gain  = this._activeGain();

    // Try direct stream first, fallback to transcoded
    audio.src = getStreamUrl(track.Id);
    gain.gain.cancelScheduledValues(this.ctx.currentTime);
    gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

    // Reset opposite slot gain
    const otherGain = this.activeSlot === 'A' ? this.gainB : this.gainA;
    otherGain.gain.setValueAtTime(0, this.ctx.currentTime);

    try {
      await audio.play();
    } catch(e) {
      console.warn('Direct stream failed, trying fallback...', e);
      try {
        audio.src = getStreamUrlFallback(track.Id);
        await audio.play();
      } catch(e2) {
        console.error('Fallback stream also failed:', e2);
      }
    }

    this.isPlaying    = true;
    this.currentTrack = track;
    this._isFading    = false;
    this._preloaded   = false;
    this._emit('track-changed', { track });
    this._emit('playback-state', { isPlaying: true });
    reportPlaybackStart(track.Id);
  }

  async next() {
    const idx = this._getNextIndex();
    if (idx === -1) { this.isPlaying = false; this._emit('playback-state', { isPlaying: false }); return; }
    this.queueIndex = idx;
    await this.playTrack(this.queue[idx]);
  }

  async prev() {
    if (this.currentTime > 3) {
      this._activeAudio().currentTime = 0; return;
    }
    const idx = Math.max(0, this.queueIndex - 1);
    this.queueIndex = idx;
    await this.playTrack(this.queue[idx]);
  }

  togglePlay() {
    const audio = this._activeAudio();
    if (audio.paused) { audio.play(); this.isPlaying = true; }
    else              { audio.pause(); this.isPlaying = false; }
    this._emit('playback-state', { isPlaying: this.isPlaying });
  }

  seek(seconds) { this._activeAudio().currentTime = seconds; }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ctx) this._activeGain().gain.setValueAtTime(this.volume, this.ctx.currentTime);
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    this._emit('shuffle-changed', { isShuffle: this.isShuffle });
  }

  cycleRepeat() {
    const modes = ['none','one','all'];
    this.repeatMode = modes[(modes.indexOf(this.repeatMode) + 1) % modes.length];
    this._emit('repeat-changed', { repeatMode: this.repeatMode });
  }

  // ── Sweet Fade ────────────────────────────────
  async _preloadNext() {
    this._preloaded = true;
    const nextIdx   = this._getNextIndex();
    if (nextIdx === -1) return;
    const nextTrack = this.queue[nextIdx];
    const nextAudio = this.activeSlot === 'A' ? this._audioB : this._audioA;
    nextAudio.src   = getStreamUrl(nextTrack.Id);
    nextAudio.load();
  }

  async _sweetFade() {
    this._isFading  = true;
    const nextIdx   = this._getNextIndex();
    if (nextIdx === -1) return;

    const nextTrack = this.queue[nextIdx];
    const currGain  = this._activeGain();
    const nextSlot  = this.activeSlot === 'A' ? 'B' : 'A';
    const nextGain  = nextSlot === 'A' ? this.gainA : this.gainB;
    const nextAudio = nextSlot === 'A' ? this._audioA : this._audioB;
    const now       = this.ctx.currentTime;

    if (!nextAudio.src || !nextAudio.src.includes(nextTrack.Id)) {
      nextAudio.src = getStreamUrl(nextTrack.Id);
    }

    try { await nextAudio.play(); } catch(e) { return; }

    currGain.gain.setValueAtTime(this.volume, now);
    currGain.gain.exponentialRampToValueAtTime(0.001, now + FADE_DURATION);
    nextGain.gain.setValueAtTime(0.001, now);
    nextGain.gain.exponentialRampToValueAtTime(this.volume, now + FADE_DURATION);

    this.activeSlot   = nextSlot;
    this.queueIndex   = nextIdx;
    this.currentTrack = nextTrack;
    this._preloaded   = false;

    this._emit('track-changed', { track: nextTrack });
    markPlayed(this.queue[this.queueIndex - 1]?.Id);
    reportPlaybackStart(nextTrack.Id);
  }

  // ── Waveform ──────────────────────────────────
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

export const vibePlayer = new VibePlayer();
