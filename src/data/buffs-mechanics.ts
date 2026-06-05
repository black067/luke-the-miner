/* ============================================================
   DATA/BUFFS-MECHANICS.TS — BUFFS, MECHANICS
   ============================================================ */

import type { BuffDef, MechanicDef } from '../types.js';

export const BUFFS: Record<string, BuffDef> = {
    invincible: { name: '无敌', icon: '🛡️', duration: 8, stackMode: 'longest', desc: '不受碰撞伤害' },
    penetrate: { name: '弹珠穿透', icon: '💥', duration: 15, stackMode: 'longest', desc: '弹珠命中敌人不消耗耐久' },
    autoCollect: { name: '自动吸取', icon: '🧲', duration: 20, stackMode: 'longest', desc: '战利品自动飞向飞船' },
    dmgUp: { name: '伤害提升', icon: '⬆️', duration: 15, stackMode: 'strongest', desc: '伤害 +30%' },
    speedUp: { name: '速度提升', icon: '🚀', duration: 12, stackMode: 'longest', desc: '移动速度 +25%' },
    burn: { name: '燃烧', icon: '🔥', duration: 10, stackMode: 'coexist', desc: '每秒损失少量HP' },
};

export const MECHANICS: Record<string, MechanicDef> = {
    penetrate: { name: '弹珠穿透', desc: '弹珠命中敌人后不消耗耐久，继续飞行', allowedSlots: ['weapon', 'ball', 'accessory'] },
    explosion: { name: '命中爆炸', desc: '弹珠命中敌人时触发范围伤害', allowedSlots: ['weapon', 'ball', 'accessory'] },
    replicate: { name: '弹珠复制', desc: '弹射时概率生成一颗新弹珠射向随机角度', allowedSlots: ['ball', 'accessory'] },
    reverse: { name: '弹射角度反转', desc: '弹射角度不再遵循物理反射', allowedSlots: ['ball', 'accessory'] },
    vampire: { name: '吸血', desc: '弹珠造成伤害的一定比例转化为HP恢复', allowedSlots: ['weapon', 'accessory'] },
    execute: { name: '斩杀', desc: '对HP低于30%的敌人造成双倍伤害', allowedSlots: ['weapon', 'accessory'] },
    shieldPierce: { name: '护盾击穿', desc: '对有护盾的敌人无视护盾直接造成伤害', allowedSlots: ['weapon', 'ball', 'accessory'] },
    comboMultiplier: { name: '连击倍率', desc: '连续命中累积连击计数，计数越高伤害倍率越大', allowedSlots: ['accessory'] },
    zeroScatter: { name: '散射角度归零', desc: '消除武器散射，每发精准命中瞄准方向', allowedSlots: ['weapon'] },
    fuelReclaim: { name: '燃料回收', desc: '击败敌人时恢复少量燃料', allowedSlots: ['storage', 'accessory'] },
    infiniteFuel: { name: '无限燃料', desc: '战斗全程燃料消耗极大降低', allowedSlots: ['storage', 'accessory'] },
    doubleDrop: { name: '掉落率翻倍', desc: '击败敌人的战利品掉落概率大幅提升', allowedSlots: ['storage', 'accessory'] },
    autoCollect: { name: '自动吸取', desc: '战利品掉落瞬间自动飞向飞船', allowedSlots: ['storage', 'accessory'] },
};
