/* ============================================================
   BGM-STRUDEL.TS — Background music via @strudel/* packages
   Loads pattern .js files from assets/bgm/ and plays them
   using the Strudel Web Audio synthesis engine.

   Architecture (mirrors strudel.cc REPL):
   1. Spread strudel core functions (s, note, sound, etc.) onto
      globalThis so safeEval can see them.
   2. Provide a mini-notation transpiler that converts:
        $: expr  →  expr.p('$')
      so patterns register with the scheduler correctly.
   3. webaudioRepl() creates a repl instance wired to superdough.
   4. repl.evaluate(code) parses, registers, schedules, and plays.
   ============================================================ */

import { getSharedAudioContext } from './audio-context.js';

// Track definitions — pattern source files
const TRACKS: Record<string, string> = {
    combat: 'assets/bgm/bgm-combat.js',
    hangar: 'assets/bgm/bgm-hangar.js',
};

// Cached pattern source code
const _sources: Record<string, string> = {};

// Strudel module refs (from esbuild bundle loaded via <script>)
function _getStrudel(): any {
    return (window as any).__strudel || null;
}

// Playback state
let _loaded = false;
let _loading = false;
let _currentTrack: string | null = null;
let _pendingTrack: string | null = null;
let _globalsInjected = false;
let _samplesReady: Promise<void> | null = null;

// The repl instance created by webaudioRepl() — owns scheduler + audio routing
let _repl: any = null;

/* ============================================================
   Mini-notation transpiler
   Converts $: expr into expr.p('$') so patterns are registered
   with the repl's scheduler. Handles multi-line chained method
   calls (detects the next $: or end of code as boundary).

   Also: providing ANY transpiler causes safeEval to use
   wrapExpression:true, which wraps code in {…} — making $:
   a valid labeled statement inside a block.
   ============================================================ */
function _transpileMini(code: string): { output: string; meta: Record<string, unknown> } {
    // Split into lines, then rebuild: replace "$: expr" with "expr.p('$')"
    // where expr may span multiple lines (chained method calls).
    const lines = code.split(/\r?\n/);
    const out: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const m = line.match(/^\$:\s+(.*)/);
        if (m) {
            // Start of a $: expression — collect all continuation lines
            const exprLines: string[] = [m[1]];
            i++;
            while (i < lines.length) {
                const next = lines[i];
                // continuation = indented line that is NOT a new $: or setcps/hush/etc.
                if (/^\s+\./.test(next) && !/^\$:/.test(next.trim())) {
                    exprLines.push(next);
                    i++;
                } else {
                    break;
                }
            }
            const expr = exprLines.join('\n').trim();
            out.push(`${expr}.p('$')`);
        } else {
            out.push(line);
            i++;
        }
    }

    return { output: out.join('\n'), meta: {} };
}

/** Suppress known superdough deprecation warnings by replacing the
 *  superdough logger. The messages go through j3 → wt3 → console.log,
 *  not console.warn, so a console.warn filter alone doesn't catch them. */
let _deprecationSuppressed = false;
function _suppressSuperdoughDeprecationWarnings(): void {
    if (_deprecationSuppressed) return;
    _deprecationSuppressed = true;
    const s = _getStrudel();
    if (!s || typeof s.webaudio.setLogger !== 'function') return;
    // setLogger replaces the internal wt3 logger used by j3
    s.webaudio.setLogger((msg: string) => {
        if (typeof msg === 'string' && msg.includes('Deprecation warning')) return;
        console.log(msg);
    });
}

/** Load bank name aliases so .bank("tr808") resolves to RolandTR808_bd etc. */
async function _loadBankAliases(s: any): Promise<void> {
    if (typeof s.webaudio.aliasBank !== 'function') return;
    try {
        const resp = await fetch('https://strudel.b-cdn.net/tidal-drum-machines-alias.json');
        if (!resp.ok) return;
        const aliases: Record<string, string> = await resp.json();
        for (const [fullName, shortName] of Object.entries(aliases)) {
            try { await s.webaudio.aliasBank(shortName, fullName); } catch (_e) { /* skip */ }
        }
    } catch (_e) { /* network error — aliases are optional */ }
}

/** Put strudel core functions (s, note, sound, etc.) on globalThis
 *  so that safeEval can find them when evaluating pattern code.
 *  Also calls registerSynthSounds() and preloads sample packs.
 *  Returns a Promise that resolves when samples are ready. */
