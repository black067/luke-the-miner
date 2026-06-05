/* ============================================================
   DATA/MODULES.TS — QUALITY, WEAPONS, BALLS, STORAGES, ACCESSORY_POOL, AFFIX_POOL
   ============================================================ */

import type { QualityDef, QualityKey, WeaponModule, BallModule, StorageModule, AccessoryModule, AffixDef } from '../types.js';

export const QUALITY: Record<QualityKey, QualityDef> = {
    common: { name: '普通', color: '#aaa', weight: 60, affixCount: 0, hasMechanic: false },
    rare: { name: '稀有', color: '#48f', weight: 25, affixCount: 1, hasMechanic: false },
    epic: { name: '史诗', color: '#a3f', weight: 10, affixCount: 2, hasMechanic: false },
    legend: { name: '传说', color: '#f80', weight: 4, affixCount: 3, hasMechanic: true },
    mythic: { name: '神话', color: '#f33', weight: 1, affixCount: 4, hasMechanic: true },
};

export const WEAPONS: WeaponModule[] = [
    { id: 'w1', name: '基础发射器', icon: '🔫', type: 'weapon', quality: 'common', atk: 20, scatterAngle: 5, fireInterval: 0.16, desc: '矿工标配发射器，可靠但平庸。' },
    { id: 'w2', name: '精准发射器', icon: '🔫', type: 'weapon', quality: 'rare', atk: 35, scatterAngle: 2, fireInterval: 0.14, desc: '经过校准的发射器，精度更高。' },
    { id: 'w3', name: '重型轰击炮', icon: '🔫', type: 'weapon', quality: 'epic', atk: 58, scatterAngle: 10, fireInterval: 0.20, desc: '牺牲精度换取毁灭性火力。' },
    { id: 'w4', name: '相位裂解器', icon: '🔫', type: 'weapon', quality: 'legend', atk: 85, scatterAngle: 3, fireInterval: 0.12, desc: '传说中的武器，据说是从外星遗迹中回收的。', mechanic: '弹珠穿透' },
    { id: 'w5', name: '创世之光', icon: '🔫', type: 'weapon', quality: 'mythic', atk: 120, scatterAngle: 0, fireInterval: 0.10, desc: '神话级武器，只有最幸运的矿工才见过。', mechanic: '散射角度归零' },
];

export const BALLS: BallModule[] = [
    { id: 'b1', name: '铁弹珠', icon: '⚪', type: 'ball', quality: 'common', magazine: 5, dmgMult: 1.0, durability: 5, desc: '普通的铁质弹珠，没什么特别的。' },
    { id: 'b2', name: '钨钢弹珠', icon: '⚪', type: 'ball', quality: 'rare', magazine: 6, dmgMult: 1.3, durability: 6, desc: '密度更高的弹珠，穿透力更强。' },
    { id: 'b3', name: 'EMP弹珠', icon: '⚪', type: 'ball', quality: 'epic', magazine: 5, dmgMult: 1.5, durability: 7, desc: '命中时释放电磁脉冲，瘫痪敌人。' },
    { id: 'b4', name: '奇点弹珠', icon: '⚪', type: 'ball', quality: 'legend', magazine: 7, dmgMult: 1.8, durability: 8, desc: '微型奇点，弹射时会分裂复制。', mechanic: '弹珠复制' },
    { id: 'b5', name: '虚空之核', icon: '⚪', type: 'ball', quality: 'mythic', magazine: 8, dmgMult: 2.5, durability: 10, desc: '来自虚空的弹珠，命中即爆炸。', mechanic: '命中爆炸' },
];

export const STORAGES: StorageModule[] = [
    { id: 's1', name: '基础货舱', icon: '📦', type: 'storage', quality: 'common', extraSlots: 2, desc: '扩展了货舱空间，能多带两件东西。' },
    { id: 's2', name: '中型货舱', icon: '📦', type: 'storage', quality: 'rare', extraSlots: 4, desc: '更大的货舱，不必频繁丢弃战利品。' },
    { id: 's3', name: '大型货舱', icon: '📦', type: 'storage', quality: 'epic', extraSlots: 6, desc: '宽敞的货舱，一趟能带回不少东西。' },
    { id: 's4', name: '引力货舱', icon: '📦', type: 'storage', quality: 'legend', extraSlots: 8, desc: '利用引力场收纳物品，战利品自动飞入。', mechanic: '自动吸取' },
    { id: 's5', name: '次元货舱', icon: '📦', type: 'storage', quality: 'mythic', extraSlots: 12, desc: '折叠空间技术，几乎装不满。', mechanic: '掉落率翻倍' },
];

export const ACCESSORY_POOL: AccessoryModule[] = [
    { id: 'acc_combo', name: '连击计数器', icon: '💍', type: 'accessory', quality: 'legend', mechanic: '连击倍率', desc: '记录连续命中次数，连击越高伤害越大。' },
    { id: 'acc_vampire', name: '吸血鬼之牙', icon: '💍', type: 'accessory', quality: 'legend', mechanic: '吸血', desc: '将伤害的一部分转化为生命恢复。' },
    { id: 'acc_shield', name: '护盾击穿器', icon: '💍', type: 'accessory', quality: 'legend', mechanic: '护盾击穿', desc: '无视敌人的护盾，直接造成伤害。' },
    { id: 'acc_execute', name: '处决者徽章', icon: '💍', type: 'accessory', quality: 'legend', mechanic: '斩杀', desc: '对低血量敌人造成巨额额外伤害。' },
    { id: 'acc_reverse', name: '混沌棱镜', icon: '💍', type: 'accessory', quality: 'legend', mechanic: '弹射角度反转', desc: '弹射角度不再遵循物理法则。' },
    { id: 'acc_fuel', name: '燃料回收器', icon: '💍', type: 'accessory', quality: 'legend', mechanic: '燃料回收', desc: '击败敌人时回收少量燃料。' },
    { id: 'acc_infinite', name: '永动核心', icon: '💍', type: 'accessory', quality: 'mythic', mechanic: '无限燃料', desc: '极大降低燃料消耗速率。' },
];

export const AFFIX_POOL: AffixDef[] = [
    { id: 'af1', name: '攻击力 +{v}', min: 3, max: 15, step: 1, format: '{v}' },
    { id: 'af2', name: '攻击力 +{v}%', min: 5, max: 30, step: 5, format: '{v}%' },
    { id: 'af3', name: '弹珠耐久 +{v}', min: 1, max: 5, step: 1, format: '{v}' },
    { id: 'af4', name: '弹珠速度 +{v}%', min: 5, max: 25, step: 5, format: '{v}%' },
    { id: 'af5', name: '弹仓上限 +{v}', min: 1, max: 3, step: 1, format: '{v}' },
    { id: 'af6', name: '掉落率 +{v}%', min: 5, max: 20, step: 5, format: '{v}%' },
    { id: 'af7', name: '燃料消耗 -{v}%', min: 5, max: 20, step: 5, format: '{v}%' },
    { id: 'af8', name: 'HP上限 +{v}', min: 5, max: 25, step: 5, format: '{v}' },
    { id: 'af9', name: '散射角度 -{v}%', min: 10, max: 40, step: 10, format: '{v}%' },
    { id: 'af10', name: '射速 +{v}%', min: 5, max: 20, step: 5, format: '{v}%' },
];
