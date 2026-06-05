/* ============================================================
   COMBAT-UPDATE.TS — Per-frame update functions for all entities
   and the main update loop.
   ============================================================ */

import { DATA } from './data.js';
import { getBallProps, getShipMaxFuel, getShipMaxHP, getShipSpeedMult, getFireInterval, hasMechanic, hasSpecialAbility } from './state.js';
import { SFX } from './audio.js';
import { C, COMBAT, VH, WALL } from './combat-state.js';
import { norm, rand, clamp, dist, rayRectHit, reflectOnEdge, rayCircleHit } from './combat-math.js';
import {
    getGunPos, createPinball, processHitEnemy, tryDropLoot,
    spawnParticle, spawnDmgNumber, firePinball, startWave, spawnNextEnemy,
} from './combat-systems.js';
import type { Pinball } from './types.js';

// ============================================================
// UPDATE FUNCTIONS
// ============================================================

export function updateShip(dt: number): void {
    const s = C.ship;
    const speedMult = getShipSpeedMult();
    const prevX = s.x;
    if (C.keys['a'] || C.keys['A'] || C.keys['ArrowLeft'])
        s.x -= COMBAT.SHIP_SPEED * speedMult * dt;
    if (C.keys['d'] || C.keys['D'] || C.keys['ArrowRight'])
        s.x += COMBAT.SHIP_SPEED * speedMult * dt;
    s.x = clamp(s.x, WALL.left + COMBAT.SHIP_W / 2, WALL.right - COMBAT.SHIP_W / 2);
    // Angle toward mouse
    const gun = getGunPos();
    const dirX = C.mouse.x - gun.x, dirY = C.mouse.y - gun.y;
    if (Math.hypot(dirX, dirY) > 8)
        s.angle = Math.atan2(dirY, dirX) + Math.PI / 2;
    const moved = Math.abs(s.x - prevX);
    // Fuel drain (check infinite fuel mechanic)
    const fuelDrainMult = hasMechanic('infiniteFuel') || hasSpecialAbility('infiniteFuel') ? 0.1 : 1.0;
    s.fuel = Math.max(0, s.fuel - (COMBAT.FUEL_DRAIN * dt + moved * COMBAT.FUEL_MOVE_DRAIN) * fuelDrainMult);
    // Auto regen
    if (hasSpecialAbility('autoRegen') && s.invincibleTimer <= 0) {
        s.hp = Math.min(getShipMaxHP(), s.hp + 0.03 * dt);
    }
    if (s.invincibleTimer > 0)
        s.invincibleTimer = Math.max(0, s.invincibleTimer - dt);
}

