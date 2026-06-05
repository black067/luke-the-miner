/* ============================================================
   DATA/SHOP.TS — SHOP_ITEMS, UG_SHOP_ITEMS, UG_ORDERS
   ============================================================ */

import type { ShopRef, UgOrder } from '../types.js';

export const SHOP_ITEMS: ShopRef[] = [
    { ref: 'w2', type: 'weapon' },
    { ref: 'b2', type: 'ball' },
    { ref: 'b3', type: 'ball' },
    { ref: 's2', type: 'storage' },
    { ref: 'item_repair', type: 'item' },
    { ref: 'item_fuelcan', type: 'item' },
    { ref: 'item_penetrate', type: 'item' },
    { ref: 'item_autocollect', type: 'item' },
    { ref: 'mat_titanium', type: 'material' },
    { ref: 'mat_nozzle', type: 'material' },
    { ref: 'mat_battery', type: 'material' },
    { ref: 'mat_helium', type: 'material' },
    { ref: 'mat_ceramic', type: 'material' },
    { ref: 'mat_quantum', type: 'material' },
];

export const UG_SHOP_ITEMS: ShopRef[] = [
    { ref: 'w4', type: 'weapon' },
    { ref: 'b4', type: 'ball' },
    { ref: 's4', type: 'storage' },
    { ref: 'acc_combo', type: 'accessory' },
    { ref: 'acc_vampire', type: 'accessory' },
    { ref: 'acc_shield', type: 'accessory' },
    { ref: 'item_nanofix', type: 'item' },
    { ref: 'item_shieldgen', type: 'item' },
    { ref: 'mat_starchart', type: 'material' },
    { ref: 'mat_darkmatter', type: 'material' },
];

export const UG_ORDERS: UgOrder[] = [
    { id: 'o1', want: '钛合金板', wantMatId: 'mat_titanium', wantQty: 5, rewardCash: 300, desc: '「最近矿场查得严，钛板不好搞……你有多的吗？」' },
    { id: 'o2', want: '陶瓷装甲板', wantMatId: 'mat_ceramic', wantQty: 4, rewardCash: 500, desc: '「这批装甲板急用，加价收。」' },
    { id: 'o3', want: '能量电池', wantMatId: 'mat_battery', wantQty: 6, rewardCash: 400, desc: '「能源站被查了，电池缺口很大。」' },
    { id: 'o4', want: '修复套件', wantMatId: 'item_repair', wantQty: 3, rewardCash: 250, desc: '「几个新来的愣头青老是受伤，需要一批修复包。」' },
    { id: 'o5', want: '燃料罐', wantMatId: 'item_fuelcan', wantQty: 4, rewardCash: 350, desc: '「远航燃料不够了，有多少收多少。」' },
    { id: 'o6', want: '推进器喷嘴', wantMatId: 'mat_nozzle', wantQty: 3, rewardCash: 200, desc: '「改装船缺喷嘴，品质无所谓。」' },
];
