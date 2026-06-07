/* ============================================================
   COMBAT-STATE.TS — Combat state, constants, and canvas references
   ============================================================ */

import { DATA } from './data.js';
import type { CombatState, WarehouseItem } from './types.js';

export const COMBAT = DATA.COMBAT;
export const VW = COMBAT.VW;
export const VH = COMBAT.VH;
export const WALL = {
    left: COMBAT.WALL_MARGIN,
    right: VW - COMBAT.WALL_MARGIN,
    top: COMBAT.WALL_MARGIN,
    bottom: VH - COMBAT.WALL_MARGIN,
};

// Combat state (mutable for performance — not managed by dispatch)
export const C: CombatState = {
    state: 'idle',
    areaId: 'mine',
    ship: { x: VW / 2, y: COMBAT.SHIP_Y, hp: 5, fuel: 100, invincibleTimer: 0, cannonAngle: -Math.PI / 2, entryTimer: 0, thrustX: 0, thrustY: 0, godMode: false },
    pinballs: [],
    ammo: 5,
    fireCooldown: 0,
    enemies: [],
    fuelBlocks: [],
    buffs: [],
    wave: { index: 0, name: '', spawnQueue: [], spawnTimer: 0, bossSpawned: false, allSpawned: false },
    particles: [],
    dmgNumbers: [],
    laserBeams: [],
    combatToast: { msg: '', life: 0 },
    ammoShake: 0,
    mouse: { x: VW / 2, y: VH / 2 },
    mouseDown: false,
    stats: {
        killed: 0, hits: 0, shots: 0,
        oreValue: 0, resourceCollected: 0,
        cargo: [],
        hpLost: 0, time: 0,
    },
    shakeTimer: 0,
    preview: { p1: null, p2: null, targetHit: 0 },
    keys: {},
    _startTime: 0,
    _hudBtns: [],
    _hoveredBtn: null,
    _tutorialShown: false,
    comboCount: 0,
    comboTimer: 0,
    comboActive: false,
};

// Combat cargo (separate from GS.warehouse)
export let CombatCargo: WarehouseItem[] = [];