export function updatePinballs(dt: number): void {
    const toRemove: Pinball[] = [];
    for (const pb of C.pinballs) {
        pb.x += pb.vx * dt;
        pb.y += pb.vy * dt;
        let bounced = false;
        // Wall collisions
        if (pb.x - COMBAT.PB_RADIUS < WALL.left) {
            pb.x = WALL.left + COMBAT.PB_RADIUS; pb.vx = Math.abs(pb.vx); bounced = true;
        }
        if (pb.x + COMBAT.PB_RADIUS > WALL.right) {
            pb.x = WALL.right - COMBAT.PB_RADIUS; pb.vx = -Math.abs(pb.vx); bounced = true;
        }
        if (pb.y - COMBAT.PB_RADIUS < WALL.top) {
            pb.y = WALL.top + COMBAT.PB_RADIUS; pb.vy = Math.abs(pb.vy); bounced = true;
        }
        if (pb.y + COMBAT.PB_RADIUS > WALL.bottom) {
            pb.y = WALL.bottom - COMBAT.PB_RADIUS; pb.vy = -Math.abs(pb.vy); bounced = true;
        }
        // Enemy collisions
        for (let i = C.enemies.length - 1; i >= 0; i--) {
            const e = C.enemies[i];
            if (dist(pb, e) < COMBAT.PB_RADIUS + Math.min(e.w / 2, e.h / 2)) {
                if (!hasMechanic('penetrate')) {
                    processHitEnemy(pb, e, i);
                    bounced = true;
                } else {
                    // Penetrate: damage without bounce
                    const dmg = 1;
                    e.hp -= dmg;
                    C.stats.hits++;
                    spawnDmgNumber(pb.x, pb.y, Math.round(getBallProps().dmgMult * 1).toString()); // simplified display
                    if (C.comboActive) {
                        C.comboCount++;
                        C.comboTimer = COMBAT.COMBO_TIMEOUT;
                    }
                    if (e.hp <= 0) {
                        if (e.isBoss) {
                            for (const other of C.enemies) {
                                if (other !== e) {
                                    spawnParticle(other.x, other.y, 8, '#ff4444', 100);
                                    C.stats.killed++;
                                    tryDropLoot(other.x, other.y, other.def);
                                }
                            }
                            C.enemies.length = 0;
                            C.wave.spawnQueue.length = 0;
                            C.wave.allSpawned = true;
                            spawnParticle(e.x, e.y, 16, '#ffffff', 160);
                            C.stats.killed++;
                            tryDropLoot(e.x, e.y, e.def);
                            SFX.play('bossKill');
                        } else {
                            spawnParticle(e.x, e.y, 6, '#ffffff', 120);
                            C.enemies.splice(i, 1);
                            C.stats.killed++;
                            tryDropLoot(e.x, e.y, e.def);
                            SFX.play('kill');
                        }
                    }
                }
                break;
            }
        }
        // Fuel block collisions
        if (!bounced) {
            for (const fb of C.fuelBlocks) {
                if (fb.state !== 'solid') continue;
                if (dist(pb, fb) < COMBAT.PB_RADIUS + COMBAT.FUEL_BLOCK_RADIUS) {
                    const fdx = pb.x - fb.x, fdy = pb.y - fb.y, fdl = Math.hypot(fdx, fdy) || 1;
                    const fdot = pb.vx * (fdx / fdl) + pb.vy * (fdy / fdl);
                    pb.vx -= 2 * fdot * (fdx / fdl);
                    pb.vy -= 2 * fdot * (fdy / fdl);
                    fb.state = 'ghost';
                    bounced = true;
                    break;
                }
            }
        }
        if (bounced) {
            if (!hasMechanic('penetrate')) {
                pb.durability--;
            }
            if (pb.durability! <= 0) {
                spawnParticle(pb.x, pb.y, 4, '#88ccff', 50);
                toRemove.push(pb);
            } else {
                pb.speedMult = Math.min(pb.speedMult * COMBAT.PB_SPEED_MULT, COMBAT.PB_SPEED_CAP);
                const curSpd = Math.hypot(pb.vx, pb.vy);
                if (curSpd > 0) {
                    const target = COMBAT.PB_SPEED * pb.speedMult;
                    const scale = target / curSpd;
                    pb.vx *= scale; pb.vy *= scale;
                    pb.vx += rand(-15, 15); pb.vy += rand(-15, 15);
                }
                // Replicate mechanic
                if (hasMechanic('replicate') && Math.random() < 0.15) {
                    const rep = createPinball(pb.x, pb.y, rand(-1, 1), rand(-1, 1));
                    rep.speedMult = pb.speedMult;
                    C.pinballs.push(rep);
                    spawnDmgNumber(pb.x, pb.y, '×2', '#aaf');
                }
            }
        }
    }
    for (const pb of toRemove) {
        const idx = C.pinballs.indexOf(pb);
        if (idx >= 0) C.pinballs.splice(idx, 1);
        C.ammo = Math.min(getBallProps().magazine, C.ammo + 1);
    }
}

