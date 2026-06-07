/* ============================================================
   COMBAT-SYSTEMS.TS — Entity creation, wave, fire, buff, fuel,
   cargo, hit processing, and quick bar item use.
   All functions operate on the mutable C state.
   ============================================================ */

import { DATA } from './data.js';
import { GS, getBallProps, getScatterAngle, getShipMaxFuel, getCargoSize, getWeaponAtk, getShipMaxHP, hasMechanic, hasSpecialAbility } from './state.js';
import { SFX } from './audio.js';
import { showToast } from './screens.js';
import { C, CombatCargo, COMBAT, WALL } from './combat-state.js';
import { norm, rand, randInt, dist } from './combat-math.js';
import { combatToast } from './combat-ui.js';
import type { Pinball, CombatEnemy, EnemyDef, WarehouseItem } from './types.js';

// ============================================================
// ENTITY CREATION
// ============================================================

export function getGunPos(): { x: number; y: number } {
    const s = C.ship, off = COMBAT.SHIP_H / 2 + 2;
    return { x: s.x + off * Math.sin(s.angle), y: COMBAT.SHIP_Y - off * Math.cos(s.angle) };
}

export function createPinball(fromX: number, fromY: number, dirX: number, dirY: number): Pinball {
    const n = norm(dirX, dirY);
    const ball = getBallProps();
    return {
        x: fromX, y: fromY,
        vx: n.x * COMBAT.PB_SPEED, vy: n.y * COMBAT.PB_SPEED,
        durability: ball.durability,
        speedMult: 1.0,
    };
}

export function createEnemy(x: number, y: number, def: EnemyDef): CombatEnemy {
    const w = def.w || COMBAT.ENEMY_W, h = def.h || COMBAT.ENEMY_H;
    const speedVar = rand(0.7, 1.3);
    return {
        x, y,
        vx: rand(-8, 8),
        vy: (def.speed || 50) * speedVar,
        hp: def.hp, maxHp: def.hp,
        w, h,
        def: def,
        isBoss: def.mechanic === 'boss',
        behavior: def.behavior || 'hover',
        mechanic: def.mechanic || null,
        shieldCount: def.mechanic === 'shield' ? 3 : 0,
        splitChildren: false,
        laserTimer: def.mechanic === 'laser' ? 2.0 : 0,
        laserWarning: 0,
        laserDir: { x: 0, y: 0 },
        phase: rand(0, Math.PI * 2),
        flashTimer: 0,
    };
}

export function spawnParticle(x: number, y: number, count: number, color: string, speed: number): void {
    for (let i = 0; i < count; i++) {
        const angle = rand(0, Math.PI * 2), spd = rand(speed * 0.4, speed);
        C.particles.push({
            x, y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            life: rand(0.2, 0.5),
            maxLife: 0.5,
            color,
            size: rand(1, 3),
        });
    }
}

export function spawnDmgNumber(x: number, y: number, text: string, color?: string): void {
    C.dmgNumbers.push({ x, y, text, life: 0.7, color: color || null });
}

// ============================================================
// WAVE SYSTEM
// ============================================================

export function startWave(): void {
    const wdef = DATA.WAVES[C.wave.index];
    C.wave.name = wdef.name;
    C.wave.spawnQueue = [];
    C.wave.allSpawned = false;
    C.wave.bossSpawned = false;
    for (const group of wdef.enemies) {
        const enemyDef = Object.values(DATA.ENEMIES).find(e => e.id === group.type);
        if (!enemyDef) continue;
        for (let i = 0; i < group.count; i++) {
            C.wave.spawnQueue.push({
                type: group.type,
                def: enemyDef,
                interval: group.interval * (0.7 + Math.random() * 0.6),
            });
        }
    }
    C.wave.spawnQueue.sort(() => Math.random() - 0.5);
    C.wave.spawnTimer = C.wave.spawnQueue.length > 0 ? C.wave.spawnQueue[0].interval * 0.5 : 99;
}

export function spawnNextEnemy(): void {
    if (C.wave.spawnQueue.length === 0) {
        C.wave.allSpawned = true;
        return;
    }
    const entry = C.wave.spawnQueue.shift();
    if (!entry) return;
    const def = entry.def;
    const w = def.w || COMBAT.ENEMY_W, h = def.h || COMBAT.ENEMY_H;
    const spawnX = rand(WALL.left + w / 2, WALL.right - w / 2);
    const spawnY = WALL.top - h;
    const enemy = createEnemy(spawnX, spawnY, def);
    if (def.mechanic === 'boss') {
        C.wave.bossSpawned = true;
        enemy.isBoss = true;
        enemy.hp = def.hp;
        enemy.maxHp = def.hp;
        combatToast('⚠ BOSS 出现！', 2.0);
        C.shakeTimer = 0.3;
    }
    C.enemies.push(enemy);
    if (C.wave.spawnQueue.length > 0) {
        C.wave.spawnTimer = C.wave.spawnQueue[0].interval;
    } else {
        C.wave.allSpawned = true;
    }
}

