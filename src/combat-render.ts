/* ============================================================
   COMBAT-RENDER.TS — Canvas rendering for combat
   ============================================================ */

import { C, combatCtx, COMBAT, WALL, VW, VH, clamp, getGunPos } from './combat.js';

export function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}
// ============================================================
// STARFIELD
// ============================================================
export function drawStarfield(): void {
    const t = performance.now() / 1000;
    for (let i = 0; i < 70; i++) {
        const sx = ((i * 137 + 53) % 640);
        const sy = ((i * 251 + (t * 30)) % 360);
        const brightness = 0.3 + 0.7 * ((i * 97 + 11) % 100) / 100;
        const size = (i % 3 === 0) ? 1.5 : 1;
        combatCtx.fillStyle = `rgba(255,255,255,${brightness})`;
        combatCtx.fillRect(sx, sy, size, size);
    }
}
// ============================================================
// BATTLEFIELD EDGES
// ============================================================
export function drawBattlefield(): void {
    combatCtx.strokeStyle = '#335566';
    combatCtx.lineWidth = 1;
    combatCtx.strokeRect(WALL.left, WALL.top, WALL.right - WALL.left, WALL.bottom - WALL.top);
    const cs = 6;
    combatCtx.fillStyle = '#335566';
    [[WALL.left, WALL.top, 1, 1], [WALL.right, WALL.top, -1, 1], [WALL.left, WALL.bottom, 1, -1], [WALL.right, WALL.bottom, -1, -1]]
        .forEach(([cx, cy, dx, dy]) => { combatCtx.fillRect(cx - dx * cs, cy, dx * cs, 1); combatCtx.fillRect(cx, cy - dy * cs, 1, dy * cs); });
}
// ============================================================
// SHIP
// ============================================================
export function drawShip(): void {
    const s = C.ship, cx = s.x, cy = s.y;
    combatCtx.save();
    combatCtx.translate(cx, cy);
    // Ship body always faces up — no rotation

    // Invincibility / god mode blink
    const invBlink = (s.invincibleTimer > 0 || s.godMode) && Math.floor(performance.now() / 80) % 2 === 0;
    if (invBlink) combatCtx.globalAlpha = 0.45;

    // ---- vector thrusters ----
    drawShipThrusters();

    // ---- ship body (triangle pointing up) ----
    combatCtx.fillStyle = '#44cc88';
    combatCtx.beginPath();
    combatCtx.moveTo(0, -COMBAT.SHIP_H / 2);
    combatCtx.lineTo(COMBAT.SHIP_W / 2, COMBAT.SHIP_H / 2);
    combatCtx.lineTo(6, COMBAT.SHIP_H / 2 - 4);
    combatCtx.lineTo(-6, COMBAT.SHIP_H / 2 - 4);
    combatCtx.lineTo(-COMBAT.SHIP_W / 2, COMBAT.SHIP_H / 2);
    combatCtx.closePath();
    combatCtx.fill();

    // God mode golden glow
    if (s.godMode) {
        combatCtx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
        combatCtx.lineWidth = 2;
        combatCtx.beginPath();
        combatCtx.arc(0, 0, COMBAT.SHIP_W / 2 + 4, 0, Math.PI * 2);
        combatCtx.stroke();
    }

    // ---- cockpit ----
    combatCtx.fillStyle = '#88ffcc';
    combatCtx.beginPath();
    combatCtx.arc(0, -4, 4, 0, Math.PI * 2);
    combatCtx.fill();

    // ---- rotating cannon barrel ----
    combatCtx.save();
    combatCtx.rotate(s.cannonAngle + Math.PI / 2);
    const barrelLen = COMBAT.SHIP_H / 2 + 6;
    combatCtx.strokeStyle = '#ffffff';
    combatCtx.lineWidth = 3;
    combatCtx.beginPath();
    combatCtx.moveTo(0, 2);
    combatCtx.lineTo(0, -barrelLen);
    combatCtx.stroke();
    // Barrel tip glow
    combatCtx.fillStyle = '#ffaa44';
    combatCtx.beginPath();
    combatCtx.arc(0, -barrelLen, 2.5, 0, Math.PI * 2);
    combatCtx.fill();
    combatCtx.restore();

    combatCtx.restore();
}