export function updateEnemies(dt: number): void {
    const s = C.ship;
    for (let i = C.enemies.length - 1; i >= 0; i--) {
        const e = C.enemies[i];
        const hw = e.w / 2, hh = e.h / 2;
        switch (e.behavior) {
            case 'static': break;
            case 'hover':
                e.phase! += dt * 2;
                e.x += Math.sin(e.phase!) * 30 * dt;
                e.y += (e.vy || 50) * 0.5 * dt;
                break;
            case 'zigzag':
                e.phase! += dt * 4;
                e.x += Math.sin(e.phase!) * 60 * dt;
                e.y += (e.vy || 50) * dt;
                break;
            case 'dive':
                e.y += (e.vy || 50) * 1.5 * dt;
                e.x += (e.vx || 0) * dt;
                break;
            case 'boss':
                e.phase! += dt * 1.5;
                e.x += Math.sin(e.phase!) * 50 * dt;
                e.y += Math.abs(Math.cos(e.phase! * 0.7)) * 25 * dt;
                if (e.y > VH / 2) e.vy = -Math.abs(e.vy || 28);
                break;
            default:
                e.x += (e.vx || 0) * dt;
                e.y += (e.vy || 50) * dt;
        }
        // Wall clamp
        if (e.x - hw < WALL.left) { e.x = WALL.left + hw; e.vx = Math.abs(e.vx || 0); }
        if (e.x + hw > WALL.right) { e.x = WALL.right - hw; e.vx = -Math.abs(e.vx || 0); }
        if (e.y + hh > WALL.bottom) { e.y = WALL.bottom - hh; e.vy = -Math.abs(e.vy || 50) * 0.6; }
        if (e.y - hh < WALL.top) { e.y = WALL.top + hh; e.vy = Math.abs(e.vy || 50); }
        // Laser mechanic
        if (e.mechanic === 'laser') {
            e.laserTimer! -= dt;
            if (e.laserTimer! <= 0) {
                e.laserWarning = 0.5;
                e.laserDir = norm(s.x - e.x, COMBAT.SHIP_Y - e.y);
                e.laserTimer = 3.0 + Math.random() * 2;
            }
        }
        // Ship collision
        if (s.invincibleTimer <= 0) {
            if (e.x - hw < s.x + COMBAT.SHIP_W / 2 && e.x + hw > s.x - COMBAT.SHIP_W / 2 &&
                e.y - hh < COMBAT.SHIP_Y + COMBAT.SHIP_H / 2 && e.y + hh > COMBAT.SHIP_Y - COMBAT.SHIP_H / 2) {
                const dmg = e.def.dmg || 1;
                s.hp -= dmg;
                C.stats.hpLost = (C.stats.hpLost || 0) + dmg;
                s.invincibleTimer = COMBAT.SHIP_INVINCIBLE_S;
                SFX.play('damage');
                e.vy = -Math.abs(e.vy || 50) - 40;
                e.vx = (e.x - s.x) * 2 + rand(-30, 30);
                spawnParticle(e.x, e.y, 3, '#ff4444', 40);
            }
        }
    }
    // Fuel block pickup
    for (const fb of C.fuelBlocks) {
        if (fb.state === 'solid') {
            if (Math.abs(fb.x - s.x) < COMBAT.SHIP_W / 2 + COMBAT.FUEL_BLOCK_RADIUS &&
                Math.abs(fb.y - COMBAT.SHIP_Y) < COMBAT.SHIP_H / 2 + COMBAT.FUEL_BLOCK_RADIUS) {
                s.fuel = Math.min(getShipMaxFuel(), s.fuel + COMBAT.FUEL_RESTORE);
                fb.state = 'collected';
                spawnParticle(fb.x, fb.y, 5, '#44ff44', 50);
                spawnDmgNumber(fb.x, fb.y - 4, '+FUEL', '#44ff44');
                SFX.play('fuel');
            }
        }
    }
}

