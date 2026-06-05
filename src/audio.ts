/* ============================================================
   AUDIO.TS — SFX system (sfxr-based combat) + UI sounds (Web Audio API)
   ============================================================ */

import { GS } from './state.js';

interface SfxCache {
  [key: string]: Record<string, unknown> | null;
}

export const SFX: {
  cache: SfxCache;
  initialized: boolean;
  init(): void;
  play(key: string, useMutate?: boolean): void;
  setVolume(pct: number): void;
} = {
    cache: {} as SfxCache,
    initialized: false,
    init() {
        if (this.initialized)
            return;
        const defs: Array<[string, string]> = [
            ['shoot', '57uBnWcWXjKSMiXVkfmoU2bX66pjdTBmSMHkSMgmfUj4ayvwoXRJ7c9rNpoQo1UHQrkM1URcxDv6ikQdwzAkwcYHCCidsXEyCd1Ta1d1jHDo8Beu7aeFLvyrF'],
            ['hit', '57uBnWgjfXc3EvcWiM92MVZMaGybMvR3uqhdobJrmK54Eb4iVFDt814Q4GevJMZ98eyGb393gapaegdE7sX1nGmNYdG4ZVGULyWVD8efzKXScxDJXUkRVmN1m'],
            ['kill', '34T6Pkkh8tccthB7qY6RP3bgh6CrYcakG9gaVcXanE9mJSEs6CaumcYj6CEUTdLjDWKx1J8hvWMHnTYJcchTterEh2wg1z6LsksCCftr4ePGsyzi3SxqavUab'],
            ['bossKill', '1111135hjPGSNeYAewVLtrrmg9VSPTzPu7rEFcvStDzVhg1SNRQeqCS1rHgNk2pdJTMNdhS9CuXUBS1uBT7ykX1kuokPj3HYZY9fTKyXTvpVe7BhhtPeh38K'],
            ['fuel', '34T6PkkEfNRaiQKGdyWNSKRZjzHdLcpBaxkvQpQGUF1Gq1BBDtjSCS9nAFXweXit28uEg9pDxH7ML1mETdZLJ5Y4xZ7ftQZqfsHVKmsxwDYrnB69ZSBYZB2JK'],
            ['damage', '111116FvxZZiPc9QC5gCNSc3yQtptEgKL6jGZBfCw4BBadhr7ujzgezRUa6pYSvJjgQciP7ymCseBgg8NxJYALcF8z87VKAuTmQCjQddzNz31LfaxR8RoYK1'],
            ['noAmmo', '11111CbWrmnrsufPmk2B1kudGx5UCKQ3CjMx5zVDEWW7vWnaaZuiYfNzA5UxBk17D4oA2nAJRvPHbB4PPAxNC5CDfHy6jAL9RVgTqgKERTQFZ7nscVVt1EEB'],
            ['waveUp', '11111DqYrHCBn9WNyjvJR3JpXzdaEj1FGZhThqHfPECdqqDm8GPLHAVZLXpyUekdoWeF1spTspQwWriV5EbEta1FxrSzMxS4diEE2HxUmVYpd3bmYAsTRUX9'],
            ['victory', '11111ASrpTbegFfrb1pVW3qG9gv3LCSHeG46gpCsmdGGXu7ZsciK9iBWWvTs5c7CiZKxAqNsd9RZ6wH3AEmevTUrE1LV669A1QAGXcSZjGk3jjuvs9pAFBx3'],
            ['defeat', '6sCsK8iXFx1bJFRyRZTC2oTn4RqnBBmPSQ7fmQE3aGHNgMEwWKtjvzcP5PRaYNk7LkGqtMEwxJUQGTLMh6LMTBJsLFqMeC2dGvH5EdX4y5xntkJooRYcwrXbh'],
        ];
        for (const [key, compressed] of defs) {
            try {
                this.cache[key] = sfxr.b58decode(compressed);
            }
            catch (e) {
                this.cache[key] = null;
            }
        }
        UI.init();
        this.initialized = true;
    },
    play(key: string, useMutate: boolean = true) {
        if (!this.initialized)
            this.init();
        if (!this.cache[key])
            return;
        try {
            const p = new Params();
            p.fromJSON(this.cache[key]!);
            if (GS.audio.sfxCache.randomFactor > 0 && useMutate) {
                const times = Math.round(GS.audio.sfxCache.randomFactor / 0.05);
                for (let i = 0; i < times; i++)
                    p.mutate();
            }
            p.sound_vol *= GS.audio.sfxCache.volumePct;
            sfxr.toAudio(p).play();
        }
        catch (e) { /* sfx unavailable */ }
    },
    setVolume(pct: number) {
        GS.audio.sfxCache.volumePct = pct / 100;
    },
};
/* ============================================================
   UI — Synthesized UI interaction sounds (Web Audio API)
   Zero external dependencies, ~1KB, works offline.
   ============================================================ */
