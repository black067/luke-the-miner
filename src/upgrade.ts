/* ============================================================
   UPGRADE.TS — Upgrade tree (Canvas)
   ============================================================ */

import { DATA } from './data.js';
import { GS, dispatch, canAffordUpgrade, deductUpgradeCost, countInWarehouse } from './state.js';
import { showToast } from './screens.js';
import type { UpgradeNode, UgSelection, UgPositions } from './types.js';

export const UG_NODE_R = 28;
export const UG_LEVEL_DIST = [130, 240, 360, 500];
export let ugPanX = 0;
export let ugPanY = 0;
export let ugDragging = false;
export let ugDragSX = 0;
export let ugDragSY = 0;
export let ugDragPX = 0;
export let ugDragPY = 0;
export let ugSelected: UgSelection | null = null;
export let ugHovered: UgSelection | null = null;
export let ugAnimId: number | null = null;
export let ugCanvasEl: HTMLCanvasElement | null = null;
// Pre-compute node positions
export const UG_POS: UgPositions = {};
(function buildUgPos() {
    const cx = 0, cy = 0;
    const branches = Object.keys(DATA.UPGRADES);
    const n = branches.length;
    for (let i = 0; i < n; i++) {
        const key = branches[i];
        // Adjust angle: spread from -80° to +80° from upward
        const spreadAng = -Math.PI / 2 + ((i + 0.5) / n) * (Math.PI * 0.85) - Math.PI * 0.425;
        const nodes = DATA.UPGRADES[key].nodes;
        UG_POS[key] = nodes.map((_nd, j) => {
            const dist = UG_LEVEL_DIST[j] || UG_LEVEL_DIST[UG_LEVEL_DIST.length - 1];
            return { x: cx + Math.cos(spreadAng) * dist, y: cy + Math.sin(spreadAng) * dist };
        });
    }
})();
export function getUgNodeAt(mx: number, my: number): UgSelection | null {
    let best = null, bestDist = UG_NODE_R + 8;
    for (const [key, positions] of Object.entries(UG_POS)) {
        const nodes = DATA.UPGRADES[key].nodes;
        for (let i = 0; i < nodes.length; i++) {
            const pos = positions[i];
            const dx = mx - pos.x, dy = my - pos.y;
            const d = Math.hypot(dx, dy);
            if (d < bestDist) {
                bestDist = d;
                best = { key, idx: i, node: nodes[i], pos };
            }
        }
    }
    return best;
}
export function isNodeUnlocked(node: UpgradeNode): boolean {
    if (!node.req)
        return true;
    return GS.upgrades.has(node.req);
}
export function drawUpgradeTree(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.clearRect(0, 0, w, h);
    // Background
    ctx.fillStyle = '#0d180d';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2 + ugPanX, h / 2 + ugPanY);
    // Grid dots
    ctx.fillStyle = 'rgba(0,255,0,0.03)';
    for (let gx = -600; gx < 600; gx += 30) {
        for (let gy = -600; gy < 600; gy += 30) {
            ctx.fillRect(gx, gy, 1, 1);
        }
    }
    // Draw connections
    for (const [key, positions] of Object.entries(UG_POS)) {
        const nodes = DATA.UPGRADES[key].nodes;
        // Ship center to first node
        const firstPos = positions[0];
        const firstDone = GS.upgrades.has(nodes[0].id);
        ctx.strokeStyle = firstDone ? '#3a6a3a' : '#1a2a1a';
        ctx.lineWidth = 1.5;
        ctx.setLineDash(firstDone ? [] : [4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(firstPos.x, firstPos.y);
        ctx.stroke();
        // Inter-node connections
        for (let i = 1; i < nodes.length; i++) {
            const prevPos = positions[i - 1];
            const pos = positions[i];
            const done = GS.upgrades.has(nodes[i].id);
            const prevDone = GS.upgrades.has(nodes[i - 1].id);
            const unlocked = isNodeUnlocked(nodes[i]);
            ctx.strokeStyle = done ? '#3a6a3a' : (prevDone && unlocked ? '#2a4a2a' : '#151515');
            ctx.lineWidth = 1.5;
            ctx.setLineDash(done ? [] : (prevDone ? [3, 3] : [6, 4]));
            ctx.beginPath();
            ctx.moveTo(prevPos.x, prevPos.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }
    }
    ctx.setLineDash([]);
    // Draw nodes
    for (const [key, positions] of Object.entries(UG_POS)) {
        const nodes = DATA.UPGRADES[key].nodes;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const pos = positions[i];
            const done = GS.upgrades.has(node.id);
            const unlocked = isNodeUnlocked(node);
            const isHovered = ugHovered && ugHovered.key === key && ugHovered.idx === i;
            const isSelected = ugSelected && ugSelected.key === key && ugSelected.idx === i;
            // Node circle
            const r = UG_NODE_R;
            if (done) {
                ctx.fillStyle = '#2a5a2a';
                ctx.strokeStyle = '#4a8a4a';
                ctx.lineWidth = 2;
            }
            else if (unlocked) {
                ctx.fillStyle = '#1a2a1a';
                ctx.strokeStyle = isHovered ? '#5a5' : '#3a5a3a';
                ctx.lineWidth = isHovered ? 2.5 : 1.5;
            }
            else {
                ctx.fillStyle = '#0d150d';
                ctx.strokeStyle = '#1a2a1a';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
            }
            // Pulse for hovered+unlocked
            if (isHovered && unlocked && !done) {
                ctx.shadowColor = 'rgba(0,255,0,0.3)';
                ctx.shadowBlur = 10;
            }
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            // Selection highlight
            if (isSelected) {
                ctx.strokeStyle = '#0f0';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, r + 3, 0, Math.PI * 2);
                ctx.stroke();
            }
            // Icon
            const icon = DATA.UPGRADES[key].icon || '⚡';
            ctx.font = '16px "Noto Color Emoji", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = done ? '#0f0' : (unlocked ? '#8a8' : '#444');
            ctx.fillText(icon, pos.x, pos.y - 4);
            // Label
            ctx.font = '7px VT323, "Fusion Pixel CJK", "Noto Color Emoji", monospace';
            ctx.fillStyle = done ? '#0f0' : (unlocked ? '#6a6' : '#333');
            ctx.fillText(node.label, pos.x, pos.y + r + 14);
        }
    }
    // Ship center
    ctx.fillStyle = '#44cc88';
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(12, 10);
    ctx.lineTo(5, 8);
    ctx.lineTo(-5, 8);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#88ffcc';
    ctx.beginPath();
    ctx.arc(0, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
}
export function ugDoUpgrade(): void {
    if (!ugSelected)
        return;
    const { node } = ugSelected;
    if (GS.upgrades.has(node.id))
        return;
    if (!isNodeUnlocked(node)) {
        showToast('🔒 前置节点未解锁');
        return;
    }
    if (!canAffordUpgrade(node.cost)) {
        showToast('材料或货币不足！');
        return;
    }
    deductUpgradeCost(node.cost);
    dispatch({ type: 'ADD_UPGRADE', upgradeId: node.id });
    showToast(`${node.label} 升级完成！`);
    // Update panels
    refreshUgFloat();
    if (ugCanvasEl) {
        const ugCtx = ugCanvasEl.getContext('2d');
        if (ugCtx) drawUpgradeTree(ugCtx, ugCanvasEl.width, ugCanvasEl.height);
    }
}
export function refreshUgFloat(): void {
    const float = document.getElementById('ug-float');
    if (!float)
        return;
    // Hide if no selection and no hover, or show if selected
    const target = ugSelected || ugHovered;
    if (!target) {
        float.classList.remove('visible');
        return;
    }
    const { node } = target;
    const done = GS.upgrades.has(node.id);
    const unlocked = isNodeUnlocked(node);
    const canAfford = canAffordUpgrade(node.cost);
    let costHtml = '';
    if (node.cost) {
        if (node.cost.materials) {
            for (const mat of node.cost.materials) {
                const matDef = DATA.MATERIALS.find(m => m.id === mat.id);
                const have = countInWarehouse(mat.id);
                const ok = have >= mat.qty;
                costHtml += `<div class="uf-cost"><span class="${ok ? 'ok' : 'short'}">${matDef ? matDef.name : mat.id} ×${mat.qty} (${ok ? '✓' : '✗'} ${have})</span></div>`;
            }
        }
        if (node.cost.btc) {
            const ok = GS.bitcoin >= node.cost.btc;
            costHtml += `<div class="uf-cost"><span class="${ok ? 'ok' : 'short'}">₿ ${node.cost.btc.toLocaleString()} (${ok ? '✓' : '✗'} ${GS.bitcoin.toLocaleString()})</span></div>`;
        }
        if (node.cost.cash) {
            const ok = GS.cash >= node.cost.cash;
            costHtml += `<div class="uf-cost"><span class="${ok ? 'ok' : 'short'}">$ ${node.cost.cash.toLocaleString()} (${ok ? '✓' : '✗'} ${GS.cash.toLocaleString()})</span></div>`;
        }
    }
    let effectHtml = '';
    if (node.effect) {
        if (node.effect.hp)
            effectHtml = `HP上限 +${node.effect.hp}`;
        else if (node.effect.fuel)
            effectHtml = `燃料容量 +${node.effect.fuel}`;
        else if (node.effect.speed)
            effectHtml = `移动速度 +${Math.round(node.effect.speed * 100)}%`;
        else if (node.effect.cargo)
            effectHtml = `货舱容量 +${node.effect.cargo}格`;
        else if (node.effect.accSlot)
            effectHtml = `解锁第${node.effect.accSlot}个饰品槽`;
        else if (node.effect.special)
            effectHtml = node.desc || '特殊能力';
    }
    float.innerHTML = `
    <div class="uf-title">${node.label}</div>
    <div>${effectHtml}</div>
    ${costHtml}
    ${done
        ? '<div class="uf-done">✅ 已升级</div>'
        : (unlocked
            ? `<button class="uf-btn${canAfford ? '' : ' disabled'}" onclick="ugDoUpgrade()">🔧 升级</button>`
            : '<div style="color:#555;">🔒</div>')}
  `;
    float.classList.add('visible');
}
export function initUpgradeCanvas(canvas: HTMLCanvasElement): void {
    ugCanvasEl = canvas;
    // Cancel out parent zoom so mouse coordinates map 1:1
    const crtContent = document.getElementById('crt-content');
    if (crtContent) {
        const parentZoom = parseFloat(getComputedStyle(crtContent).zoom) || 1;
        canvas.style.zoom = String(1 / parentZoom);
    }
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w;
    canvas.height = h;
    // Reset pan
    ugPanX = 0;
    ugPanY = 0;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawUpgradeTree(ctx, w, h);
    // Auto-select first upgradable node (unlocked, not done)
    if (!ugSelected) {
        for (const [key, nodes] of Object.entries(DATA.UPGRADES)) {
            for (let i = 0; i < nodes.nodes.length; i++) {
                const node = nodes.nodes[i];
                if (!GS.upgrades.has(node.id) && isNodeUnlocked(node)) {
                    ugSelected = { key, idx: i, node, pos: UG_POS[key][i] };
                    drawUpgradeTree(ctx, w, h);
                    break;
                }
            }
            if (ugSelected)
                break;
        }
    }
    // Create float panel if not exists
    let float = document.getElementById('ug-float');
    if (!float) {
        float = document.createElement('div');
        float.className = 'upgrade-float';
        float.id = 'ug-float';
        canvas.parentElement!.appendChild(float);
    }
    // Show float for auto-selected node
    if (ugSelected)
        refreshUgFloat();
    canvas.onmousemove = function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (w / rect.width) - w / 2 - ugPanX;
        const my = (e.clientY - rect.top) * (h / rect.height) - h / 2 - ugPanY;
        if (ugDragging) {
            ugPanX += (e.clientX - rect.left) - ugDragSX;
            ugPanY += (e.clientY - rect.top) - ugDragSY;
            ugDragSX = e.clientX - rect.left;
            ugDragSY = e.clientY - rect.top;
            drawUpgradeTree(ctx, w, h);
            return;
        }
        const hovered = getUgNodeAt(mx, my);
        if (hovered !== ugHovered) {
            ugHovered = hovered;
            drawUpgradeTree(ctx, w, h);
            refreshUgFloat();
        }
    };
    canvas.onmousedown = function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (w / rect.width) - w / 2 - ugPanX;
        const my = (e.clientY - rect.top) * (h / rect.height) - h / 2 - ugPanY;
        const clicked = getUgNodeAt(mx, my);
        if (clicked) {
            ugSelected = (ugSelected && ugSelected.key === clicked.key && ugSelected.idx === clicked.idx) ? null : clicked;
            ugHovered = ugSelected;
            drawUpgradeTree(ctx, w, h);
            refreshUgFloat();
            return;
        }
        ugSelected = null;
        ugDragging = true;
        ugDragSX = e.clientX - rect.left;
        ugDragSY = e.clientY - rect.top;
        ugDragPX = ugPanX;
        ugDragPY = ugPanY;
        drawUpgradeTree(ctx, w, h);
        refreshUgFloat();
    };
    canvas.onmouseup = function () { ugDragging = false; };
    canvas.onmouseleave = function () { ugDragging = false; ugHovered = null; drawUpgradeTree(ctx, w, h); refreshUgFloat(); };
    // Touch support
    canvas.addEventListener('touchstart', function (e) {
        if (e.touches.length === 1) {
            const t = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const mx = (t.clientX - rect.left) * (w / rect.width) - w / 2 - ugPanX;
            const my = (t.clientY - rect.top) * (h / rect.height) - h / 2 - ugPanY;
            const clicked = getUgNodeAt(mx, my);
            if (clicked) {
                ugSelected = (ugSelected && ugSelected.key === clicked.key && ugSelected.idx === clicked.idx) ? null : clicked;
                drawUpgradeTree(ctx, w, h);
                refreshUgFloat();
                e.preventDefault();
                return;
            }
            ugSelected = null;
            ugDragging = true;
            ugDragSX = t.clientX - rect.left;
            ugDragSY = t.clientY - rect.top;
            drawUpgradeTree(ctx, w, h);
            refreshUgFloat();
        }
    }, { passive: false });
    canvas.addEventListener('touchmove', function (e) {
        if (ugDragging && e.touches.length === 1) {
            const t = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            ugPanX += (t.clientX - rect.left) - ugDragSX;
            ugPanY += (t.clientY - rect.top) - ugDragSY;
            ugDragSX = t.clientX - rect.left;
            ugDragSY = t.clientY - rect.top;
            drawUpgradeTree(ctx, w, h);
            e.preventDefault();
        }
    }, { passive: false });
    canvas.addEventListener('touchend', function () { ugDragging = false; });
}
export function getUpgradeBody(): string {
    ugSelected = null;
    ugHovered = null;
    return `<canvas id="upgrade-canvas"></canvas>
    <div class="upgrade-float" id="ug-float"></div>`;
}