// ============================================================
// FIRE & AMMO
// ============================================================

export function firePinball(): void {
    if (C.ammo <= 0) return;
    const gun = getGunPos();
    let dirX = C.mouse.x - gun.x;
    let dirY = C.mouse.y - gun.y;
    if (Math.hypot(dirX, dirY) < 8) return;
    const scatterAngle = getScatterAngle();
    if (scatterAngle > 0) {
        const baseAngle = Math.atan2(dirY, dirX);
        const scatterRad = rand(-scatterAngle / 2, scatterAngle / 2) * Math.PI / 180;
        const newAngle = baseAngle + scatterRad;
        const dist = Math.hypot(dirX, dirY);
        dirX = Math.cos(newAngle) * dist;
        dirY = Math.sin(newAngle) * dist;
    }
    C.pinballs.push(createPinball(gun.x, gun.y, dirX, dirY));
    C.ammo--;
    C.stats.shots++;
    SFX.play('shoot');
}

// ============================================================
// BUFF SYSTEM
// ============================================================

export function applyBuff(buffId: string, value: number): void {
    const def = DATA.BUFFS[buffId];
    if (!def) return;
    const existingIdx = C.buffs.findIndex(b => b.id === buffId);
    if (existingIdx >= 0) {
        const existing = C.buffs[existingIdx];
        if (def.stackMode === 'longest') {
            if (value > existing.timer) existing.timer = value;
            return;
        } else if (def.stackMode === 'strongest') {
            if (value > existing.timer) {
                existing.timer = value;
                existing.value = value;
            }
            return;
        }
    }
    C.buffs.push({ id: buffId, timer: def.duration, value: value || def.duration });
}

export function getBuffBonus(): number {
    let bonus = 0;
    for (const b of C.buffs) {
        if (b.id === 'dmgUp') bonus += 0.3;
    }
    return bonus;
}

// ============================================================
// FUEL DROP
// ============================================================

export function getFuelDropChance(): number {
    const fuel = C.ship.fuel;
    const maxFuel = getShipMaxFuel();
    const fuelPct = fuel / maxFuel * 100;
    if (fuelPct >= COMBAT.FUEL_DROP_THRESHOLD) return 0;
    if (fuelPct <= COMBAT.FUEL_DROP_FLOOR) return 1;
    return COMBAT.FUEL_DROP_CHANCE_BASIC *
        ((COMBAT.FUEL_DROP_THRESHOLD - fuelPct) / (COMBAT.FUEL_DROP_THRESHOLD - COMBAT.FUEL_DROP_FLOOR));
}

// ============================================================
// CARGO DROP
// ============================================================

export function tryDropLoot(enemyX: number, enemyY: number, _enemyDef: EnemyDef): void {
    const maxCargo = getCargoSize();
    if (CombatCargo.length >= maxCargo) return;
    const roll = Math.random();
    let dropItem: WarehouseItem | null = null;
    if (roll < 0.3) {
        const ores = DATA.ORES;
        const oreIdx = roll < 0.05 ? 3 : (roll < 0.12 ? 2 : (roll < 0.2 ? 1 : 0));
        const ore = ores[oreIdx];
        dropItem = { id: ore.id, name: ore.name, icon: ore.icon, type: 'ore', quality: 'common', qty: 1, priceBtc: ore.price, desc: '' } as WarehouseItem;
        C.stats.oreValue += ore.price;
        C.stats.resourceCollected += 1;
    } else if (roll < 0.45) {
        const mats = DATA.MATERIALS.filter(m => m.quality === 'common' || m.quality === 'rare');
        const mat = mats[randInt(0, mats.length - 1)];
        if (mat) dropItem = { id: mat.id, name: mat.name, icon: mat.icon, type: 'material', quality: mat.quality, qty: 1, priceBtc: mat.priceBtc, desc: '' } as WarehouseItem;
    } else if (roll < 0.48) {
        dropItem = generateRandomModule();
    } else if (roll < 0.5) {
        dropItem = { id: 'cash_bundle', name: '钞票捆', icon: '💵', type: 'cash', quality: 'common', qty: 1, priceBtc: 0, desc: '', cashValue: randInt(50, 200) } as WarehouseItem;
    }
    if (dropItem) {
        CombatCargo.push(dropItem);
        spawnDmgNumber(enemyX, enemyY - 10, dropItem.icon, '#ffcc00');
    }
}