export const UI: {
  _ctx: AudioContext | null;
  _initialized: boolean;
  init(): void;
  _ensureCtx(): AudioContext | null;
  _vol(): number;
  click(): void;
  hover(): void;
  open(): void;
  close(): void;
  error(): void;
  notify(): void;
  startup(): void;
  shutdown(): void;
  action(): void;
} = {
    _ctx: null as AudioContext | null,
    _initialized: false,
    init() {
        if (this._initialized)
            return;
        // Defer AudioContext creation to first user gesture (browser policy)
        this._initialized = true;
    },
    _ensureCtx() {
        if (!this._ctx) {
            try {
                this._ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            catch (e) { /* Web Audio unavailable */ }
        }
        // Resume if suspended (browser autoplay policy)
        if (this._ctx && this._ctx.state === 'suspended') {
            this._ctx.resume();
        }
        return this._ctx;
    },
    _vol() { return (GS.settings.sfxVolume / 100) * (GS.settings.masterVolume / 100); },
    /** Short sine-wave click — button presses, selections */
    click() {
        const ctx = this._ensureCtx();
        if (!ctx)
            return;
        const v = this._vol();
        if (v <= 0)
            return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.03);
        gain.gain.setValueAtTime(v * 0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
    },
    /** Subtle tick for hover / focus changes */
    hover() {
        const ctx = this._ensureCtx();
        if (!ctx)
            return;
        const v = this._vol();
        if (v <= 0)
            return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        gain.gain.setValueAtTime(v * 0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
    },
    /** Ascending two-tone chime — window / menu open */
    open() {
        const ctx = this._ensureCtx();
        if (!ctx)
            return;
        const v = this._vol();
        if (v <= 0)
            return;
        const now = ctx.currentTime;
        [523, 659].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const t = now + i * 0.06;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(v * 0.14, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.11);
        });
    },
    /** Descending two-tone chime — window / menu close */
    close() {
        const ctx = this._ensureCtx();
        if (!ctx)
            return;
        const v = this._vol();
        if (v <= 0)
            return;
        const now = ctx.currentTime;
        [587, 440].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const t = now + i * 0.06;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(v * 0.14, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.11);
        });
    },
    /** Error / warning buzz */
    error() {
        const ctx = this._ensureCtx();
        if (!ctx)
            return;
        const v = this._vol();
        if (v <= 0)
            return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(180, now);
        gain.gain.setValueAtTime(v * 0.10, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.20);
    },
    /** Pleasant notification ding — new mail, toast */
    notify() {
        const ctx = this._ensureCtx();
        if (!ctx)
            return;
        const v = this._vol();
        if (v <= 0)
            return;
        const now = ctx.currentTime;
        [784, 988].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const t = now + i * 0.08;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(v * 0.16, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.16);
        });
    },
    /** Ascending arpeggio — game start, boot into desktop */
    startup() {
        const ctx = this._ensureCtx();
        if (!ctx)
            return;
        const v = this._vol();
        if (v <= 0)
            return;
        const now = ctx.currentTime;
        [523, 659, 784, 1047].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            const t = now + i * 0.10;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(v * 0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.20);
        });
    },
    /** Descending tone — power off / shutdown */
    shutdown() {
        const ctx = this._ensureCtx();
        if (!ctx)
            return;
        const v = this._vol();
        if (v <= 0)
            return;
        const now = ctx.currentTime;
        [784, 659, 523, 392].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            const t = now + i * 0.12;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(v * 0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.24);
        });
    },
    /** Deep action confirm — go to work / embark */
    action() {
        const ctx = this._ensureCtx();
        if (!ctx)
            return;
        const v = this._vol();
        if (v <= 0)
            return;
        const now = ctx.currentTime;
        [330, 440, 554].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            const t = now + i * 0.09;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(v * 0.14, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.18);
        });
    },
};
