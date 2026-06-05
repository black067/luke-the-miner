/* Barrel re-export — game data split by domain */
import { QUALITY, WEAPONS, BALLS, STORAGES, ACCESSORY_POOL, AFFIX_POOL } from './data/modules.js';
import { ITEMS, MATERIALS, ORES } from './data/consumables.js';
import { BUFFS, MECHANICS } from './data/buffs-mechanics.js';
import { UPGRADES } from './data/upgrades.js';
import { ENEMIES, WAVES, COMBAT } from './data/combat-data.js';
import { AREAS, MAILS } from './data/world.js';
import { SHOP_ITEMS, UG_SHOP_ITEMS, UG_ORDERS } from './data/shop.js';
import type { GameData } from './types.js';

export const DATA: GameData = {
  QUALITY, WEAPONS, BALLS, STORAGES, ACCESSORY_POOL, AFFIX_POOL,
  ITEMS, MATERIALS, ORES,
  BUFFS, MECHANICS,
  UPGRADES,
  ENEMIES, WAVES, COMBAT,
  AREAS, MAILS,
  SHOP_ITEMS, UG_SHOP_ITEMS, UG_ORDERS,
};