export function updateFuelBlocks(dt: number): void {
    const s = C.ship;
    for (const fb of C.fuelBlocks) {
        if (fb.state === 'solid') {
            fb.x += (fb.vx || 0) * dt;
            fb.y += (fb.vy || 0) * dt;
            fb.x = clamp(fb.x, WALL.left + COMBAT.FUEL_BLOCK_RADIUS, WALL.right - COMBAT.FUEL_BLOCK_RADIUS);
            fb.y = clamp(fb.y, WALL.top + COMBAT.FUEL_BLOCK_RADIUS, WALL.bottom - COMBAT.FUEL_BLOCK_RADIUS);
            fb.vx = (fb.vx || 0) * 0.98;
            fb.vy = (fb.vy || 0) * 0.98;
        } else if (fb.state === 'ghost') {
            const dx = s.x - fb.x, dy = COMBAT.SHIP_Y - fb.y, d = Math.hypot(dx, dy);
            if (d < 8) {
                s.fuel = Math.min(getShipMaxFuel(), s.fuel + COMBAT.FUEL_RESTORE);
                fb.state = 'collected';
                spawnParticle(fb.x, fb.y, 5, '#44ff44', 50);
                spawnDmgNumber(fb.x, fb.y - 4, '+FUEL', '#44ff44');
                SFX.play('fuel');
            } else {
                const spd = COMBAT.FUEL_GHOST_SPEED;
                fb.x += (dx / d) * spd * dt;
                fb.y += (dy / d) * spd * dt;
            }
        }
    }
    C.fuelBlocks = C.fuelBlocks.filter(fb => fb.state !== 'collected');
}

