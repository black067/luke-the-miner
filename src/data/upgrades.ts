/* ============================================================
   DATA/UPGRADES.TS — UPGRADES
   ============================================================ */

import type { UpgradeBranch } from '../types.js';

export const UPGRADES: Record<string, UpgradeBranch> = {
    hp: {
        name: 'HP上限', icon: '🛡️', description: '提升飞船基础耐久',
        nodes: [
            { id: 'hp1', label: '装甲板 I', cost: { materials: [{ id: 'mat_titanium', qty: 2 }], btc: 100 }, effect: { hp: 10 }, req: null },
            { id: 'hp2', label: '装甲板 II', cost: { materials: [{ id: 'mat_titanium', qty: 4 }], btc: 250 }, effect: { hp: 15 }, req: 'hp1' },
            { id: 'hp3', label: '陶瓷镀层', cost: { materials: [{ id: 'mat_ceramic', qty: 3 }], btc: 500 }, effect: { hp: 25 }, req: 'hp2' },
            { id: 'hp4', label: '纳米装甲', cost: { materials: [{ id: 'mat_ceramic', qty: 5 }, { id: 'mat_quantum', qty: 2 }], btc: 1000 }, effect: { hp: 40 }, req: 'hp3' },
        ]
    },
    fuel: {
        name: '燃料容量', icon: '⛽', description: '提升最大燃料值',
        nodes: [
            { id: 'fuel1', label: '储罐扩容 I', cost: { materials: [{ id: 'mat_helium', qty: 2 }], btc: 100 }, effect: { fuel: 15 }, req: null },
            { id: 'fuel2', label: '储罐扩容 II', cost: { materials: [{ id: 'mat_helium', qty: 4 }], btc: 250 }, effect: { fuel: 20 }, req: 'fuel1' },
            { id: 'fuel3', label: '高效储罐', cost: { materials: [{ id: 'mat_helium', qty: 6 }, { id: 'mat_battery', qty: 3 }], btc: 500 }, effect: { fuel: 30 }, req: 'fuel2' },
        ]
    },
    speed: {
        name: '移动速度', icon: '🚀', description: '提升飞船横向移动速度',
        nodes: [
            { id: 'spd1', label: '推进器 I', cost: { materials: [{ id: 'mat_nozzle', qty: 2 }], btc: 100 }, effect: { speed: 0.15 }, req: null },
            { id: 'spd2', label: '推进器 II', cost: { materials: [{ id: 'mat_nozzle', qty: 4 }], btc: 200 }, effect: { speed: 0.20 }, req: 'spd1' },
            { id: 'spd3', label: '离子推进器', cost: { materials: [{ id: 'mat_nozzle', qty: 6 }, { id: 'mat_battery', qty: 4 }], btc: 450 }, effect: { speed: 0.25 }, req: 'spd2' },
        ]
    },
    cargo: {
        name: '货舱容量', icon: '📦', description: '增加基础货舱格数',
        nodes: [
            { id: 'cargo1', label: '货舱扩容 I', cost: { materials: [{ id: 'mat_titanium', qty: 3 }], btc: 150 }, effect: { cargo: 2 }, req: null },
            { id: 'cargo2', label: '货舱扩容 II', cost: { materials: [{ id: 'mat_titanium', qty: 5 }, { id: 'mat_battery', qty: 2 }], btc: 350 }, effect: { cargo: 3 }, req: 'cargo1' },
            { id: 'cargo3', label: '货舱扩容 III', cost: { materials: [{ id: 'mat_ceramic', qty: 4 }, { id: 'mat_quantum', qty: 1 }], btc: 700 }, effect: { cargo: 5 }, req: 'cargo2' },
        ]
    },
    accessory: {
        name: '饰品槽位', icon: '💍', description: '解锁额外饰品槽位',
        nodes: [
            { id: 'acc2', label: '解锁饰品②', cost: { materials: [{ id: 'mat_battery', qty: 5 }], cash: 200 }, effect: { accSlot: 2 }, req: null },
            { id: 'acc3', label: '解锁饰品③', cost: { materials: [{ id: 'mat_starchart', qty: 1 }], cash: 800 }, effect: { accSlot: 3 }, req: 'acc2' },
        ]
    },
    special: {
        name: '特殊能力', icon: '⚡', description: '解锁飞船被动能力',
        nodes: [
            { id: 'spec_regen', label: '自动回血', cost: { materials: [{ id: 'mat_ceramic', qty: 4 }], btc: 400 }, effect: { special: 'autoRegen' }, req: null, desc: '脱战后缓慢恢复HP' },
            { id: 'spec_shield', label: '紧急护盾', cost: { materials: [{ id: 'mat_ceramic', qty: 5 }, { id: 'mat_quantum', qty: 2 }], btc: 800 }, effect: { special: 'emergencyShield' }, req: 'spec_regen', desc: 'HP低于30%时自动触发短暂无敌（冷却60秒）' },
            { id: 'spec_fuelback', label: '燃料回收', cost: { materials: [{ id: 'mat_battery', qty: 3 }, { id: 'mat_nozzle', qty: 3 }], btc: 350 }, effect: { special: 'fuelReclaim' }, req: null, desc: '击败敌人时恢复少量燃料' },
            { id: 'spec_pickup', label: '拾取扩大', cost: { materials: [{ id: 'mat_battery', qty: 4 }, { id: 'mat_titanium', qty: 3 }], btc: 300 }, effect: { special: 'pickupRange' }, req: null, desc: '战利品自动拾取范围增大' },
            { id: 'spec_preload', label: '开局弹仓+1', cost: { materials: [{ id: 'mat_nozzle', qty: 5 }, { id: 'mat_battery', qty: 3 }], btc: 500 }, effect: { special: 'preloadAmmo' }, req: null, desc: '每次战斗开始时弹仓多1颗预填弹珠' },
        ]
    },
};
