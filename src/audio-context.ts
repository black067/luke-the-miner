/* ============================================================
   AUDIO-CONTEXT.TS — Single shared AudioContext for the whole app.
   Imported by audio.ts (SFX/UI) and bgm-strudel.ts (Strudel BGM)
   without creating circular dependencies.
   ============================================================ */

let _sharedCtx: AudioContext | null = null;

/** Get-or-create the shared AudioContext. Also resumes if suspended. */
export function getSharedAudioContext(): AudioContext | null {
    if (!_sharedCtx) {
        try {
            _sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (_e) {
            /* Web Audio unavailable */
        }
    }
    if (_sharedCtx && _sharedCtx.state === 'suspended') {
        _sharedCtx.resume();
    }
    return _sharedCtx;
}