export function updateParticles(dt: number): void {
    for (const p of C.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    C.particles = C.particles.filter(p => p.life > 0);
}

export function updateDmgNumbers(dt: number): void {
    for (const d of C.dmgNumbers) { d.y -= 28 * dt; d.life -= dt; }
    C.dmgNumbers = C.dmgNumbers.filter(d => d.life > 0);
}

export function updateBuffs(dt: number): void {
    for (const b of C.buffs) b.timer -= dt;
    C.buffs = C.buffs.filter(b => b.timer > 0);
}

export function updateWave(dt: number): void {
    if (C.wave.allSpawned && C.enemies.length === 0) {
        if (C.wave.index >= DATA.WAVES.length - 1) {
            C.state = 'victory';
            C.stats.time = performance.now() - C._startTime;
            // endCombat called from combat.ts
            return;
        }
        C.wave.index++;
        startWave();
        SFX.play('waveUp');
        return;
    }
    if (!C.wave.allSpawned) {
        C.wave.spawnTimer -= dt;
        if (C.wave.spawnTimer <= 0) spawnNextEnemy();
    }
    // Check defeat conditions
    if (C.ship.hp <= 0 || C.ship.fuel <= 0) {
        C.stats.time = performance.now() - C._startTime;
        if (C.ship.hp <= 0) {
            C.state = 'defeat';
        } else {
            C.state = 'breakdown';
        }
        // endCombat called from combat.ts
    }
}

export function updatePreviewLine(): void {
    const gun = getGunPos();
    const dx = C.mouse.x - gun.x, dy = C.mouse.y - gun.y;
    if (Math.hypot(dx, dy) < 1) {
        C.preview.p1 = C.preview.p2 = null;
        C.preview.targetHit = 0;
        return;
    }
    const n = norm(dx, dy);
    const wallSurf = { left: WALL.left, right: WALL.right, top: WALL.top, bottom: WALL.bottom };
    let bestT = Infinity, bestType = '', bestEdge = '';
    const r1 = rayRectHit(gun.x, gun.y, n.x, n.y, wallSurf);
    if (r1 && r1.t < bestT) { bestT = r1.t; bestType = 'wall'; bestEdge = r1.edge; }
    for (const e of C.enemies) {
        const er = COMBAT.PB_RADIUS + Math.min(e.w / 2, e.h / 2);
        const t = rayCircleHit(gun.x, gun.y, n.x, n.y, e.x, e.y, er);
        if (t < bestT) { bestT = t; bestType = 'enemy'; }
    }
    for (const fb of C.fuelBlocks) {
        if (fb.state !== 'solid') continue;
        const fr = COMBAT.PB_RADIUS + COMBAT.FUEL_BLOCK_RADIUS;
        const t = rayCircleHit(gun.x, gun.y, n.x, n.y, fb.x, fb.y, fr);
        if (t < bestT) { bestT = t; bestType = 'fuel'; }
    }
    if (bestT === Infinity) { C.preview.p1 = C.preview.p2 = null; C.preview.targetHit = 0; return; }
    let hitX: number, hitY: number;
    if (bestType === 'wall') {
        const surfX = gun.x + n.x * bestT, surfY = gun.y + n.y * bestT;
        hitX = surfX - n.x * COMBAT.PB_RADIUS;
        hitY = surfY - n.y * COMBAT.PB_RADIUS;
    } else {
        hitX = gun.x + n.x * bestT;
        hitY = gun.y + n.y * bestT;
    }
    C.preview.p1 = { x: hitX, y: hitY };
    if (bestType === 'enemy' || bestType === 'fuel') {
        C.preview.p2 = null;
        C.preview.targetHit = 1;
        return;
    }
    C.preview.targetHit = 0;
    if (!bestEdge) {
        const surfX = gun.x + n.x * bestT, surfY = gun.y + n.y * bestT;
        const EPS = 0.5;
        if (Math.abs(surfX - WALL.left) < EPS) bestEdge = 'left';
        else if (Math.abs(surfX - WALL.right) < EPS) bestEdge = 'right';
        else if (Math.abs(surfY - WALL.top) < EPS) bestEdge = 'top';
        else if (Math.abs(surfY - WALL.bottom) < EPS) bestEdge = 'bottom';
    }
    const ref = reflectOnEdge(n.x, n.y, bestEdge);
    let bestT2 = Infinity;
    let bestT2IsEnemy = false;
    const r2 = rayRectHit(hitX, hitY, ref.vx, ref.vy, wallSurf);
    if (r2 && r2.t > 0) { bestT2 = r2.t; bestT2IsEnemy = false; }
    for (const e of C.enemies) {
        const er = COMBAT.PB_RADIUS + Math.min(e.w / 2, e.h / 2);
        const t = rayCircleHit(hitX, hitY, ref.vx, ref.vy, e.x, e.y, er);
        if (t < bestT2) { bestT2 = t; bestT2IsEnemy = true; }
    }
    if (!isFinite(bestT2) || bestT2 <= 0) {
        const tWall = rayRectHit(hitX, hitY, ref.vx, ref.vy, wallSurf);
        if (tWall && tWall.t > 0.001) { bestT2 = tWall.t; bestT2IsEnemy = false; }
        else { C.preview.p2 = null; return; }
    }
    let hitX2: number, hitY2: number;
    if (!bestT2IsEnemy) {
        const surfX2 = hitX + ref.vx * bestT2, surfY2 = hitY + ref.vy * bestT2;
        hitX2 = surfX2 - ref.vx * COMBAT.PB_RADIUS;
        hitY2 = surfY2 - ref.vy * COMBAT.PB_RADIUS;
        C.preview.targetHit = 0;
    } else {
        hitX2 = hitX + ref.vx * bestT2;
        hitY2 = hitY + ref.vy * bestT2;
        C.preview.targetHit = 2;
    }
    C.preview.p2 = { x: hitX2, y: hitY2 };
}

// ============================================================
// MAIN UPDATE
// ============================================================

export function update(dt: number): void {
    if (C.state !== 'playing') return;
    dt = Math.min(dt, 0.1);
    updateBuffs(dt);
    updateShip(dt);
    updatePinballs(dt);
    updateEnemies(dt);
    updateFuelBlocks(dt);
    updateParticles(dt);
    updateDmgNumbers(dt);
    // Combo timer
    if (C.comboActive && C.comboTimer > 0) {
        C.comboTimer -= dt;
        if (C.comboTimer <= 0) C.comboCount = 0;
    }
    // Fire
    const fireInterval = getFireInterval();
    if (C.fireCooldown > 0) C.fireCooldown -= dt;
    if (C.mouseDown && C.fireCooldown <= 0) {
        if (C.ammo > 0) {
            firePinball();
            C.fireCooldown = fireInterval;
        } else {
            C.ammoShake = 0.25;
            C.fireCooldown = fireInterval;
            SFX.play('noAmmo', false);
        }
    }
    if (C.ammoShake > 0) C.ammoShake = Math.max(0, C.ammoShake - dt);
    updatePreviewLine();
    updateWave(dt);
    if (C.shakeTimer > 0) C.shakeTimer = Math.max(0, C.shakeTimer - dt);
}
