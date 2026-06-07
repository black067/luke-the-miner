/* ============================================================
   STATE.TS — Game state (GS), save/load, and combat helper functions
   ============================================================ */

import type { GameStateObj, WeaponModule, BallModule, WarehouseItem, UpgradeCost } from './types.js';
import type { GSAction } from './actions.js';
import { DATA } from './data.js';

export const SAVE_KEY = 'pinball_save_1';

// Global game state
export let GS: GameStateObj = {
    screen: 'main-menu',
    settingsReturn: 'main-menu',
    isNewGame: true,
    debt: 128000,
    bitcoin: 12450,
    cash: 3200,
    selectedArea: 'mine',
    combatResult: null,
    firstCombat: true,
    equipment: { weapon: null, ball: null, storage: null, accessories: [null, null, null] },
    quickBar: [
        { itemId: 'item_repair', qty: 3 },
        { itemId: 'item_fuelcan', qty: 3 },
        { itemId: null, qty: 0 },
    ],
    warehouse: [],
    upgrades: new Set(),
    unlocks: { radioRepaired: false, undergroundVisible: false, areas: { mine: true, insect: true, ocean: false, moon: false } },
    mailsRead: {},
    settings: {
        masterVolume: 80,
        bgmVolume: 80,
        sfxVolume: 90,
        crtFilter: 80,
        uiScale: 100,
        language: 'zh-CN',
        clippyAgent: 'Clippy',
        shakeIntensity: 100,
    },
    audio: {
        sfxCache: { randomFactor: 0 },
    },
};

// ============================================================
// DEFAULT STATE (for RESET_GAME action)
// ============================================================
const DEFAULT_GS: GameStateObj = {
    screen: 'main-menu',
    settingsReturn: 'main-menu',
    isNewGame: true,
    debt: 128000,
    bitcoin: 12450,
    cash: 3200,
    selectedArea: 'mine',
    combatResult: null,
    firstCombat: true,
    equipment: { weapon: null, ball: null, storage: null, accessories: [null, null, null] },
    quickBar: [
        { itemId: 'item_repair', qty: 3 },
        { itemId: 'item_fuelcan', qty: 3 },
        { itemId: null, qty: 0 },
    ],
    warehouse: [],
    upgrades: new Set(),
    unlocks: { radioRepaired: false, undergroundVisible: false, areas: { mine: true, insect: true, ocean: false, moon: false } },
    mailsRead: {},
    settings: {
        masterVolume: 80,
        bgmVolume: 80,
        sfxVolume: 90,
        crtFilter: 80,
        uiScale: 100,
        language: 'zh-CN',
        clippyAgent: 'Clippy',
        shakeIntensity: 100,
    },
    audio: {
        sfxCache: { randomFactor: 0 },
    },
};

