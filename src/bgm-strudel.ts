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

/** Put strudel core functions (s, note, sound, etc.) on globalThis
 *  so that safeEval can find them when evaluating pattern code.
 *  Also calls registerSynthSounds() so square/sine/triangle/sawtooth
 *  oscillator voices are available in superdough. */
function _injectStrudelGlobals(): void {
    if (_globalsInjected) return;
    const s = _getStrudel();
    if (!s) return;

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
    _injectStrudelGlobals();

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
            if (!_loading) BGM.init();
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
        _pendingTrack = null;
    },

    updateVolume(): void {
        // TODO: wire a GainNode between superdough output and destination
    },
};
