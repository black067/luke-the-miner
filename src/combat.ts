/* ============================================================
   COMBAT.TS — Combat entry point: start/stop, loop, and re-exports.
   Imports from sub-modules to keep each file focused.
   ============================================================ */

import { DATA } from './data.js';
import { GS, getBallProps, getShipMaxHP, getShipMaxFuel, hasMechanic, hasSpecialAbility } from './state.js';
import { showScreen, showToast } from './screens.js';
import { showSettings } from './settings.js';
import { showSettlement } from './settlement.js';
import { C, CombatCargo, VW, VH, COMBAT, WALL } from './combat-state.js';
import { useQuickSlot, startWave, createEnemy, spawnParticle, tryDropLoot } from './combat-systems.js';
import { update } from './combat-update.js';
import {
    showPauseMenu, closePauseMenu,
    openCombatInventory, closeCombatInventory,
    showEarlyEvacConfirm,
    updateHtmlHUD,
    combatToast,
} from './combat-ui.js';
import type { CombatResult, EnemyDef } from './types.js';

// ============================================================
// OWNED MUTABLE VARIABLES (written by this module)
// ============================================================
export let combatCanvas: HTMLCanvasElement | null = null;
export let combatCtx: CanvasRenderingContext2D = null!;
export let combatRafId: number | null = null;
export let _combatLastTime: number = 0;

// ============================================================
// RE-EXPORTS — external consumers
// ============================================================
export { C, CombatCargo } from './combat-state.js';
export { COMBAT, VW, VH, WALL } from './combat-state.js';
export { dist, len, norm, rand, randInt, clamp, rayRectHit, reflectOnEdge, rayCircleHit } from './combat-math.js';
export { getGunPos, createPinball, createEnemy, spawnParticle, spawnDmgNumber } from './combat-systems.js';
export { startWave, spawnNextEnemy, firePinball, applyBuff, getBuffBonus, getFuelDropChance, tryDropLoot, generateRandomModule, processHitEnemy, getComboBonus } from './combat-systems.js';
export { updateShip, updatePinballs, updateEnemies, updateFuelBlocks, updateBuffs, updateParticles, updateDmgNumbers, updateWave, updatePreviewLine } from './combat-update.js';
export { showPauseMenu, closePauseMenu, openCombatInventory, closeCombatInventory, selectCargoItem, discardSelectedCargoItem, showEarlyEvacConfirm, closeEarlyEvacConfirm, updateHtmlHUD, combatToast, updateCombatToast } from './combat-ui.js';
export { renderCombatCargoGrid, renderCombatCargoDetailContent, renderCombatCargoDetailActions, refreshCombatCargoUI } from './combat-ui.js';

// ============================================================
// COMBAT LOOP
// ============================================================

function combatLoop(timestamp: number): void {
    // Dynamic import to break circular dependency with combat-render.ts
    import('./combat-render.js').then(m => {
        if (!combatCanvas || C.state === 'idle') {
            combatRafId = requestAnimationFrame(combatLoop);
            return;
        }
        if (C.state === 'paused') {
            m.renderCombat();
            combatRafId = requestAnimationFrame(combatLoop);
            return;
        }
        const dt = (timestamp - _combatLastTime) / 1000;
        _combatLastTime = timestamp;
        if (dt > 0 && dt < 0.5) update(dt);
        m.renderCombat();
        updateHtmlHUD();
        // Check for terminal states (deferred from sub-modules to avoid circular deps)
        const terminalStates: string[] = ['victory', 'defeat', 'breakdown', 'evacuate'];
        if (terminalStates.includes(C.state)) {
            endCombat(C.state as CombatResult);
            return;
        }
        combatRafId = requestAnimationFrame(combatLoop);
    });
}

// ============================================================
// COMBAT START / STOP
// ============================================================

export function syncCombatCanvasZoom(): void {
    const canvas = document.getElementById('combat-canvas');
    if (!canvas) return;
    const crtContent = document.getElementById('crt-content');
    if (crtContent) {
        const parentZoom = parseFloat(getComputedStyle(crtContent).zoom) || 1;
        canvas.style.zoom = String(1 / parentZoom);
    }
}

