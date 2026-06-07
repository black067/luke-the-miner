/* ============================================================
   COMBAT-UI.TS — Pause menu, combat cargo inventory,
   evacuation dialogs, and HTML HUD update.
   Does NOT import from combat.ts (no circular deps).
   ============================================================ */

import { DATA } from './data.js';
import { GS, getBallProps, getShipMaxHP, getShipMaxFuel, getCargoSize } from './state.js';
import { showToast, qualityClass, qualityDotClass, typeLabel, qualityBadge, qualityName } from './screens.js';
import { showConfirm } from './screens.js';
import { renderEquipProps } from './inventory.js';
import { C, CombatCargo } from './combat-state.js';

// Module-scoped mutable state
export let _combatInvActive: boolean = false;

// ============================================================
// PAUSE MENU
// ============================================================

export function showPauseMenu(): void {
    const existing = document.getElementById('pause-overlay');
    if (existing) existing.remove();
    const ov = document.createElement('div');
    ov.className = 'pause-overlay';
    ov.id = 'pause-overlay';
    ov.innerHTML = `<div class="window" style="width:220px;">
    <div class="title-bar"><div class="title-bar-text">⏸ 暂停</div></div>
    <div class="window-body" style="display:flex;flex-direction:column;gap:8px;padding:12px;">
      <button data-action="resume-pause">继续游戏</button>
      <button data-action="settings-pause">设置</button>
      <button data-action="exit-to-menu">退出到主菜单</button>
    </div>
  </div>`;
    document.getElementById('crt-content')!.appendChild(ov);
}

export function closePauseMenu(): void {
    const ov = document.getElementById('pause-overlay');
    if (ov) ov.remove();
}

// ============================================================
// COMBAT CARGO INVENTORY
// ============================================================

let _cargoSelectedIdx: number | null = null;

export function openCombatInventory(): void {
    if (_combatInvActive) {
        closeCombatInventory();
        return;
    }
    if (C.state === 'playing') C.state = 'paused';
    _combatInvActive = true;
    _cargoSelectedIdx = null;
    const existing = document.getElementById('combat-inv-overlay');
    if (existing) existing.remove();
    const ov = document.createElement('div');
    ov.className = 'window-overlay';
    ov.id = 'combat-inv-overlay';
    ov.addEventListener('click', function (e) {
        if (e.target === ov) closeCombatInventory();
    });
    const maxSlots = getCargoSize();
    ov.innerHTML = `<div class="window" style="max-width:720px;max-height:85%;">
    <div class="title-bar">
      <div class="title-bar-text">📦 货舱管理 (${CombatCargo.length}/${maxSlots})</div>
      <div class="title-bar-controls">
        <button aria-label="Close" data-action="close-combat-inv"></button>
      </div>
    </div>
    <div class="window-body">
      <div class="inv-layout">
        <div class="inv-left">
          <div class="window" role="tabpanel">
            <div class="cargo-grid" id="cargo-combat-grid">${renderCombatCargoGrid()}</div>
          </div>
        </div>
        <div class="inv-right">
          <fieldset class="ws-detail-box"><legend>详情</legend>
            <div id="ws-detail">${renderCombatCargoDetailContent()}</div>
            <div id="ws-actions" class="detail-actions">${renderCombatCargoDetailActions()}</div>
          </fieldset>
        </div>
      </div>
    </div>
  </div>`;
    document.getElementById('crt-content')!.appendChild(ov);
}

export function renderCombatCargoGrid(): string {
    const maxSlots = getCargoSize();
    let html = '';
    for (let i = 0; i < maxSlots; i++) {
        const item = CombatCargo[i];
        if (item) {
            const qCls = qualityClass(item.quality || 'common');
            const sel = _cargoSelectedIdx === i ? ' selected' : '';
            html += `<div class="cargo-cell${sel}" data-action="select-cargo" data-action-arg="${i}">
        <div class="cell-quality-dot ${qualityDotClass(item.quality || 'common')}"></div>
        <div class="cell-icon">${item.icon || '📦'}</div>
        <div class="cell-name ${qCls}">${item.name}</div>
        ${(item.qty || 1) > 1 ? `<div class="cell-qty">${item.qty}</div>` : ''}
      </div>`;
        } else {
            html += '<div class="cargo-cell empty"></div>';
        }
    }
    return html;
}

export function renderCombatCargoDetailContent(): string {
    if (_cargoSelectedIdx === null || !CombatCargo[_cargoSelectedIdx])
        return '<div class="iv-detail empty">从左侧选择一个物品查看详情</div>';
    const item = CombatCargo[_cargoSelectedIdx];
    const qCls = qualityClass(item.quality || 'common');
    let propsHtml = renderEquipProps(item);
    if (!propsHtml && item.desc) propsHtml = `<p>${item.desc}</p>`;
    return `
    <div class="detail-header">
      <div class="detail-icon">${item.icon || '📦'}</div>
      <div class="detail-info">
        <div class="detail-name ${qCls}">${item.name}</div>
        <span class="detail-type">${typeLabel(item.type)}</span>
        ${qualityBadge(item.quality || 'common')}
      </div>
    </div>
    ${propsHtml}
    <div class="detail-stat-list">
      <div class="field-row"><label>数量</label><span>${item.qty || 1}</span></div>
    </div>`;
}

export function renderCombatCargoDetailActions(): string {
    if (_cargoSelectedIdx === null || !CombatCargo[_cargoSelectedIdx]) return '';
    return '<button data-action="discard-cargo">🗑 丢弃</button>';
}

export function selectCargoItem(idx: number): void {
    _cargoSelectedIdx = (_cargoSelectedIdx === idx) ? null : idx;
    refreshCombatCargoUI();
}

