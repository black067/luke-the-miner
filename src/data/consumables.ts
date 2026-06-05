/* ============================================================
   DATA/CONSUMABLES.TS — ITEMS, MATERIALS, ORES
   ============================================================ */

import type { ItemDef, MaterialDef, OreDef } from '../types.js';

export const ITEMS: ItemDef[] = [
    { id: 'item_repair', name: '修复套件', icon: '🔧', type: 'consumable', desc: '恢复 30% HP', effect: 'heal', value: 0.3, carryMax: 3, priceBtc: 50, quality: 'common' },
    { id: 'item_fuelcan', name: '燃料罐', icon: '⛽', type: 'consumable', desc: '补充 25% 燃料', effect: 'refuel', value: 0.25, carryMax: 3, priceBtc: 40, quality: 'common' },
    { id: 'item_nanofix', name: '纳米修复包', icon: '🔧', type: 'consumable', desc: '恢复 60% HP', effect: 'heal', value: 0.6, carryMax: 2, priceBtc: 120, quality: 'rare' },
    { id: 'item_shieldgen', name: '护盾发生器', icon: '🛡️', type: 'consumable', desc: '使用后获得8秒无敌', effect: 'buff', buffId: 'invincible', carryMax: 1, priceBtc: 300, quality: 'epic' },
    { id: 'item_penetrate', name: '穿甲弹', icon: '💥', type: 'consumable', desc: '15秒内弹珠穿透敌人', effect: 'buff', buffId: 'penetrate', carryMax: 2, priceBtc: 150, quality: 'rare' },
    { id: 'item_autocollect', name: '磁力场', icon: '🧲', type: 'consumable', desc: '20秒内自动吸取战利品', effect: 'buff', buffId: 'autoCollect', carryMax: 2, priceBtc: 100, quality: 'rare' },
];

export const MATERIALS: MaterialDef[] = [
    { id: 'mat_titanium', name: '钛合金板', icon: '🛡️', type: 'material', desc: '用于升级飞船耐久。矿区常见材料。', priceBtc: 120, quality: 'common' },
    { id: 'mat_ceramic', name: '陶瓷装甲板', icon: '🛡️', type: 'material', desc: '高级装甲材料，大幅提升耐久。', priceBtc: 300, quality: 'rare' },
    { id: 'mat_helium', name: '氦-3储罐', icon: '⚗️', type: 'material', desc: '用于升级燃料容量。', priceBtc: 250, quality: 'rare' },
    { id: 'mat_nozzle', name: '推进器喷嘴', icon: '🔥', type: 'material', desc: '用于升级引擎推力。', priceBtc: 100, quality: 'common' },
    { id: 'mat_battery', name: '能量电池', icon: '🔋', type: 'material', desc: '通用能源组件，多种升级需要。', priceBtc: 150, quality: 'common' },
    { id: 'mat_starchart', name: '星图碎片', icon: '🗺️', type: 'material', desc: '极稀有的导航数据，用于解锁高级升级。', priceBtc: 1500, quality: 'legend' },
    { id: 'mat_darkmatter', name: '暗物质核心', icon: '🕳️', type: 'material', desc: '传说级升级材料，用于终极强化。', priceBtc: 5000, quality: 'mythic' },
    { id: 'mat_quantum', name: '量子处理器', icon: '💠', type: 'material', desc: '用于升级特殊能力。', priceBtc: 600, quality: 'epic' },
];

export const ORES: OreDef[] = [
    { id: 'ore_iron', name: '铁矿石', icon: '🪨', price: 40, desc: '最普通的矿石，矿区的支柱产出。' },
    { id: 'ore_copper', name: '铜矿石', icon: '🪨', price: 65, desc: '比铁矿值钱一点，矿区深层的常见矿物。' },
    { id: 'ore_gold', name: '金矿石', icon: '✨', price: 180, desc: '稀有的金矿，运气好的时候才能挖到。' },
    { id: 'ore_diamond', name: '钻石原石', icon: '💎', price: 500, desc: '极稀有的钻石，一块就能还不少债。' },
];
