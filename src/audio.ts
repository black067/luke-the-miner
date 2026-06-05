/* ============================================================
   AUDIO.TS — Combat SFX + UI sounds (all Web Audio API synthesized)
   Zero external dependencies, works offline.
   ============================================================ */

import { GS } from './state.js';

/** Generate a short white-noise AudioBuffer for percussion/explosion textures. */
function _noiseBuf(ctx: AudioContext, dur: number): AudioBuffer {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
}

/* ============================================================
   SFX — Combat sound effects (Web Audio API)
   Same volume pipeline as UI sounds so loudness is consistent.
   ============================================================ */
export const SFX: {
    _ctx: AudioContext | null;
    initialized: boolean;
    init(): void;
    _ensureCtx(): AudioContext | null;
    _vol(): number;
    play(key: string, useMutate?: boolean): void;
    setVolume(_pct: number): void;
} = {
    _ctx: null as AudioContext | null,
    initialized: false,
    init() {
        if (this.initialized) return;
        UI.init();
        this.initialized = true;
    },
    _ensureCtx() {
        if (!this._ctx) {
            try { this._ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); }
            catch (e) { /* Web Audio unavailable */ }
        }
        if (this._ctx && this._ctx.state === 'suspended') this._ctx.resume();
        return this._ctx;
    },
    _vol() { return (GS.settings.sfxVolume / 100) * (GS.settings.masterVolume / 100); },

    play(key: string, useMutate: boolean = true) {
        if (!this.initialized) this.init();
        const ctx = this._ensureCtx();
        if (!ctx) return;
        const v = this._vol();
        if (v <= 0) return;
        const now = ctx.currentTime;
        // Mutation → subtle random pitch variation
        const detune = (useMutate && GS.audio.sfxCache.randomFactor > 0)
            ? (Math.random() - 0.5) * 2 * GS.audio.sfxCache.randomFactor * 180
            : 0;

        switch (key) {
            /* ---- shoot: laser blaster (noise burst + descending saw) ---- */
            case 'shoot': {
                const ndur = 0.08;
                const noise = ctx.createBufferSource();
                noise.buffer = _noiseBuf(ctx, ndur);
                const filt = ctx.createBiquadFilter();
                filt.type = 'bandpass'; filt.frequency.value = 1400; filt.Q.value = 1.5;
                const ng = ctx.createGain();
                ng.gain.setValueAtTime(v * 0.20, now);
                ng.gain.exponentialRampToValueAtTime(0.001, now + ndur);
                noise.connect(filt).connect(ng).connect(ctx.destination);
                noise.start(now); noise.stop(now + ndur);

                const osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(580 + detune, now);
                osc.frequency.exponentialRampToValueAtTime(140, now + 0.06);
                const og = ctx.createGain();
                og.gain.setValueAtTime(v * 0.11, now);
                og.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
                osc.connect(og).connect(ctx.destination);
                osc.start(now); osc.stop(now + 0.07);
                break;
            }
            /* ---- hit: bullet impact (low sine thud + short noise) ---- */
            case 'hit': {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(110 + detune, now);
                osc.frequency.exponentialRampToValueAtTime(45, now + 0.10);
                const og = ctx.createGain();
                og.gain.setValueAtTime(v * 0.28, now);
                og.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc.connect(og).connect(ctx.destination);
                osc.start(now); osc.stop(now + 0.13);

                const ndur = 0.05;
                const noise = ctx.createBufferSource();
                noise.buffer = _noiseBuf(ctx, ndur);
                const ng = ctx.createGain();
                ng.gain.setValueAtTime(v * 0.12, now);
                ng.gain.exponentialRampToValueAtTime(0.001, now + ndur);
                noise.connect(ng).connect(ctx.destination);
                noise.start(now); noise.stop(now + ndur);
                break;
            }
            /* ---- kill: enemy destroyed (deep boom + low-pass noise) ---- */
            case 'kill': {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(65 + detune * 0.3, now);
                osc.frequency.exponentialRampToValueAtTime(25, now + 0.28);
                const og = ctx.createGain();
                og.gain.setValueAtTime(v * 0.36, now);
                og.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
                osc.connect(og).connect(ctx.destination);
                osc.start(now); osc.stop(now + 0.33);

                const ndur = 0.18;
                const noise = ctx.createBufferSource();
                noise.buffer = _noiseBuf(ctx, ndur);
                const filt = ctx.createBiquadFilter();
                filt.type = 'lowpass'; filt.frequency.value = 800;
                const ng = ctx.createGain();
                ng.gain.setValueAtTime(v * 0.18, now);
                ng.gain.exponentialRampToValueAtTime(0.001, now + ndur);
                noise.connect(filt).connect(ng).connect(ctx.destination);
                noise.start(now); noise.stop(now + ndur);
                break;
            }
            /* ---- bossKill: dramatic explosion (deep rumble + sweeping noise + rising tone) ---- */
            case 'bossKill': {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(42 + detune * 0.2, now);
                osc.frequency.exponentialRampToValueAtTime(14, now + 0.65);
                const og = ctx.createGain();
                og.gain.setValueAtTime(v * 0.44, now);
                og.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
                osc.connect(og).connect(ctx.destination);
                osc.start(now); osc.stop(now + 0.76);

                const ndur = 0.38;
                const noise = ctx.createBufferSource();
                noise.buffer = _noiseBuf(ctx, ndur);
                const filt = ctx.createBiquadFilter();
                filt.type = 'lowpass';
                filt.frequency.setValueAtTime(1100, now);
                filt.frequency.exponentialRampToValueAtTime(180, now + ndur);
                const ng = ctx.createGain();
                ng.gain.setValueAtTime(v * 0.24, now);
                ng.gain.exponentialRampToValueAtTime(0.001, now + ndur);
                noise.connect(filt).connect(ng).connect(ctx.destination);
                noise.start(now); noise.stop(now + ndur);

                const osc2 = ctx.createOscillator();
                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(180, now + 0.12);
                osc2.frequency.exponentialRampToValueAtTime(560, now + 0.50);
                const og2 = ctx.createGain();
                og2.gain.setValueAtTime(0, now);
                og2.gain.linearRampToValueAtTime(v * 0.09, now + 0.16);
                og2.gain.exponentialRampToValueAtTime(0.001, now + 0.56);
                osc2.connect(og2).connect(ctx.destination);
                osc2.start(now + 0.12); osc2.stop(now + 0.57);
                break;
            }
            /* ---- fuel: power-up collect (ascending sine sweep) ---- */
            case 'fuel': {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(340 + detune, now);
                osc.frequency.exponentialRampToValueAtTime(920, now + 0.13);
                const og = ctx.createGain();
                og.gain.setValueAtTime(v * 0.20, now);
                og.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.connect(og).connect(ctx.destination);
                osc.start(now); osc.stop(now + 0.16);
                break;
            }
            /* ---- damage: player hurt (harsh square with tremolo + discordant overtone) ---- */
            case 'damage': {
                const osc = ctx.createOscillator();
                osc.type = 'square';
                osc.frequency.setValueAtTime(155 + detune, now);
                const og = ctx.createGain();
                og.gain.setValueAtTime(v * 0.16, now);
                og.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                // Tremolo via LFO modulating gain
                const lfo = ctx.createOscillator();
                lfo.type = 'sine'; lfo.frequency.value = 28;
                const lfoG = ctx.createGain();
                lfoG.gain.value = v * 0.09;
                lfo.connect(lfoG).connect(og.gain);
                osc.connect(og).connect(ctx.destination);
                osc.start(now); osc.stop(now + 0.23);
                lfo.start(now); lfo.stop(now + 0.23);

                const osc2 = ctx.createOscillator();
                osc2.type = 'square';
                osc2.frequency.setValueAtTime(300, now);
                const og2 = ctx.createGain();
                og2.gain.setValueAtTime(v * 0.06, now);
                og2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
                osc2.connect(og2).connect(ctx.destination);
                osc2.start(now); osc2.stop(now + 0.17);
                break;
            }
            /* ---- noAmmo: empty click (ultra-short square blip, no mutate) ---- */
            case 'noAmmo': {
                const osc = ctx.createOscillator();
                osc.type = 'square';
                osc.frequency.setValueAtTime(720, now);  // no detune — always identical
                const og = ctx.createGain();
                og.gain.setValueAtTime(v * 0.10, now);
                og.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
                osc.connect(og).connect(ctx.destination);
                osc.start(now); osc.stop(now + 0.035);
                break;
            }
            /* ---- waveUp: next-wave alert (quick ascending two-tone) ---- */
            case 'waveUp': {
                [580, 780].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    osc.type = 'sine';
                    const t = now + i * 0.07;
                    osc.frequency.setValueAtTime(freq + detune, t);
                    const og = ctx.createGain();
                    og.gain.setValueAtTime(v * 0.18, t);
                    og.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
                    osc.connect(og).connect(ctx.destination);
                    osc.start(t); osc.stop(t + 0.11);
                });
                break;
            }
            /* ---- victory: triumphant ascending arpeggio (C5–C6) ---- */
            case 'victory': {
                [523, 659, 784, 1047].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    osc.type = 'triangle';
                    const t = now + i * 0.10;
                    osc.frequency.setValueAtTime(freq + detune, t);
                    const og = ctx.createGain();
                    og.gain.setValueAtTime(v * 0.16, t);
                    og.gain.exponentialRampToValueAtTime(0.001, t + 0.20);
                    osc.connect(og).connect(ctx.destination);
                    osc.start(t); osc.stop(t + 0.21);
                });
                break;
            }
            /* ---- defeat: sad descending tones ---- */
            case 'defeat': {
                [440, 370, 330, 262].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    osc.type = 'triangle';
                    const t = now + i * 0.13;
                    osc.frequency.setValueAtTime(freq + detune, t);
                    const og = ctx.createGain();
                    og.gain.setValueAtTime(v * 0.15, t);
                    og.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
                    osc.connect(og).connect(ctx.destination);
                    osc.start(t); osc.stop(t + 0.23);
                });
                break;
            }
        }
    },
    setVolume(_pct: number) {
        // 音量统一由 GS.settings 管理，保留方法供外部兼容调用
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