export function discardSelectedCargoItem(): void {
    if (_cargoSelectedIdx === null) return;
    const item = CombatCargo[_cargoSelectedIdx];
    if (!item) return;
    if (item.quality === 'epic' || item.quality === 'legend' || item.quality === 'mythic') {
        showConfirm(`确定要丢弃 ${item.name}（${qualityName(item.quality || 'common')}品质）吗？`).then(confirmed => {
            if (!confirmed) return;
            doDiscard();
        });
        return;
    }
    doDiscard();

    function doDiscard(): void {
        CombatCargo.splice(_cargoSelectedIdx!, 1);
        _cargoSelectedIdx = null;
        showToast(`已丢弃 ${item!.name}`);
        refreshCombatCargoUI();
    }
}

export function refreshCombatCargoUI(): void {
    const grid = document.getElementById('cargo-combat-grid');
    if (grid) grid.innerHTML = renderCombatCargoGrid();
    const detail = document.getElementById('ws-detail');
    if (detail) detail.innerHTML = renderCombatCargoDetailContent();
    const actions = document.getElementById('ws-actions');
    if (actions) actions.innerHTML = renderCombatCargoDetailActions();
    // Update title bar count
    const tb = document.querySelector('#combat-inv-overlay .title-bar-text');
    if (tb) tb.textContent = `📦 货舱管理 (${CombatCargo.length}/${getCargoSize()})`;
}

export function closeCombatInventory(): void {
    _combatInvActive = false;
    _cargoSelectedIdx = null;
    const ov = document.getElementById('combat-inv-overlay');
    if (ov) ov.remove();
    if (C.state === 'paused' && !document.getElementById('pause-overlay'))
        C.state = 'playing';
}

// ============================================================
// EVACUATION DIALOGS
// ============================================================

export function showEarlyEvacConfirm(goal: number): void {
    const existing = document.getElementById('evac-confirm-overlay');
    if (existing) existing.remove();
    const ov = document.createElement('div');
    ov.className = 'evac-confirm-overlay';
    ov.id = 'evac-confirm-overlay';
    ov.innerHTML = `<div class="window" style="width:280px">
    <div class="title-bar">
      <div class="title-bar-text">⚠️ 早退确认</div>
      <div class="title-bar-controls">
        <button aria-label="Close" data-action="close-early-evac"></button>
      </div>
    </div>
    <div class="window-body">
      <p>特产尚未收集齐全（${C.stats.resourceCollected}/${goal}），确定要早退撤离吗？</p>
      <p style="font-size:10px;color:#555;">早退将被处以旷工罚款。</p>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:10px">
        <button data-action="confirm-early-evac">确认早退</button>
        <button data-action="close-early-evac">取消</button>
      </div>
    </div>
  </div>`;
    document.getElementById('crt-content')!.appendChild(ov);
}

export function closeEarlyEvacConfirm(): void {
    const ov = document.getElementById('evac-confirm-overlay');
    if (ov) ov.remove();
    if (C.state === 'paused') C.state = 'playing';
}

// ============================================================
// HTML HUD UPDATE
// ============================================================

export function updateHtmlHUD(): void {
    if (!document.getElementById('combat-hud-top')) return;
    const s = C.ship;
    const maxHp = getShipMaxHP(), maxFuel = getShipMaxFuel();
    const ball = getBallProps();
    const area = DATA.AREAS.find(a => a.id === C.areaId);
    const goal = area ? area.resourceGoal : 30;
    const totalEnemies = C.enemies.length + (C.wave.allSpawned ? 0 : C.wave.spawnQueue.length);
    // HP
    const hpFill = document.getElementById('hud-hp-fill');
    if (hpFill) hpFill.style.width = (s.hp / maxHp * 100) + '%';
    const hpVal = document.getElementById('hud-hp-val');
    if (hpVal) hpVal.textContent = Math.ceil(s.hp) + '/' + maxHp;
    // Fuel
    const fuelFill = document.getElementById('hud-fuel-fill');
    if (fuelFill) fuelFill.style.width = (s.fuel / maxFuel * 100) + '%';
    const fuelVal = document.getElementById('hud-fuel-val');
    if (fuelVal) fuelVal.textContent = Math.ceil(s.fuel) + '%';
    // Wave
    const wave = document.getElementById('hud-wave');
    if (wave) wave.textContent = C.wave.name + ' ' + (C.wave.index + 1) + '/' + DATA.WAVES.length;
    const waveSub = document.getElementById('hud-wave-sub');
    if (waveSub) waveSub.textContent = 'ENEMIES: ' + totalEnemies;
    // Resource
    const res = document.getElementById('hud-resource');
    if (res) res.textContent = (area ? area.specialResource : '资源') + ': ' + C.stats.resourceCollected + '/' + goal;
    // Ammo
    const ammo = document.getElementById('hud-ammo');
    if (ammo) {
        let dots = '';
        for (let i = 0; i < ball.magazine; i++) {
            dots += '<span class="hud-ammo-dot ' + (i < C.ammo ? 'filled' : 'empty') + '"></span>';
        }
        ammo.innerHTML = dots;
    }
    // Quick bar
    const qb = document.getElementById('hud-quick-bar');
    if (qb) {
        let html = '';
        for (let i = 0; i < GS.quickBar.length; i++) {
            const slot = GS.quickBar[i];
            const itemDef = DATA.ITEMS.find(it => it.id === slot.itemId);
            if (itemDef && slot.qty > 0) {
                html += '<div class="hud-quick-slot" title="' + itemDef.desc + ' [' + (i + 1) + ']">' +
                    itemDef.icon + '<span class="slot-qty">' + slot.qty + '</span></div>';
            } else {
                html += '<div class="hud-quick-slot empty">-</div>';
            }
        }
        qb.innerHTML = html;
    }
}