export function startCombat(areaId: string): void {
    C.areaId = areaId || 'mine';
    resetCombatState();
    combatCanvas = document.getElementById('combat-canvas') as HTMLCanvasElement;
    if (!combatCanvas) return;
    combatCtx = combatCanvas.getContext('2d')!;
    syncCombatCanvasZoom();
    combatCanvas.width = VW;
    combatCanvas.height = VH;
    const ball = getBallProps();
    C.ammo = ball.magazine;
    const maxHp = getShipMaxHP();
    const maxFuel = getShipMaxFuel();
    C.ship.hp = maxHp;
    C.ship.fuel = maxFuel;
    // Entry animation: ship starts below screen
    C.ship.y = VH + COMBAT.SHIP_H;
    C.ship.entryTimer = COMBAT.SHIP_ENTRY_TIME;
    C.comboActive = hasMechanic('comboMultiplier');
    C.comboCount = 0;
    C.comboTimer = 0;
    if (hasSpecialAbility('preloadAmmo')) {
        C.ammo = Math.min(ball.magazine, C.ammo + 1);
    }
    C.state = 'playing';
    C._startTime = performance.now();
    _combatLastTime = performance.now();
    startWave();
    if (GS.firstCombat && !C._tutorialShown) {
        C._tutorialShown = true;
        setTimeout(() => {
            if (C.state === 'playing')
                showToast('💡 鼠标瞄准，左键发射弹珠 | A/D 移动 | Tab 货舱 | ESC 暂停');
        }, 1500);
    }
    combatRafId = requestAnimationFrame(combatLoop);
    // Input setup
    combatCanvas.onmousemove = function (e) {
        const rect = combatCanvas!.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (VW / rect.width);
        const my = (e.clientY - rect.top) * (VH / rect.height);
        C.mouse.x = mx;
        C.mouse.y = my;
        combatCanvas!.style.cursor = 'crosshair';
    };
    combatCanvas.onmousedown = function (e) {
        if (e.button === 0) { C.mouseDown = true; e.preventDefault(); }
    };
    combatCanvas.onmouseup = function (e) {
        if (e.button === 0) C.mouseDown = false;
    };
    combatCanvas.oncontextmenu = function (e) { e.preventDefault(); };
    window.addEventListener('keydown', combatKeyDown);
    window.addEventListener('keyup', combatKeyUp);
    combatCanvas.style.display = 'block';
}

export function stopCombat(): void {
    C.state = 'idle';
    if (combatRafId) { cancelAnimationFrame(combatRafId); combatRafId = null; }
    window.removeEventListener('keydown', combatKeyDown);
    window.removeEventListener('keyup', combatKeyUp);
    closePauseMenu();
    closeCombatInventory();
    if (combatCanvas) combatCanvas.style.display = 'none';
}

export function endCombat(result: CombatResult): void {
    C.state = result;
    if (combatRafId) { cancelAnimationFrame(combatRafId); combatRafId = null; }
    window.removeEventListener('keydown', combatKeyDown);
    window.removeEventListener('keyup', combatKeyUp);
    closePauseMenu();
    closeCombatInventory();
    if (combatCanvas) combatCanvas.style.display = 'none';
    showSettlement(result, C.stats, C.areaId);
}

export function resetCombatState(): void {
    C.state = 'idle';
    C.ship = { x: VW / 2, y: COMBAT.SHIP_Y, hp: getShipMaxHP(), fuel: getShipMaxFuel(), invincibleTimer: 0, cannonAngle: -Math.PI / 2, entryTimer: COMBAT.SHIP_ENTRY_TIME, thrustX: 0, thrustY: 0, godMode: false };
    C.pinballs = [];
    C.ammo = getBallProps().magazine;
    C.fireCooldown = 0;
    C.enemies = [];
    C.fuelBlocks = [];
    C.buffs = [];
    C.wave = { index: 0, name: '', spawnQueue: [], spawnTimer: 0, bossSpawned: false, allSpawned: false };
    C.particles = [];
    C.dmgNumbers = [];
    C.laserBeams = [];
    C.combatToast = { msg: '', life: 0 };
    C.ammoShake = 0;
    C.mouse = { x: VW / 2, y: VH / 2 };
    C.mouseDown = false;
    C.stats = { killed: 0, hits: 0, shots: 0, oreValue: 0, resourceCollected: 0, cargo: [], hpLost: 0, time: 0, fuelDepleted: false };
    C.shakeTimer = 0;
    C.shakeMagnitude = 0;
    C.preview = { p1: null, p2: null, targetHit: 0 };
    C.keys = {};
    C._hudBtns = [];
    C._hoveredBtn = null;
    C.comboCount = 0;
    C.comboTimer = 0;
    CombatCargo.length = 0;
}

// ============================================================
// KEY HANDLERS
// ============================================================