function _injectStrudelGlobals(): Promise<void> {
    if (_globalsInjected) return _samplesReady || Promise.resolve();
    const s = _getStrudel();
    if (!s) return Promise.resolve();

    const core = s.core;
    // Functions referenced by pattern code: s, note, sound, bank, stack, silence, rand
    const names = ['s', 'note', 'sound', 'bank', 'stack', 'silence', 'rand'];
    const w = window as any;
    for (const name of names) {
        if (core[name] !== undefined && w[name] === undefined) {
            w[name] = core[name];
        }
    }

    // Register built-in synth oscillator voices (square, sine, triangle, sawtooth, etc.)
    if (typeof s.webaudio.registerSynthSounds === 'function') {
        try { s.webaudio.registerSynthSounds(); } catch (_e) { /* ignore */ }
    }

    // Suppress superdough internal deprecation warnings (known issue:
    // registerSynthSounds triggers "node.onended = callback" path).
    _suppressSuperdoughDeprecationWarnings();

    // Preload sample packs from strudel CDN — these are lightweight JSON manifests
    // that map sample names to WAV URLs. Actual WAV files are lazy-loaded on first
    // trigger by the scheduler.
    const promises: Promise<void>[] = [];
    if (typeof s.webaudio.samples === 'function') {
        // TR-808 drum machine samples (used by .bank("tr808"))
        promises.push(
            s.webaudio.samples('https://strudel.b-cdn.net/tidal-drum-machines.json')
                .catch(() => console.warn('BGM: failed to load drum machine samples')),
        );
        // VCSL sample library (shaker_small, etc.)
        promises.push(
            s.webaudio.samples('https://strudel.b-cdn.net/vcsl.json')
                .catch(() => console.warn('BGM: failed to load VCSL samples')),
        );
        // Load bank name aliases so that .bank("tr808") resolves to RolandTR808_bd etc.
        promises.push(_loadBankAliases(s));
    }
    _samplesReady = Promise.all(promises).then(() => {});

    // Enable mini-notation parsing in s(), note(), etc. string arguments.
    // Without this, s("[bd ~]") is treated as a literal sound name.
    if (typeof s.mini.miniAllStrings === 'function') {
        try { s.mini.miniAllStrings(); } catch (_e) { /* ignore */ }
    }

    // Some pattern files use ._scope() for visualization; make it a harmless no-op.
    if (core.Pattern && !core.Pattern.prototype._scope) {
        core.Pattern.prototype._scope = function () { return this; };
    }

    _globalsInjected = true;
    return _samplesReady;
}

/** Ensure strudel packages are loaded & create the repl instance. */
async function _ensureStrudel(): Promise<boolean> {
    if (_repl) return true;

    const s = _getStrudel();
    if (!s || !s.core || !s.webaudio) {
        console.warn('BGM: strudel bundle not loaded');
        return false;
    }

    // Make s, note, etc. available globally BEFORE creating the repl
    // (repl.evaluate calls injectPatternMethods which adds setcps etc.)
    // Also preloads sample packs from CDN — await before playing patterns.
    await _injectStrudelGlobals();

    // Initialize superdough AudioWorklets (idempotent)
    if (typeof s.webaudio.initAudio === 'function') {
        try { await s.webaudio.initAudio(); } catch (_e) { /* may already be initialized */ }
    }

    // Share AudioContext with the rest of the game
    const ctx = getSharedAudioContext();
    if (!ctx) {
        console.warn('BGM: no shared AudioContext');
        return false;
    }

    // Create repl with our mini-notation transpiler
    const repl = s.webaudio.webaudioRepl({
        audioContext: ctx,
        transpiler: _transpileMini,
    });
    if (!repl || typeof repl.evaluate !== 'function') {
        console.warn('BGM: webaudioRepl did not return a valid repl instance');
        return false;
    }

    _repl = repl;
    return true;
}

/** Fetch a pattern source file. */
async function _fetchSource(url: string): Promise<string> {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.text();
}

/** Evaluate pattern source code via the repl instance and start playback. */
async function _evalSource(code: string): Promise<void> {
    if (!_repl) return;
    try {
        await _repl.evaluate(code);
    } catch (err) {
        console.warn('BGM: evaluate error', err);
    }
}

/** Stop all playback and reset pattern state. */
function _silence(): void {
    if (!_repl) return;
    try { _repl.stop(); } catch (_e) { /* ignore */ }
    _currentTrack = null;
}

/* ============================================================
   Public BGM API (compatible with old BGM interface)
   ============================================================ */
export const BGM = {
    async init(): Promise<void> {
        if (_loaded || _loading) return;
        _loading = true;

        const ok = await _ensureStrudel();
        if (!ok) { _loading = false; return; }

        // Pre-load pattern sources
        for (const [key, url] of Object.entries(TRACKS)) {
            try {
                _sources[key] = await _fetchSource(url);
            } catch (_e) {
                console.warn('BGM: failed to load pattern source', url, _e);
            }
        }

        _loaded = true;
        _loading = false;

        // Play pending track
        if (_pendingTrack) {
            const track = _pendingTrack;
            _pendingTrack = null;
            BGM.play(track);
        }
    },

    play(track: string): void {
        if (_currentTrack === track) return;
        if (!_loaded) {
            _pendingTrack = track;
            if (!_loading) {
                BGM.init().catch((err: unknown) => {
                    console.warn('BGM: init failed', err);
                    _loading = false;
                });
            }
            return;
        }

        _silence();

        const src = _sources[track];
        if (!src) return;

        _evalSource(src);
        _currentTrack = track;
    },

    stop(): void {
        _silence();
        if (!_loading) {
            _pendingTrack = null;
        }
    },

    updateVolume(): void {
        // TODO: wire a GainNode between superdough output and destination
    },
};