// ============================================================
// REDUCER (pure — no side effects)
// ============================================================
export function gsReducer(state: GameStateObj, action: GSAction): GameStateObj {
    switch (action.type) {
        case 'SET_DEBT':
            return { ...state, debt: action.value };
        case 'ADD_BITCOIN':
            return { ...state, bitcoin: state.bitcoin + action.amount };
        case 'SET_BITCOIN':
            return { ...state, bitcoin: action.value };
        case 'ADD_CASH':
            return { ...state, cash: state.cash + action.amount };
        case 'SET_CASH':
            return { ...state, cash: action.value };
        case 'SET_COMBAT_RESULT':
            return { ...state, combatResult: action.result };
        case 'SET_FIRST_COMBAT':
            return { ...state, firstCombat: action.value };
        case 'SET_SCREEN':
            return { ...state, screen: action.screen };
        case 'SET_SETTINGS_RETURN':
            return { ...state, settingsReturn: action.from };
        case 'SET_SELECTED_AREA':
            return { ...state, selectedArea: action.area };
        case 'SET_IS_NEW_GAME':
            return { ...state, isNewGame: action.value };
        case 'SET_EQUIPMENT':
            return { ...state, equipment: action.equipment };
        case 'SET_QUICKBAR':
            return { ...state, quickBar: action.quickBar };
        case 'SET_WAREHOUSE':
            return { ...state, warehouse: action.warehouse };
        case 'SET_UPGRADES':
            return { ...state, upgrades: new Set(action.upgrades) };
        case 'ADD_UPGRADE': {
            const nextUpgrades = new Set(state.upgrades);
            nextUpgrades.add(action.upgradeId);
            return { ...state, upgrades: nextUpgrades };
        }
        case 'SET_UNLOCKS':
            return { ...state, unlocks: action.unlocks };
        case 'UNLOCK_RADIO':
            return { ...state, unlocks: { ...state.unlocks, radioRepaired: true } };
        case 'UNLOCK_UNDERGROUND':
            return { ...state, unlocks: { ...state.unlocks, undergroundVisible: true } };
        case 'UNLOCK_AREA':
            return { ...state, unlocks: { ...state.unlocks, areas: { ...state.unlocks.areas, [action.areaId]: true } } };
        case 'SET_MAILS_READ':
            return { ...state, mailsRead: action.mailsRead };
        case 'MARK_MAIL_READ':
            return { ...state, mailsRead: { ...state.mailsRead, [action.mailId]: true } };
        case 'SET_SETTINGS':
            return { ...state, settings: action.settings };
        case 'SET_MASTER_VOLUME':
            return { ...state, settings: { ...state.settings, masterVolume: action.volume } };
        case 'SET_BGM_VOLUME':
            return { ...state, settings: { ...state.settings, bgmVolume: action.volume } };
        case 'SET_SFX_VOLUME':
            return { ...state, settings: { ...state.settings, sfxVolume: action.volume } };
        case 'SET_UI_SCALE':
            return { ...state, settings: { ...state.settings, uiScale: action.scale } };
        case 'SET_CLIPPY_AGENT':
            return { ...state, settings: { ...state.settings, clippyAgent: action.agent } };
        case 'SET_SHAKE_INTENSITY':
            return { ...state, settings: { ...state.settings, shakeIntensity: action.value } };
        case 'SET_CRT_FILTER':
            return { ...state, settings: { ...state.settings, crtFilter: action.value } };
        case 'RESET_GAME':
            return { ...DEFAULT_GS, settings: { ...state.settings }, upgrades: new Set(), equipment: { weapon: null, ball: null, storage: null, accessories: [null, null, null] }, warehouse: [] };
        default:
            return state;
    }
}

// ============================================================
// DISPATCH (apply action + persist)
// ============================================================
export function dispatch(action: GSAction): void {
    GS = gsReducer(GS, action);
    // Keep window.GS reference in sync (Object.assign only copies at load time)
    (window as any).GS = GS;
    saveGame();
}

// ============================================================
// SAVE / LOAD
// ============================================================
export function saveGame(): void {
    try {
        const data = {
            debt: GS.debt,
            bitcoin: GS.bitcoin,
            cash: GS.cash,
            selectedArea: GS.selectedArea,
            firstCombat: GS.firstCombat,
            equipment: GS.equipment,
            quickBar: GS.quickBar,
            warehouse: GS.warehouse,
            upgrades: Array.from(GS.upgrades),
            unlocks: GS.unlocks,
            mailsRead: GS.mailsRead,
            settings: GS.settings,
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    }
    catch (e) { /* storage unavailable */ }
}

export function loadGame(): boolean {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        GS.debt = data.debt ?? 128000;
        GS.bitcoin = data.bitcoin ?? 12450;
        GS.cash = data.cash ?? 3200;
        GS.selectedArea = data.selectedArea || 'mine';
        GS.firstCombat = data.firstCombat ?? true;
        GS.equipment = data.equipment || { weapon: null, ball: null, storage: null, accessories: [null, null, null] };
        GS.quickBar = data.quickBar || [
            { itemId: 'item_repair', qty: 3 },
            { itemId: 'item_fuelcan', qty: 3 },
            { itemId: null, qty: 0 },
        ];
        GS.warehouse = data.warehouse || [];
        GS.upgrades = new Set(data.upgrades || []);
        GS.unlocks = data.unlocks || { radioRepaired: false, undergroundVisible: false, areas: { mine: true, insect: true, ocean: false, moon: false } };
        GS.mailsRead = data.mailsRead || {};
        GS.settings = data.settings || {
            masterVolume: 80,
            bgmVolume: 80,
            sfxVolume: 90,
            crtFilter: 80,
            uiScale: 100,
            language: 'zh-CN',
            clippyAgent: 'Clippy',
            shakeIntensity: 100,
        };
        // Migrate old saves that lack bgmVolume
        if (GS.settings.bgmVolume == null) GS.settings.bgmVolume = 80;
        GS.isNewGame = false;
        return true;
    }
    catch (e) {
        return false;
    }
}

