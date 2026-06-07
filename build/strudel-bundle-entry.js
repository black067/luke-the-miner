/* ============================================================
   STRUDEL-BUNDLE-ENTRY.JS — Entry point for esbuild bundling
   Bundles @strudel/core, @strudel/mini, @strudel/webaudio
   into a single IIFE that exposes strudel APIs on window.__strudel
   ============================================================ */

import * as core from '@strudel/core';
import * as mini from '@strudel/mini';
import * as webaudio from '@strudel/webaudio';

// Expose on window for the game to access
window.__strudel = { core, mini, webaudio };
