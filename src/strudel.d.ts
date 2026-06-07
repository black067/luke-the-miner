// Type declarations for CDN-loaded strudel packages.
// These modules are resolved at runtime via the import map in index.html.
declare module '@strudel/core' {
    export const repl: any;
    export function hush(): void;
    export function getAudioContext(): AudioContext | null;
}
declare module '@strudel/mini' {
    export function mini(code: string): any;
}
declare module '@strudel/webaudio' {
    export function initAudio(): Promise<void>;
    export const webaudioRepl: any;
    export function getAudioContext(): AudioContext | null;
}
