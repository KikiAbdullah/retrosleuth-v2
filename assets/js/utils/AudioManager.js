/**
 * ============================================================
 *  AUDIOMANAGER.JS — Audio Prosedural dengan Web Audio API
 *  Semua suara dihasilkan secara real-time, tanpa file eksternal.
 * ============================================================
 */

import { GameState } from "../core/Store.js";

export class AudioManager {
  static context = null;
  static masterGain = null;
  static sfxGain = null;
  static ambientGain = null;
  static ambientSource = null;
  static isInitialized = false;
  static isMuted = false;
  static initializing = false;

  /**
   * Inisialisasi AudioContext dan rantai gain.
   * Harus dipanggil setelah interaksi pengguna (klik pertama).
   * @returns {Promise<boolean>}
   */
  static async init() {
    if (this.isInitialized) return true;
    if (this.initializing) {
      // Tunggu inisialisasi selesai
      return new Promise((resolve) => {
        const check = () => {
          if (this.isInitialized) resolve(true);
          else setTimeout(check, 100);
        };
        check();
      });
    }

    this.initializing = true;

    try {
      // Buat AudioContext (harus dipicu oleh interaksi user)
      this.context = new (window.AudioContext || window.webkitAudioContext)();

      // Resume jika suspended
      if (this.context.state === "suspended") {
        await this.context.resume();
      }

      // Rantai gain: master → sfx/ambient
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.context.destination);

      this.sfxGain = this.context.createGain();
      this.sfxGain.gain.value = 1.0;
      this.sfxGain.connect(this.masterGain);

      this.ambientGain = this.context.createGain();
      this.ambientGain.gain.value = 0.3;
      this.ambientGain.connect(this.masterGain);

      // Load settings
      this._loadSettings();

      // Mulai ambient noise
      this._startAmbient();

      this.isInitialized = true;
      this.initializing = false;
      console.log(
        "[AudioManager] ✅ Siap. Suara dihasilkan secara prosedural."
      );
      return true;
    } catch (error) {
      console.warn("[AudioManager] Web Audio API tidak tersedia:", error);
      this.initializing = false;
      return false;
    }
  }

  // ============================================================
  //  PLAYBACK
  // ============================================================

  /**
   * Memainkan suara berdasarkan nama.
   * @param {string} soundName - Nama suara: 'click', 'type', 'unlock', 'boot', 'ring', 'alarm', 'success', 'error', 'window_open', 'window_close'
   * @param {Object} options - { volume, frequency, duration }
   */
  static play(soundName, options = {}) {
    if (!this.isInitialized || this.isMuted) {
      // Coba inisialisasi ulang jika belum
      if (!this.isInitialized && !this.initializing) {
        this.init().then(() => {
          if (this.isInitialized) this._play(soundName, options);
        });
      }
      return;
    }

    // Resume context jika suspended
    if (this.context && this.context.state === "suspended") {
      this.context.resume();
    }

    this._play(soundName, options);
  }

  /**
   * Internal: memainkan suara.
   */
  static _play(soundName, options) {
    const volume = options.volume || 1.0;
    const frequency = options.frequency || null;
    const duration = options.duration || null;

    switch (soundName) {
      case "click":
        this._playClick(volume);
        break;
      case "type":
        this._playType(volume);
        break;
      case "unlock":
        this._playUnlock(volume);
        break;
      case "boot":
        this._playBoot(volume);
        break;
      case "ring":
        this._playRing(volume);
        break;
      case "alarm":
        this._playAlarm(volume);
        break;
      case "success":
        this._playSuccess(volume);
        break;
      case "error":
        this._playError(volume);
        break;
      case "window_open":
        this._playWindowOpen(volume);
        break;
      case "window_close":
        this._playWindowClose(volume);
        break;
      default:
        console.warn(`[AudioManager] Suara '${soundName}' tidak dikenal.`);
    }
  }

  // ============================================================
  //  DEFINISI SUARA
  // ============================================================

  /**
   * Klik tombol — noise burst pendek.
   */
  static _playClick(volume) {
    const now = this.context.currentTime;
    const bufferSize = this.context.sampleRate * 0.02;
    const buffer = this.context.createBuffer(
      1,
      bufferSize,
      this.context.sampleRate
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.context.createGain();
    gainNode.gain.setValueAtTime(0.5 * volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    const filter = this.context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 2000;

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.sfxGain);
    source.start(now);
    source.stop(now + 0.03);
  }

  /**
   * Ketikan — beep pendek.
   */
  static _playType(volume) {
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    const gainNode = this.context.createGain();
    gainNode.gain.setValueAtTime(0.3 * volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gainNode);
    gainNode.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  /**
   * Unlock bukti — dua nada naik.
   */
  static _playUnlock(volume) {
    const now = this.context.currentTime;

    // Nada pertama: C5 (523 Hz)
    const osc1 = this.context.createOscillator();
    osc1.type = "triangle";
    osc1.frequency.value = 523;
    const gain1 = this.context.createGain();
    gain1.gain.setValueAtTime(0.4 * volume, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Nada kedua: E5 (659 Hz)
    const osc2 = this.context.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = 659;
    const gain2 = this.context.createGain();
    gain2.gain.setValueAtTime(0.001, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.4 * volume, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.4);
  }

  /**
   * Boot — nada naik panjang.
   */
  static _playBoot(volume) {
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);

    const gainNode = this.context.createGain();
    gainNode.gain.setValueAtTime(0.2 * volume, now);
    gainNode.gain.linearRampToValueAtTime(0.5 * volume, now + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.8);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.1);
  }

  /**
   * Telepon berdering.
   */
  static _playRing(volume) {
    const now = this.context.currentTime;
    for (let i = 0; i < 2; i++) {
      const osc = this.context.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 900;
      const gainNode = this.context.createGain();
      const startTime = now + i * 0.5;
      gainNode.gain.setValueAtTime(0.3 * volume, startTime);
      gainNode.gain.setValueAtTime(0.001, startTime + 0.4);
      osc.connect(gainNode);
      gainNode.connect(this.sfxGain);
      osc.start(startTime);
      osc.stop(startTime + 0.45);
    }
  }

  /**
   * Alarm deadline — bip berulang.
   */
  static _playAlarm(volume) {
    const now = this.context.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = this.context.createOscillator();
      osc.type = "square";
      osc.frequency.value = 600 + i * 100;
      const gainNode = this.context.createGain();
      const startTime = now + i * 0.3;
      gainNode.gain.setValueAtTime(0.4 * volume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
      osc.connect(gainNode);
      gainNode.connect(this.sfxGain);
      osc.start(startTime);
      osc.stop(startTime + 0.25);
    }
  }

  /**
   * Kasus terpecahkan — melodi kemenangan.
   */
  static _playSuccess(volume) {
    const now = this.context.currentTime;
    const notes = [523, 659, 784, 1047];
    const durations = [0.2, 0.2, 0.2, 0.5];
    let timeOffset = 0;
    for (let i = 0; i < notes.length; i++) {
      const osc = this.context.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = notes[i];
      const gainNode = this.context.createGain();
      const startTime = now + timeOffset;
      gainNode.gain.setValueAtTime(0.5 * volume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        startTime + durations[i]
      );
      osc.connect(gainNode);
      gainNode.connect(this.sfxGain);
      osc.start(startTime);
      osc.stop(startTime + durations[i] + 0.05);
      timeOffset += durations[i];
    }
  }

  /**
   * Error — buzz pendek.
   */
  static _playError(volume) {
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.3);
    const gainNode = this.context.createGain();
    gainNode.gain.setValueAtTime(0.5 * volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gainNode);
    gainNode.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  /**
   * Jendela dibuka.
   */
  static _playWindowOpen(volume) {
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    const gainNode = this.context.createGain();
    gainNode.gain.setValueAtTime(0.2 * volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gainNode);
    gainNode.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Jendela ditutup.
   */
  static _playWindowClose(volume) {
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
    const gainNode = this.context.createGain();
    gainNode.gain.setValueAtTime(0.2 * volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gainNode);
    gainNode.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // ============================================================
  //  AMBIENT NOISE (Static CRT)
  // ============================================================

  static _startAmbient() {
    if (this.ambientSource) return;

    const bufferSize = this.context.sampleRate * 2;
    const buffer = this.context.createBuffer(
      1,
      bufferSize,
      this.context.sampleRate
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.08;
    }

    this.ambientSource = this.context.createBufferSource();
    this.ambientSource.buffer = buffer;
    this.ambientSource.loop = true;
    this.ambientSource.connect(this.ambientGain);
    this.ambientSource.start(0);
  }

  static _stopAmbient() {
    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
      } catch (e) {}
      this.ambientSource = null;
    }
  }

  // ============================================================
  //  VOLUME CONTROL
  // ============================================================

  static setMasterVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, value));
      this._saveSettings();
    }
  }

  static setSfxVolume(value) {
    if (this.sfxGain) {
      this.sfxGain.gain.value = Math.max(0, Math.min(1, value));
      this._saveSettings();
    }
  }

  static setAmbientVolume(value) {
    if (this.ambientGain) {
      this.ambientGain.gain.value = Math.max(0, Math.min(1, value));
      this._saveSettings();
    }
  }

  static toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted
        ? 0
        : GameState.audioSettings?.master || 0.7;
    }
    this._saveSettings();
    return this.isMuted;
  }

  // ============================================================
  //  SETTINGS PERSISTENCE
  // ============================================================

  static _loadSettings() {
    const settings = GameState.audioSettings;
    if (settings) {
      this.setMasterVolume(settings.master || 0.7);
      this.setSfxVolume(settings.sfx || 1.0);
      this.setAmbientVolume(settings.ambient || 0.3);
      this.isMuted = settings.muted || false;
      if (this.isMuted && this.masterGain) {
        this.masterGain.gain.value = 0;
      }
    }
  }

  static _saveSettings() {
    GameState.audioSettings = {
      master: this.masterGain?.gain.value || 0.7,
      sfx: this.sfxGain?.gain.value || 1.0,
      ambient: this.ambientGain?.gain.value || 0.3,
      muted: this.isMuted || false,
    };
    GameState.autoSave();
  }

  // ============================================================
  //  UTILITY
  // ============================================================

  static getMasterVolume() {
    return this.masterGain?.gain.value || 0.7;
  }

  static getSfxVolume() {
    return this.sfxGain?.gain.value || 1.0;
  }

  static getAmbientVolume() {
    return this.ambientGain?.gain.value || 0.3;
  }

  static isMutedState() {
    return this.isMuted || false;
  }

  static isContextReady() {
    return (
      this.isInitialized && this.context && this.context.state === "running"
    );
  }

  static resume() {
    if (this.context && this.context.state === "suspended") {
      this.context.resume();
    }
  }
}