export function combatKeyDown(e: KeyboardEvent): void {
    C.keys[e.key] = true;
    if (e.key === '1') useQuickSlot(0);
    if (e.key === '2') useQuickSlot(1);
    if (e.key === '3') useQuickSlot(2);
    if (e.key === 'Tab') { openCombatInventory(); e.preventDefault(); }
    if (e.key === 'Escape') { togglePause(); }
    // Debug hotkeys (Ctrl+Shift+...)
    if (e.ctrlKey && e.shiftKey) {
        if (e.key === 'K' || e.key === 'k') { debugKillAllEnemies(); e.preventDefault(); }
        if (e.key === 'G' || e.key === 'g') { debugToggleGodMode(); e.preventDefault(); }
        if (e.key === 'F' || e.key === 'f') { debugRefillFuel(); e.preventDefault(); }
    }
}

export function combatKeyUp(e: KeyboardEvent): void { C.keys[e.key] = false; }

// ============================================================
// PAUSE / EVACUATION (orchestration)
// ============================================================

export function togglePause(): void {
    if (C.state === 'playing') {
        C.state = 'paused';
        showPauseMenu();
    } else if (C.state === 'paused') {
        closePauseMenu();
        C.state = 'playing';
    }
}

export function resumeFromPause(): void { closePauseMenu(); C.state = 'playing'; }

export function showSettingsFromPause(): void {
    GS.settingsReturn = 'combat-pause';
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.style.display = 'none';
    showSettings('combat-pause');
}

export function exitCombatToMenu(): void {
    closePauseMenu();
    stopCombat();
    showScreen('main-menu');
}

export function tryEvacuate(): void {
    if (C.state !== 'playing') return;
    const area = DATA.AREAS.find(a => a.id === C.areaId);
    const goal = area ? area.resourceGoal : 30;
    if (C.stats.resourceCollected < goal) {
        C.state = 'paused';
        showEarlyEvacConfirm(goal);
        return;
    }
    C.state = 'victory';
    C.stats.time = performance.now() - C._startTime;
    // endCombat called by combatLoop on next frame
}

export function confirmEarlyEvac(): void {
    const ov = document.getElementById('evac-confirm-overlay');
    if (ov) ov.remove();
    C.stats.time = performance.now() - C._startTime;
    C.state = 'evacuate';
    // endCombat called by combatLoop on next frame
}

// ============================================================
// DEBUG METHODS (exposed on window.__combatDebug)
// ============================================================

import { SFX } from './audio.js';

export function debugKillAllEnemies(): void {
    if (C.state !== 'playing') return;
    for (const e of [...C.enemies]) {
        spawnParticle(e.x, e.y, 8, '#ff4444', 100);
        C.stats.killed++;
        tryDropLoot(e.x, e.y, e.def);
    }
    C.enemies.length = 0;
    C.wave.spawnQueue.length = 0;
    C.wave.allSpawned = true;
    SFX.play('bossKill');
    combatToast('☠ 调试：已清除所有敌人', 1.5);
}

export function debugSpawnEnemy(enemyId: string): void {
    if (C.state !== 'playing') return;
    // Support both data key (e.g. 'laserTurret') and id field (e.g. 'e_laser')
    let def: EnemyDef | undefined = DATA.ENEMIES[enemyId];
    if (!def) {
        def = Object.values(DATA.ENEMIES).find(e => e.id === enemyId);
    }
    if (!def) { combatToast('❌ 未知敌人ID: ' + enemyId, 1.5); return; }
    const spawnX = C.ship.x + (Math.random() - 0.5) * 200;
    const spawnY = WALL.top + 40;
    const enemy = createEnemy(spawnX, spawnY, def);
    if (def.mechanic === 'boss') {
        C.wave.bossSpawned = true;
        enemy.isBoss = true;
        combatToast('⚠ 调试：刷出BOSS ' + def.name, 1.5);
        C.shakeTimer = 0.2;
    }
    C.enemies.push(enemy);
    combatToast('🐛 调试：刷出 ' + def.name, 1.0);
}

export function debugToggleGodMode(): void {
    C.ship.godMode = !C.ship.godMode;
    combatToast(C.ship.godMode ? '🛡 无敌模式：开' : '🛡 无敌模式：关', 1.2);
}

export function debugRefillFuel(): void {
    C.ship.fuel = getShipMaxFuel();
    combatToast('⛽ 燃料已补满', 1.0);
}

// Expose on window for browser console access
if (typeof window !== 'undefined') {
    (window as any).__combatDebug = {
        killAll: debugKillAllEnemies,
        spawn: debugSpawnEnemy,
        god: debugToggleGodMode,
        fuel: debugRefillFuel,
    };
}