function drawShipThrusters(): void {
    const tx = C.ship.thrustX || 0, ty = C.ship.thrustY || 0;
    const halfW = COMBAT.SHIP_W / 2, halfH = COMBAT.SHIP_H / 2;
    // Flame shape points +Y (down in screen). Rotate to point away from ship.
    // Rear thruster (bottom) — bright when moving UP (opposite direction)
    drawThrusterFlame(0, halfH - 2, 0, 0.3 + Math.max(0, -ty) * 0.7, 4 + Math.max(0, -ty) * 6);
    // Front thruster (top) — fires when moving DOWN
    drawThrusterFlame(0, -halfH + 2, Math.PI, Math.max(0, ty) * 0.8, Math.max(0, ty) * 8);
    // Right thruster — fires when moving left (thrust pushes right → flame goes right)
    drawThrusterFlame(halfW - 2, 0, -Math.PI / 2, Math.max(0, -tx) * 0.8, Math.max(0, -tx) * 8);
    // Left thruster — fires when moving right (thrust pushes left → flame goes left)
    drawThrusterFlame(-halfW + 2, 0, Math.PI / 2, Math.max(0, tx) * 0.8, Math.max(0, tx) * 8);
}

function drawThrusterFlame(ox: number, oy: number, rot: number, bright: number, lenBoost: number): void {
    if (bright < 0.02) {
        // Idle rear thruster (rot=0): dim but always on
        if (rot === 0) bright = 0.2; else return;
    }
    combatCtx.save();
    combatCtx.translate(ox, oy);
    combatCtx.rotate(rot);
    const flameLen = Math.min(16, 3 + lenBoost + Math.random() * 3);
    const r = Math.floor(255);
    const g = Math.floor(120 + bright * 135 + Math.random() * 30);
    const b = Math.floor(Math.random() * 25);
    combatCtx.fillStyle = `rgba(${r},${g},${b},${0.4 + bright * 0.6})`;
    combatCtx.beginPath();
    combatCtx.moveTo(-3, 2);
    combatCtx.lineTo(3, 2);
    combatCtx.lineTo(0, flameLen);
    combatCtx.closePath();
    combatCtx.fill();
    // Inner bright core
    combatCtx.fillStyle = `rgba(255,255,200,${0.3 + bright * 0.4})`;
    combatCtx.beginPath();
    combatCtx.moveTo(-1.5, 2);
    combatCtx.lineTo(1.5, 2);
    combatCtx.lineTo(0, flameLen * 0.6);
    combatCtx.closePath();
    combatCtx.fill();
    combatCtx.restore();
}
// ============================================================
// PINBALLS
// ============================================================
export function drawPinballs(): void {
    for (const pb of C.pinballs) {
        combatCtx.fillStyle = 'rgba(100,200,255,0.4)';
        combatCtx.beginPath();
        combatCtx.arc(pb.x, pb.y, COMBAT.PB_RADIUS + 2, 0, Math.PI * 2);
        combatCtx.fill();
        combatCtx.fillStyle = '#ffffff';
        combatCtx.beginPath();
        combatCtx.arc(pb.x, pb.y, COMBAT.PB_RADIUS, 0, Math.PI * 2);
        combatCtx.fill();
    }
}
// ============================================================
// ENEMIES
// ============================================================