export function generateRandomModule(): WarehouseItem | null {
    const roll = Math.random() * 100;
    let quality = 'common';
    let cumulative = 0;
    for (const [q, def] of Object.entries(DATA.QUALITY)) {
        cumulative += def.weight;
        if (roll <= cumulative) { quality = q; break; }
    }
    const types = ['weapon', 'ball', 'storage', 'accessory'] as const;
    const type = types[randInt(0, 3)];
    let baseModule;
    if (type === 'weapon') baseModule = DATA.WEAPONS[randInt(0, DATA.WEAPONS.length - 1)];
    else if (type === 'ball') baseModule = DATA.BALLS[randInt(0, DATA.BALLS.length - 1)];
    else if (type === 'storage') baseModule = DATA.STORAGES[randInt(0, DATA.STORAGES.length - 1)];
    else baseModule = DATA.ACCESSORY_POOL[randInt(0, DATA.ACCESSORY_POOL.length - 1)];
    if (!baseModule) return null;
    const result: Record<string, unknown> = {
        id: baseModule.id + '_' + Date.now() + '_' + randInt(0, 9999),
        name: baseModule.name,
        icon: baseModule.icon,
        type: type,
        quality: quality,
        desc: baseModule.desc || '',
        qty: 1,
        priceBtc: baseModule.priceBtc || 50,
    };
    const qualityMult = ({ common: 0.6, rare: 0.8, epic: 1.0, legend: 1.3, mythic: 1.8 } as Record<string, number>)[quality] || 1.0;
    if (baseModule.atk !== undefined) result.atk = Math.round(baseModule.atk * qualityMult);
    if (baseModule.magazine !== undefined) result.magazine = Math.max(3, Math.round((baseModule.magazine || 5) * qualityMult));
    if (baseModule.dmgMult !== undefined) result.dmgMult = Math.round(baseModule.dmgMult * qualityMult * 10) / 10;
    if (baseModule.durability !== undefined) result.durability = Math.max(2, Math.round((baseModule.durability || 5) * qualityMult));
    if (baseModule.extraSlots !== undefined) result.extraSlots = Math.max(1, Math.round((baseModule.extraSlots || 2) * qualityMult));
    if (baseModule.scatterAngle !== undefined) result.scatterAngle = baseModule.scatterAngle;
    if (baseModule.fireInterval !== undefined) result.fireInterval = baseModule.fireInterval;
    const qualDef = DATA.QUALITY[quality as keyof typeof DATA.QUALITY];
    if (qualDef && qualDef.hasMechanic && baseModule.mechanic) {
        result.mechanic = baseModule.mechanic;
    }
    return result as WarehouseItem;
}

// ============================================================
// HIT PROCESSING
// ============================================================