/** Initialize new game defaults (called when no save exists) */
export function initNewGame(): void {
    const defaultWeapon = DATA.WEAPONS.find(w => w.id === 'w1');
    const defaultBall = DATA.BALLS.find(b => b.id === 'b1');
    if (defaultWeapon)
        GS.equipment.weapon = { ...defaultWeapon } as WeaponModule;
    if (defaultBall)
        GS.equipment.ball = { ...defaultBall } as BallModule;
    // Initialize warehouse with some starter items
    GS.warehouse = [
        { id: 'item_repair', name: '修复套件', icon: '🔧', type: 'consumable', quality: 'common', qty: 5, desc: '恢复30%HP', effect: 'heal', value: 0.3, carryMax: 3, priceBtc: 50 } as WarehouseItem,
        { id: 'item_fuelcan', name: '燃料罐', icon: '⛽', type: 'consumable', quality: 'common', qty: 5, desc: '补充25%燃料', effect: 'refuel', value: 0.25, carryMax: 3, priceBtc: 40 } as WarehouseItem,
        { id: 'mat_titanium', name: '钛合金板', icon: '🛡️', type: 'material', quality: 'common', qty: 3, priceBtc: 120, desc: '用于升级飞船耐久。矿区常见材料。' } as WarehouseItem,
        { id: 'mat_nozzle', name: '推进器喷嘴', icon: '🔥', type: 'material', quality: 'common', qty: 2, priceBtc: 100, desc: '用于升级引擎推力。' } as WarehouseItem,
    ];
    GS.quickBar = [
        { itemId: 'item_repair', qty: 3 },
        { itemId: 'item_fuelcan', qty: 3 },
        { itemId: null, qty: 0 },
    ];
}

// ============================================================
// WAREHOUSE HELPERS
// ============================================================
export function addToWarehouse(item: WarehouseItem): void {
    if (!item) return;
    // Merge if item with same id already in warehouse
    const existing = GS.warehouse.find(w => w.id === item.id);
    if (existing) {
        existing.qty = (existing.qty || 1) + (item.qty || 1);
    }
    else {
        GS.warehouse.push({ ...item, qty: item.qty || 1 });
    }
    saveGame();
}

export function replenishQuickBar(): void {
    for (const slot of GS.quickBar) {
        if (!slot.itemId || slot.qty <= 0) continue;
        const itemDef = DATA.ITEMS.find(it => it.id === slot.itemId);
        if (!itemDef) continue;
        const maxCarry = itemDef.carryMax || 3;
        // Count current in warehouse
        const whItem = GS.warehouse.find(w => w.id === slot.itemId);
        const whQty = whItem ? (whItem.qty || 0) : 0;
        const need = maxCarry - slot.qty;
        if (need > 0 && whQty > 0) {
            const take = Math.min(need, whQty);
            slot.qty += take;
            if (whItem) {
                whItem.qty = (whItem.qty || 1) - take;
                if (whItem.qty <= 0) {
                    const idx = GS.warehouse.indexOf(whItem);
                    if (idx >= 0) GS.warehouse.splice(idx, 1);
                }
            }
        }
    }
    saveGame();
}

export function countInWarehouse(itemId: string): number {
    const item = GS.warehouse.find(w => w.id === itemId);
    return item ? (item.qty || 1) : 0;
}

export function removeFromWarehouse(itemId: string, qty: number): void {
    const item = GS.warehouse.find(w => w.id === itemId);
    if (item) {
        item.qty = (item.qty || 1) - qty;
        if (item.qty <= 0) {
            const idx = GS.warehouse.indexOf(item);
            if (idx >= 0) GS.warehouse.splice(idx, 1);
        }
    }
    saveGame();
}

// ============================================================
// COMBAT HELPERS (derive stats from equipment + upgrades)
// ============================================================
export function getBallProps(): BallModule {
    const ball = GS.equipment.ball;
    if (!ball) {
        // Fallback defaults (minimal BallModule shape for combat system)
        return { id: 'default', name: '默认', icon: '⚪', type: 'ball', quality: 'common', desc: '', magazine: 5, dmgMult: 1.0, durability: 5 } as BallModule;
    }
    return ball;
}

export function getScatterAngle(): number {
    const weapon = GS.equipment.weapon;
    if (!weapon || weapon.scatterAngle === undefined) return 5;
    return weapon.scatterAngle;
}

export function getShipMaxFuel(): number {
    let base = 100;
    for (const upId of GS.upgrades) {
        for (const branch of Object.values(DATA.UPGRADES)) {
            for (const node of branch.nodes) {
                if (node.id === upId && node.effect.fuel) {
                    base += node.effect.fuel;
                }
            }
        }
    }
    return base;
}

