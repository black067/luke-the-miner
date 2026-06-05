/* ============================================================
   DATA/COMBAT-DATA.TS — ENEMIES, WAVES, COMBAT
   ============================================================ */

import type { EnemyDef, WaveDef, CombatConstants } from '../types.js';

export const ENEMIES: Record<string, EnemyDef> = {
    rockCrawler: { id: 'e_rock', name: '碎石蟹', icon: '🦀', hp: 2, dmg: 1, speed: 50, w: 20, h: 20, behavior: 'hover', desc: '在矿区表面缓慢爬行的小型敌人。' },
    dustMite: { id: 'e_dust', name: '尘埃螨', icon: '🕷️', hp: 1, dmg: 1, speed: 85, w: 16, h: 16, behavior: 'zigzag', desc: '快速游走的小型敌人，难以命中。' },
    oreGuardian: { id: 'e_guard', name: '矿石哨卫', icon: '🗿', hp: 4, dmg: 2, speed: 0, w: 24, h: 24, behavior: 'static', desc: '固定在矿脉附近的防御单位，不移动。' },
    scrapDrone: { id: 'e_scrap', name: '废铁无人机', icon: '🛸', hp: 3, dmg: 1, speed: 60, w: 22, h: 18, behavior: 'dive', desc: '废弃的采矿无人机，直线俯冲攻击。' },
    crystalShard: { id: 'e_crystal', name: '晶簇碎片', icon: '💠', hp: 1, dmg: 2, speed: 70, w: 14, h: 14, behavior: 'hover', desc: '锋利的晶簇碎片，碰撞伤害较高。' },
    // Elite enemies
    splitter: { id: 'e_split', name: '分裂矿核', icon: '🪨', hp: 6, dmg: 2, speed: 40, w: 28, h: 28, behavior: 'hover', mechanic: 'split', desc: '被击败后分裂为2-3个小体。' },
    shieldGuard: { id: 'e_shield', name: '护盾哨卫', icon: '🗿', hp: 5, dmg: 2, speed: 0, w: 26, h: 26, behavior: 'static', mechanic: 'shield', desc: '前3次弹珠命中被护盾吸收。' },
    bomber: { id: 'e_bomber', name: '自爆矿虫', icon: '💣', hp: 3, dmg: 1, speed: 55, w: 22, h: 22, behavior: 'dive', mechanic: 'explode', desc: '死亡时触发范围爆炸。' },
    laserTurret: { id: 'e_laser', name: '激光炮塔', icon: '📡', hp: 5, dmg: 0, speed: 0, w: 24, h: 24, behavior: 'static', mechanic: 'laser', desc: '定时发射激光，发射前有红色预告线。' },
    // Boss
    mineBoss: { id: 'e_boss', name: '矿区领主', icon: '👾', hp: 20, dmg: 3, speed: 28, w: 42, h: 42, behavior: 'boss', mechanic: 'boss', desc: '矿区最深处的巨型敌人。' },
};

export const WAVES: WaveDef[] = [
    { index: 0, name: '矿区边缘', enemies: [
            { type: 'e_rock', count: 4, interval: 1.0 },
            { type: 'e_dust', count: 2, interval: 1.2 },
        ] },
    { index: 1, name: '矿区浅层', enemies: [
            { type: 'e_rock', count: 3, interval: 0.9 },
            { type: 'e_dust', count: 3, interval: 1.0 },
            { type: 'e_guard', count: 1, interval: 2.5 },
        ] },
    { index: 2, name: '矿区中层', enemies: [
            { type: 'e_rock', count: 3, interval: 0.8 },
            { type: 'e_scrap', count: 3, interval: 1.0 },
            { type: 'e_crystal', count: 2, interval: 1.1 },
            { type: 'e_split', count: 1, interval: 3.0 },
        ] },
    { index: 3, name: '矿区深处', boss: true, enemies: [
            { type: 'e_boss', count: 1, interval: 4.0 },
            { type: 'e_rock', count: 3, interval: 1.0 },
            { type: 'e_scrap', count: 2, interval: 1.2 },
        ] },
    { index: 4, name: '矿区暗层', enemies: [
            { type: 'e_shield', count: 1, interval: 3.0 },
            { type: 'e_crystal', count: 4, interval: 0.9 },
            { type: 'e_scrap', count: 3, interval: 1.0 },
            { type: 'e_dust', count: 3, interval: 1.0 },
        ] },
    { index: 5, name: '矿区核心', enemies: [
            { type: 'e_laser', count: 2, interval: 2.5 },
            { type: 'e_bomber', count: 2, interval: 2.0 },
            { type: 'e_shield', count: 1, interval: 3.0 },
            { type: 'e_crystal', count: 4, interval: 0.8 },
        ] },
    { index: 6, name: '矿区Boss', boss: true, enemies: [
            { type: 'e_boss', count: 1, interval: 4.0 },
            { type: 'e_split', count: 1, interval: 3.0 },
            { type: 'e_bomber', count: 2, interval: 2.0 },
            { type: 'e_laser', count: 1, interval: 2.5 },
            { type: 'e_scrap', count: 3, interval: 1.2 },
        ] },
];

export const COMBAT: CombatConstants = {
    VW: 640, VH: 360,
    WALL_MARGIN: 8,
    SHIP_W: 34, SHIP_H: 24, SHIP_Y: 312,
    SHIP_BASE_HP: 5, SHIP_BASE_FUEL: 100,
    SHIP_SPEED: 160, SHIP_INVINCIBLE_S: 1.0,
    PB_RADIUS: 3, PB_SPEED: 320,
    PB_SPEED_MULT: 1.22, PB_SPEED_CAP: 2.0,
    PB_DURABILITY_DEFAULT: 5,
    PB_FIRE_INTERVAL_DEFAULT: 0.16,
    ENEMY_W: 20, ENEMY_H: 20,
    BOSS_W: 42, BOSS_H: 42,
    FUEL_DRAIN: 0.5, FUEL_MOVE_DRAIN: 0.01,
    FUEL_DROP_THRESHOLD: 30, FUEL_DROP_FLOOR: 3,
    FUEL_DROP_CHANCE_BASIC: 0.1,
    FUEL_MAX_BLOCKS: 3, FUEL_RESTORE: 12,
    FUEL_BLOCK_RADIUS: 5, FUEL_GHOST_SPEED: 200,
    CARGO_BASE_SIZE: 12,
    QUICK_BAR_SLOTS: 3,
    DEBT_RATIO: 0.5,
    COMBO_TIMEOUT: 3.0,
    COMBO_THRESHOLDS: [0, 10, 20, 30],
    COMBO_MULTIPLIERS: [1.0, 1.5, 2.0, 3.0],
    COMBO_COLORS: ['#fff', '#48f', '#a3f', '#f80'],
    SCATTER_DEFAULT: 5,
};
