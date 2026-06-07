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
import { combatToast } from './combat-ui.js';
import type { Pinball } from './types.js';

// ============================================================
// UPDATE FUNCTIONS
// ============================================================

export function updateShip(dt: number): void {
    const s = C.ship;
    // Entry animation: ship flies in from below
    if (s.entryTimer > 0) {
        s.entryTimer = Math.max(0, s.entryTimer - dt);
        const progress = 1 - s.entryTimer / COMBAT.SHIP_ENTRY_TIME;
        // Ease-out: ship starts below screen, glides to center
        const startY = VH + COMBAT.SHIP_H;
        const targetY = VH / 2;
        s.y = startY + (targetY - startY) * (1 - Math.pow(1 - progress, 2));
        // Cannon angle follows mouse during entry too
        const dx = C.mouse.x - s.x, dy = C.mouse.y - s.y;
        if (Math.hypot(dx, dy) > 4) s.cannonAngle = Math.atan2(dy, dx);
        return; // No control during entry
    }
    const speedMult = getShipSpeedMult();
    // 2D movement: W/A/S/D
    let mx = 0, my = 0;
    if (C.keys['a'] || C.keys['A'] || C.keys['ArrowLeft']) mx -= 1;
    if (C.keys['d'] || C.keys['D'] || C.keys['ArrowRight']) mx += 1;
    if (C.keys['w'] || C.keys['W'] || C.keys['ArrowUp']) my -= 1;
    if (C.keys['s'] || C.keys['S'] || C.keys['ArrowDown']) my += 1;
    const moveLen = Math.hypot(mx, my) || 1;
    const moveX = (mx / moveLen) * COMBAT.SHIP_SPEED * speedMult * dt;
    const moveY = (my / moveLen) * COMBAT.SHIP_SPEED * speedMult * dt;
    s.x = clamp(s.x + moveX, WALL.left + COMBAT.SHIP_W / 2, WALL.right - COMBAT.SHIP_W / 2);
    s.y = clamp(s.y + moveY, WALL.top + COMBAT.SHIP_H / 2, WALL.bottom - COMBAT.SHIP_H / 2);
    // Track thrust direction for vector thruster visuals
    s.thrustX = mx / moveLen;
    s.thrustY = my / moveLen;
    const moved = Math.hypot(moveX, moveY);
    // Cannon angle: always point toward mouse
    const dx = C.mouse.x - s.x, dy = C.mouse.y - s.y;
    if (Math.hypot(dx, dy) > 4) s.cannonAngle = Math.atan2(dy, dx);
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
        // Flash timer (white flash on hit)
        if (e.flashTimer > 0) e.flashTimer -= dt;
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
        // Laser mechanic: create a single LaserBeam that handles warning + firing
        if (e.mechanic === 'laser') {
            e.laserTimer! -= dt;
            if (e.laserTimer! <= 0) {
                const dir = norm(C.ship.x - e.x, C.ship.y - e.y);
                C.laserBeams.push({
                    x: e.x, y: e.y,
                    dirX: dir.x, dirY: dir.y,
                    life: 0.8,           // total life: 0.6s warning + 0.2s fire
                    warnDuration: 0.6,   // warning phase (thin→thick)
                    fired: false,
                    dmg: e.def.dmg || 2,
                    owner: e,
                });
                e.laserTimer = 3.0 + Math.random() * 2;
            }
        }
        // Ship collision
        if (s.invincibleTimer <= 0 && !s.godMode) {
            if (e.x - hw < s.x + COMBAT.SHIP_W / 2 && e.x + hw > s.x - COMBAT.SHIP_W / 2 &&
                e.y - hh < s.y + COMBAT.SHIP_H / 2 && e.y + hh > s.y - COMBAT.SHIP_H / 2) {
                const dmg = e.def.dmg || 1;
                s.hp -= dmg;
                C.stats.hpLost = (C.stats.hpLost || 0) + dmg;
                s.invincibleTimer = COMBAT.SHIP_INVINCIBLE_S;
                C.shakeTimer = 0.15;
                C.shakeMagnitude = COMBAT.SHAKE_DAMAGE;
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
                Math.abs(fb.y - s.y) < COMBAT.SHIP_H / 2 + COMBAT.FUEL_BLOCK_RADIUS) {
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
            const dx = s.x - fb.x, dy = s.y - fb.y, d = Math.hypot(dx, dy);
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
        combatToast(`WAVE ${C.wave.index + 1}`, 2.0);
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
            // Fuel depleted: check if resource goal is met
            const area = DATA.AREAS.find(a => a.id === C.areaId);
            const goal = area ? area.resourceGoal : 30;
            if (C.stats.resourceCollected >= goal) {
                C.state = 'victory';
                C.stats.fuelDepleted = true;
            } else {
                C.state = 'breakdown';
            }
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
// LASER BEAMS
// ============================================================
export function updateLaserBeams(dt: number): void {
    const s = C.ship;
    for (let i = C.laserBeams.length - 1; i >= 0; i--) {
        const L = C.laserBeams[i];
        L.life -= dt;
        // Track the owning enemy's position during warning phase
        if (!L.fired && L.owner && C.enemies.includes(L.owner)) {
            L.x = L.owner.x; L.y = L.owner.y;
        }
        // Fire: when warning phase expires, deal damage + SFX + brief flash
        if (!L.fired && L.life <= L.warnDuration) {
            L.fired = true;
            SFX.play('laser');
            // Check ship proximity to beam line
            const fx = s.x - L.x, fy = s.y - L.y;
            const proj = fx * L.dirX + fy * L.dirY;
            if (proj > 0 && proj < 600) {
                const px = L.x + L.dirX * proj;
                const py = L.y + L.dirY * proj;
                const hitDist = Math.hypot(px - s.x, py - s.y);
                if (hitDist < COMBAT.SHIP_W / 2 + 4 && s.invincibleTimer <= 0 && !s.godMode) {
                    s.hp -= L.dmg;
                    C.stats.hpLost = (C.stats.hpLost || 0) + L.dmg;
                    s.invincibleTimer = COMBAT.SHIP_INVINCIBLE_S;
                    C.shakeTimer = 0.2;
                    C.shakeMagnitude = COMBAT.SHAKE_LASER;
                    SFX.play('damage');
                }
            }
        }
        if (L.life <= 0) C.laserBeams.splice(i, 1);
    }
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
    updateLaserBeams(dt);
    // Combat toast timer
    if (C.combatToast.life > 0) C.combatToast.life = Math.max(0, C.combatToast.life - dt);
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