export function getCargoSize(): number {
    let size = DATA.COMBAT.CARGO_BASE_SIZE || 10;
    if (GS.equipment.storage && GS.equipment.storage.extraSlots) {
        size += GS.equipment.storage.extraSlots;
    }
    for (const upId of GS.upgrades) {
        for (const branch of Object.values(DATA.UPGRADES)) {
            for (const node of branch.nodes) {
                if (node.id === upId && node.effect.cargo) {
                    size += node.effect.cargo;
                }
            }
        }
    }
    return size;
}

export function getWeaponAtk(): number {
    const weapon = GS.equipment.weapon;
    if (!weapon || weapon.atk === undefined) return 20;
    return weapon.atk;
}

export function getShipMaxHP(): number {
    let hp = DATA.COMBAT.SHIP_BASE_HP || 5;
    for (const upId of GS.upgrades) {
        for (const branch of Object.values(DATA.UPGRADES)) {
            for (const node of branch.nodes) {
                if (node.id === upId && node.effect.hp) {
                    hp += node.effect.hp;
                }
            }
        }
    }
    return hp;
}

export function getShipSpeedMult(): number {
    let speed = 1.0;
    for (const upId of GS.upgrades) {
        for (const branch of Object.values(DATA.UPGRADES)) {
            for (const node of branch.nodes) {
                if (node.id === upId && node.effect.speed) {
                    speed += node.effect.speed;
                }
            }
        }
    }
    return speed;
}

export function getFireInterval(): number {
    const weapon = GS.equipment.weapon;
    if (!weapon || weapon.fireInterval === undefined) return 0.16;
    return weapon.fireInterval;
}

export function hasMechanic(mechanicId: string): boolean {
    if (GS.equipment.weapon && GS.equipment.weapon.mechanic === mechanicId) return true;
    if (GS.equipment.ball && GS.equipment.ball.mechanic === mechanicId) return true;
    if (GS.equipment.storage && GS.equipment.storage.mechanic === mechanicId) return true;
    for (const acc of GS.equipment.accessories) {
        if (acc && acc.mechanic === mechanicId) return true;
    }
    return false;
}

export function hasSpecialAbility(abilityId: string): boolean {
    for (const upId of GS.upgrades) {
        for (const branch of Object.values(DATA.UPGRADES)) {
            for (const node of branch.nodes) {
                if (node.id === upId && node.effect.special === abilityId) {
                    return true;
                }
            }
        }
    }
    return false;
}

// ============================================================
// ACCESSORY SLOTS (from upgrades)
// ============================================================
export function getAccessorySlotCount(): number {
    let slots = 1;
    for (const upId of GS.upgrades) {
        for (const branch of Object.values(DATA.UPGRADES)) {
            for (const node of branch.nodes) {
                if (node.id === upId && node.effect.accSlot) {
                    slots = Math.max(slots, node.effect.accSlot);
                }
            }
        }
    }
    return slots;
}

// ============================================================
// UPGRADE COST HELPERS
// ============================================================
export function canAffordUpgrade(cost: UpgradeCost): boolean {
    if (!cost) return true;
    if (cost.materials) {
        for (const mat of cost.materials) {
            if (countInWarehouse(mat.id) < mat.qty) return false;
        }
    }
    if (cost.btc && GS.bitcoin < cost.btc) return false;
    if (cost.cash && GS.cash < cost.cash) return false;
    return true;
}

export function deductUpgradeCost(cost: UpgradeCost): void {
    if (!cost) return;
    if (cost.materials) {
        for (const mat of cost.materials) {
            const wh = GS.warehouse.find(w => w.id === mat.id);
            if (wh) {
                wh.qty = (wh.qty || 1) - mat.qty;
                if (wh.qty <= 0) {
                    const idx = GS.warehouse.indexOf(wh);
                    if (idx >= 0) GS.warehouse.splice(idx, 1);
                }
            }
        }
    }
    if (cost.btc) GS.bitcoin -= cost.btc;
    if (cost.cash) GS.cash -= cost.cash;
    saveGame();
}

// ============================================================
// CLIPPY AGENT SWITCHER (called from settings HTML)
// ============================================================

export function switchClippyAgent(agent: string): void {
    dispatch({ type: 'SET_CLIPPY_AGENT', agent });
    // Delegate to main.ts's unified clippy loader (handles destroy + load + show)
    const loadFn = (window as any).__loadClippyAgent;
    if (typeof loadFn === 'function') {
        loadFn(agent);
    }
}