export function drawEnemies(): void {
    for (const e of C.enemies) {
        const def = e.def;
        const flash = e.flashTimer > 0;
        const c = flash ? (def.flashColor || '#ffffff') : def.fillColor;
        const dc = flash ? (def.flashColor || '#dddddd') : def.detailColor;

        combatCtx.save();
        combatCtx.translate(e.x, e.y);

        // ---- body shape ----
        combatCtx.fillStyle = c;
        combatCtx.beginPath();
        if (def.shape === 'hexagon') {
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3 - Math.PI / 6, r = e.w / 2;
                combatCtx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
        } else {
            combatCtx.moveTo(0, -e.h / 2);
            combatCtx.lineTo(e.w / 2, 0);
            combatCtx.lineTo(0, e.h / 2);
            combatCtx.lineTo(-e.w / 2, 0);
        }
        combatCtx.closePath();
        combatCtx.fill();

        // ---- outline ----
        if (def.strokeColor) {
            combatCtx.strokeStyle = flash ? (def.flashColor || '#cccccc') : def.strokeColor;
            combatCtx.lineWidth = 1;
            combatCtx.stroke();
        }

        // ---- inner detail ----
        combatCtx.fillStyle = dc;
        if (def.shape === 'hexagon') {
            combatCtx.fillRect(-3, -5, 6, 6);
            combatCtx.fillStyle = '#000';
            combatCtx.fillRect(0, -4, 3, 3);
        } else {
            combatCtx.beginPath();
            combatCtx.arc(0, 0, 3, 0, Math.PI * 2);
            combatCtx.fill();
        }

        // ---- HP bar ----
        if (def.showHpBar) {
            const barW = e.w, barH = 3, barY = -e.h / 2 - 6;
            combatCtx.fillStyle = '#333';
            combatCtx.fillRect(-barW / 2, barY, barW, barH);
            combatCtx.fillStyle = '#ff4444';
            combatCtx.fillRect(-barW / 2, barY, barW * (e.hp / e.maxHp), barH);
        }

        // ---- shield visual ----
        if (e.mechanic === 'shield' && e.shieldCount > 0) {
            combatCtx.strokeStyle = 'rgba(100,150,255,0.7)';
            combatCtx.lineWidth = 2;
            combatCtx.beginPath();
            combatCtx.arc(0, 0, e.w / 2 + 4, 0, Math.PI * 2);
            combatCtx.stroke();
            combatCtx.fillStyle = '#aaf';
            combatCtx.font = '8px "Press Start 2P", monospace';
            combatCtx.textAlign = 'center';
            combatCtx.fillText(String(e.shieldCount), 0, -e.h / 2 - 8);
            combatCtx.textAlign = 'start';
        }

        combatCtx.restore();
    }
}
// ============================================================
// FUEL BLOCKS
// ============================================================
export function drawFuelBlocks(): void {
    for (const fb of C.fuelBlocks) {
        combatCtx.save();
        combatCtx.translate(fb.x, fb.y);
        if (fb.state === 'ghost')
            combatCtx.globalAlpha = 0.45;
        combatCtx.fillStyle = fb.state === 'ghost' ? 'rgba(68,255,68,0.3)' : 'rgba(68,255,68,0.5)';
        combatCtx.beginPath();
        combatCtx.arc(0, 0, COMBAT.FUEL_BLOCK_RADIUS + 2, 0, Math.PI * 2);
        combatCtx.fill();
        combatCtx.fillStyle = '#44ff44';
        combatCtx.beginPath();
        combatCtx.moveTo(0, -COMBAT.FUEL_BLOCK_RADIUS);
        combatCtx.lineTo(COMBAT.FUEL_BLOCK_RADIUS, 0);
        combatCtx.lineTo(0, COMBAT.FUEL_BLOCK_RADIUS);
        combatCtx.lineTo(-COMBAT.FUEL_BLOCK_RADIUS, 0);
        combatCtx.closePath();
        combatCtx.fill();
        combatCtx.fillStyle = '#ffffff';
        combatCtx.beginPath();
        combatCtx.arc(0, 0, 2, 0, Math.PI * 2);
        combatCtx.fill();
        combatCtx.restore();
    }
}
// ============================================================
// PREVIEW LINE
// ============================================================
export function drawPreviewLine(): void {
    if (!C.preview.p1)
        return;
    const gun = getGunPos(), targetHit = C.preview.targetHit || 0;
    combatCtx.setLineDash([5, 5]);
    if (targetHit === 1) {
        combatCtx.strokeStyle = 'rgba(255,80,80,0.7)';
        combatCtx.lineWidth = 1.5;
        combatCtx.beginPath();
        combatCtx.moveTo(gun.x, gun.y);
        combatCtx.lineTo(C.preview.p1.x, C.preview.p1.y);
        combatCtx.stroke();
    }
    else {
        combatCtx.strokeStyle = 'rgba(255,255,255,0.55)';
        combatCtx.lineWidth = 1;
        combatCtx.beginPath();
        combatCtx.moveTo(gun.x, gun.y);
        combatCtx.lineTo(C.preview.p1.x, C.preview.p1.y);
        combatCtx.stroke();
        if (C.preview.p2) {
            combatCtx.strokeStyle = targetHit === 2 ? 'rgba(255,80,80,0.5)' : 'rgba(255,255,255,0.25)';
            combatCtx.beginPath();
            combatCtx.moveTo(C.preview.p1.x, C.preview.p1.y);
            combatCtx.lineTo(C.preview.p2.x, C.preview.p2.y);
            combatCtx.stroke();
        }
    }
    combatCtx.setLineDash([]);
    if (targetHit === 1) {
        combatCtx.fillStyle = 'rgba(255,60,60,0.9)';
        combatCtx.beginPath();
        combatCtx.arc(C.preview.p1.x, C.preview.p1.y, 3, 0, Math.PI * 2);
        combatCtx.fill();
    }
    else {
        combatCtx.fillStyle = 'rgba(255,255,255,0.5)';
        combatCtx.beginPath();
        combatCtx.arc(C.preview.p1.x, C.preview.p1.y, 2, 0, Math.PI * 2);
        combatCtx.fill();
        if (targetHit === 2 && C.preview.p2) {
            combatCtx.fillStyle = 'rgba(255,60,60,0.9)';
            combatCtx.beginPath();
            combatCtx.arc(C.preview.p2.x, C.preview.p2.y, 3, 0, Math.PI * 2);
            combatCtx.fill();
        }
    }
}
// ============================================================
// LASER BEAMS (enemy laser attacks)
// Thin solid line → thickens → flash + SFX + damage
// ============================================================
export function drawLaserBeams(): void {
    for (const L of C.laserBeams) {
        const beamLen = 600;
        const ex = L.x + L.dirX * beamLen;
        const ey = L.y + L.dirY * beamLen;
        if (!L.fired) {
            // Warning phase: thin solid line that gradually thickens
            const progress = 1 - (L.life - L.warnDuration) / L.warnDuration; // 0→1
            const lw = 1 + progress * 5; // grows from 1px to 6px
            const alpha = 0.3 + progress * 0.5; // fades in
            combatCtx.strokeStyle = `rgba(255, 50, 50, ${alpha})`;
            combatCtx.lineWidth = lw;
            combatCtx.setLineDash([]); // SOLID line — not dashed (differentiate from aim line)
        } else {
            // Firing phase: bright flash → fade
            const fadeProgress = L.life / L.warnDuration; // 1→0 (fade out)
            // Glow layer
            combatCtx.strokeStyle = `rgba(255, 30, 30, ${0.25 * fadeProgress})`;
            combatCtx.lineWidth = 12;
            combatCtx.beginPath();
            combatCtx.moveTo(L.x, L.y);
            combatCtx.lineTo(ex, ey);
            combatCtx.stroke();
            // Core beam
            const flash = fadeProgress > 0.5 ? 1 : fadeProgress * 2;
            combatCtx.strokeStyle = `rgba(255, ${Math.floor(50 + flash * 100)}, ${Math.floor(flash * 30)}, ${0.8 * fadeProgress})`;
            combatCtx.lineWidth = 5;
        }
        combatCtx.beginPath();
        combatCtx.moveTo(L.x, L.y);
        combatCtx.lineTo(ex, ey);
        combatCtx.stroke();
        // Source glow at enemy position
        if (!L.fired) {
            combatCtx.fillStyle = 'rgba(255, 80, 80, 0.5)';
            combatCtx.beginPath();
            combatCtx.arc(L.x, L.y, 4, 0, Math.PI * 2);
            combatCtx.fill();
        }
    }
}
// ============================================================
// PARTICLES
// ============================================================
export function drawParticles(): void {
    for (const p of C.particles) {
        const alpha = p.life / p.maxLife;
        combatCtx.fillStyle = hexToRgba(p.color, alpha);
        combatCtx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
}
// ============================================================
// DAMAGE NUMBERS
// ============================================================
export function drawDmgNumbers(): void {
    combatCtx.font = '9px "Press Start 2P", monospace';
    combatCtx.textAlign = 'center';
    combatCtx.textBaseline = 'middle';
    for (const d of C.dmgNumbers) {
        const alpha = clamp(d.life / 0.7, 0, 1);
        const isFuel = d.text === '+FUEL';
        if (d.color) {
            combatCtx.fillStyle = hexToRgba(d.color, alpha);
        }
        else {
            const r = isFuel ? 68 : 255, g = isFuel ? Math.floor(255 * alpha) : Math.floor(220 * alpha), b = isFuel ? Math.floor(68 * alpha) : Math.floor(80 * alpha);
            combatCtx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        }
        combatCtx.strokeStyle = `rgba(0,0,0,${alpha * 0.6})`;
        combatCtx.lineWidth = 2;
        combatCtx.strokeText(d.text, d.x, d.y);
        combatCtx.fillText(d.text, d.x, d.y);
    }
    combatCtx.textAlign = 'start';
    combatCtx.textBaseline = 'alphabetic';
}
// HUD is now HTML-based (see updateHtmlHUD in combat.js)
// ============================================================
// RENDER COMBAT (main render call)
// ============================================================
export function renderCombat(): void {
    combatCtx.clearRect(0, 0, VW, VH);
    let shakeX = 0, shakeY = 0;
    if (C.shakeTimer > 0) {
        shakeX = (Math.random() - 0.5) * 4 * (C.shakeTimer / 0.08);
        shakeY = (Math.random() - 0.5) * 4 * (C.shakeTimer / 0.08);
    }
    combatCtx.save();
    combatCtx.translate(shakeX, shakeY);
    drawStarfield();
    drawBattlefield();
    drawPreviewLine();
    drawLaserBeams();
    drawEnemies();
    drawFuelBlocks();
    drawPinballs();
    drawParticles();
    drawDmgNumbers();
    drawShip();
    combatCtx.restore();
}