export function processHitEnemy(pb: Pinball, enemy: CombatEnemy, idx: number): void {
    // Shield mechanic
    if (enemy.mechanic === 'shield' && enemy.shieldCount! > 0) {
        if (!hasMechanic('shieldPierce')) {
            enemy.shieldCount!--;
            spawnDmgNumber(pb.x, pb.y, '🛡️', '#888');
            SFX.play('hit');
            const sdx = pb.x - enemy.x, sdy = pb.y - enemy.y, sdl = Math.hypot(sdx, sdy) || 1;
            const sdot = pb.vx * (sdx / sdl) + pb.vy * (sdy / sdl);
            pb.vx -= 2 * sdot * (sdx / sdl);
            pb.vy -= 2 * sdot * (sdy / sdl);
            return;
        }
    }
    // Damage calculation
    const weaponAtk = getWeaponAtk();
    const ballDmgMult = getBallProps().dmgMult;
    const buffBonus = getBuffBonus();
    const comboBonus = getComboBonus();
    const dmg = 1;
    const displayDmg = Math.round(weaponAtk * ballDmgMult * (1 + buffBonus + comboBonus));
    enemy.hp -= dmg;
    enemy.flashTimer = 0.12;
    C.stats.hits++;
    spawnDmgNumber(pb.x, pb.y, displayDmg.toString());
    // Combo system
    if (C.comboActive) {
        C.comboCount++;
        C.comboTimer = COMBAT.COMBO_TIMEOUT;
    }
    // Bounce
    const dx = pb.x - enemy.x, dy = pb.y - enemy.y, dl = Math.hypot(dx, dy) || 1;
    const unx = dx / dl, uny = dy / dl;
    const dot = pb.vx * unx + pb.vy * uny;
    pb.vx -= 2 * dot * unx;
    pb.vy -= 2 * dot * uny;
    SFX.play('hit');
    C.shakeTimer = 0.08;
    // Fuel block drop
    const solidBlocks = C.fuelBlocks.filter(fb => fb.state === 'solid').length;
    if (solidBlocks < COMBAT.FUEL_MAX_BLOCKS && Math.random() < getFuelDropChance()) {
        C.fuelBlocks.push({
            x: enemy.x, y: enemy.y,
            vx: rand(-15, 15), vy: rand(35, 55),
            state: 'solid',
        });
    }
    // On enemy death
    if (enemy.hp <= 0) {
        if (enemy.isBoss) {
            for (const other of C.enemies) {
                if (other !== enemy) {
                    spawnParticle(other.x, other.y, 8, '#ff4444', 100);
                    C.stats.killed++;
                    tryDropLoot(other.x, other.y, other.def);
                }
            }
            C.enemies.length = 0;
            C.wave.spawnQueue.length = 0;
            C.wave.allSpawned = true;
            spawnParticle(enemy.x, enemy.y, 16, '#ffffff', 160);
            spawnParticle(enemy.x, enemy.y, 24, '#ff4444', 130);
            C.stats.killed++;
            tryDropLoot(enemy.x, enemy.y, enemy.def);
            SFX.play('bossKill');
        } else {
            // Split mechanic
            if (enemy.mechanic === 'split' && !enemy.splitChildren) {
                for (let s = 0; s < randInt(2, 3); s++) {
                    const child = createEnemy(
                        enemy.x + rand(-15, 15), enemy.y + rand(-10, 10),
                        {
                            ...enemy.def,
                            hp: Math.max(1, Math.floor(enemy.maxHp / 3)),
                            mechanic: undefined,
                            w: enemy.w * 0.7,
                            h: enemy.h * 0.7,
                        }
                    );
                    child.splitChildren = true;
                    C.enemies.push(child);
                }
            }
            // Explode mechanic
            if (enemy.mechanic === 'explode') {
                for (const other of C.enemies) {
                    if (other !== enemy && dist(other, enemy) < 60) {
                        other.hp -= 1;
                        if (other.hp <= 0) {
                            spawnParticle(other.x, other.y, 6, '#ffaa00', 80);
                            C.stats.killed++;
                            tryDropLoot(other.x, other.y, other.def);
                            C.enemies.splice(C.enemies.indexOf(other), 1);
                        }
                    }
                }
                spawnParticle(enemy.x, enemy.y, 12, '#ff6600', 100);
            }
            spawnParticle(enemy.x, enemy.y, 6, '#ffffff', 120);
            spawnParticle(enemy.x, enemy.y, 10, '#ffaa00', 90);
            C.enemies.splice(idx, 1);
            C.stats.killed++;
            tryDropLoot(enemy.x, enemy.y, enemy.def);
            SFX.play('kill');
            // Fuel reclaim mechanic
            if (hasMechanic('fuelReclaim') || hasSpecialAbility('fuelReclaim')) {
                C.ship.fuel = Math.min(getShipMaxFuel(), C.ship.fuel + 3);
            }
        }
    }
}

export function getComboBonus(): number {
    if (!C.comboActive || C.comboCount < COMBAT.COMBO_THRESHOLDS[1]) return 0;
    for (let i = COMBAT.COMBO_THRESHOLDS.length - 1; i >= 0; i--) {
        if (C.comboCount >= COMBAT.COMBO_THRESHOLDS[i]) return COMBAT.COMBO_MULTIPLIERS[i] - 1;
    }
    return 0;
}

// ============================================================
// QUICK BAR ITEM USE
// ============================================================

export function useQuickSlot(idx: number): void {
    if (idx < 0 || idx >= GS.quickBar.length) return;
    const slot = GS.quickBar[idx];
    if (!slot.itemId || slot.qty <= 0) {
        showToast('道具已用完');
        return;
    }
    const itemDef = DATA.ITEMS.find(it => it.id === slot.itemId);
    if (!itemDef) return;
    if (itemDef.effect === 'heal') {
        const maxHp = getShipMaxHP();
        const healVal = itemDef.value || 0;
        C.ship.hp = Math.min(maxHp, C.ship.hp + Math.round(maxHp * healVal));
        spawnDmgNumber(C.ship.x, COMBAT.SHIP_Y - 20, '+' + Math.round(maxHp * healVal), '#44ff44');
    } else if (itemDef.effect === 'refuel') {
        const maxFuel = getShipMaxFuel();
        const refuelVal = itemDef.value || 0;
        C.ship.fuel = Math.min(maxFuel, C.ship.fuel + maxFuel * refuelVal);
        spawnDmgNumber(C.ship.x, COMBAT.SHIP_Y - 20, '+FUEL', '#44ff44');
    } else if (itemDef.effect === 'buff' && itemDef.buffId) {
        applyBuff(itemDef.buffId, 0);
    }
    slot.qty--;
    if (slot.qty <= 0) {
        showToast(`${itemDef.name} 已用完`);
    }
}
