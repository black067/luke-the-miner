/* ============================================================
   SETTLEMENT.TS — Combat settlement screen
   ============================================================ */

import { showScreen, updateTaskbar } from './screens.js';
import { GS, dispatch, addToWarehouse } from './state.js';
import { DATA } from './data.js';
import { SFX } from './audio.js';
import type { CombatStats } from './types.js';

// ============================================================
// EXPORTED SETTLEMENT CONSTANTS
// ============================================================
export const PENALTY_RESCUE_FEE = 500;
export const PENALTY_REPAIR_FEE = 200;
export const PENALTY_TOW_FEE = 300;
export const PENALTY_FINE_PER_SHORTFALL = 30;
export const KILL_BONUS_VICTORY = 40;
export const KILL_BONUS_PARTIAL = 30;

// ============================================================
// PURE SETTLEMENT CALCULATION FUNCTIONS
// (no DOM, no GS mutation, no side effects)
// ============================================================

export function calcVictorySettlement(
    kills: number,
    oreValue: number,
    debtRatio: number,
): { lootValue: number; debtCut: number; net: number } {
    const lootValue = oreValue + kills * KILL_BONUS_VICTORY;
    const debtCut = Math.floor(lootValue * debtRatio);
    const net = lootValue - debtCut;
    return { lootValue, debtCut, net };
}

export function calcDefeatPenalty(): {
    totalPenalty: number;
    penalties: Array<{ label: string; amount: number }>;
} {
    const penalties = [
        { label: '救援费', amount: PENALTY_RESCUE_FEE },
        { label: '修理费', amount: PENALTY_REPAIR_FEE },
    ];
    const totalPenalty = PENALTY_RESCUE_FEE + PENALTY_REPAIR_FEE;
    return { totalPenalty, penalties };
}

export function calcBreakdownSettlement(
    kills: number,
    oreValue: number,
    debtRatio: number,
): {
    lootValue: number;
    debtCut: number;
    totalPenalty: number;
    penalties: Array<{ label: string; amount: number }>;
    net: number;
} {
    const penalties = [
        { label: '拖车费', amount: PENALTY_TOW_FEE },
    ];
    const lootValue = oreValue + kills * KILL_BONUS_VICTORY;
    const debtCut = Math.floor(lootValue * debtRatio);
    const totalPenalty = PENALTY_TOW_FEE;
    const net = lootValue - debtCut - totalPenalty;
    return { lootValue, debtCut, totalPenalty, penalties, net };
}

export function calcEarlyLeaveSettlement(
    kills: number,
    oreValue: number,
    debtRatio: number,
    resourceGoal: number,
    collected: number,
): {
    lootValue: number;
    debtCut: number;
    totalPenalty: number;
    penalties: Array<{ label: string; amount: number; detail?: string }>;
    net: number;
    shortfall: number;
} {
    const shortfall = Math.max(0, resourceGoal - collected);
    const fine = shortfall * PENALTY_FINE_PER_SHORTFALL;
    const penalties: Array<{ label: string; amount: number; detail?: string }> = [];
    if (fine > 0) {
        penalties.push({ label: '旷工罚款', amount: fine, detail: `特产差额: ${shortfall}` });
    }
    const lootValue = oreValue + kills * KILL_BONUS_PARTIAL;
    const debtCut = Math.floor(lootValue * debtRatio);
    const totalPenalty = fine;
    const net = lootValue - debtCut - totalPenalty;
    return { lootValue, debtCut, totalPenalty, penalties, net, shortfall };
}

// ============================================================
// SETTLEMENT SCREEN
// ============================================================

export function showSettlement(result: string, stats: CombatStats, areaId: string): void {
    showScreen('settlement-screen');

    // ── DOM refs ──
    const titleBarText = document.getElementById('settle-titlebar-text')!;
    const banner = document.getElementById('settle-banner')!;
    const subtitle = document.getElementById('settle-subtitle')!;
    const killsEl = document.getElementById('settle-kills')!;
    const shotsEl = document.getElementById('settle-shots')!;
    const accEl = document.getElementById('settle-acc')!;
    const comboEl = document.getElementById('settle-combo')!;
    const oreLabelEl = document.getElementById('settle-ore-label')!;
    const oreEl = document.getElementById('settle-ore')!;
    const ledgerEl = document.getElementById('settle-ledger')!;
    const lootFieldset = document.getElementById('settle-loot-fieldset')!;
    const lootSummary = document.getElementById('settle-loot-summary')!;
    const balanceEl = document.getElementById('settle-balance')!;

    // ── Area info ──
    const area = DATA.AREAS.find(a => a.id === areaId);
    const areaName = area ? area.name : areaId;
    titleBarText.textContent = `作业结算 · ${areaName}`;

    // ── Title banner & subtitle ──
    const bannerConfig: Record<string, { text: string; bg: string; color: string; sub: string }> = {
        victory: {
            text: '清场撤离 · 圆满下班',
            bg: '#1a4a1a', color: '#5f5',
            sub: '所有波次敌人被清空。',
        },
        defeat: {
            text: '机体坠毁 · 全军覆没',
            bg: '#4a1a1a', color: '#f55',
            sub: '机体严重损毁，货舱物品已丢失。',
        },
        breakdown: {
            text: '中途抛锚 · 呼叫拖车',
            bg: '#4a3a1a', color: '#fa0',
            sub: '机体故障，被迫中断作业。',
        },
    };
    const cfg = bannerConfig[result] || {
        text: '提前撤离 · 旷工早退',
        bg: '#3a3a1a', color: '#ff0',
        sub: `特产未收集齐全，提前撤离。`,
    };
    banner.textContent = cfg.text;
    banner.setAttribute('style', `text-align:center;font-size:14px;font-weight:bold;padding:6px 0;background:${cfg.bg};color:${cfg.color};margin-bottom:6px;`);
    subtitle.textContent = cfg.sub;

    // ── Stats ledger ──
    const kills = stats.killed || 0;
    const shots = stats.shots || 0;
    const hits = stats.hits || 0;
    const acc = shots > 0 ? Math.round((hits / shots) * 100) + '%' : '--';
    const combo = 0; // comboCount lives on combat state, not passed into stats currently
    const oreCollected = stats.resourceCollected || 0;
    const resourceGoal = area ? area.resourceGoal : 30;

    killsEl.textContent = String(kills);
    shotsEl.textContent = String(shots);
    accEl.textContent = acc;
    comboEl.textContent = String(combo);
    oreLabelEl.textContent = area ? area.specialResource : '矿石';
    oreEl.textContent = `${oreCollected} / ${resourceGoal}`;

    // ── Income/expense ledger ──
    ledgerEl.innerHTML = '';

    if (result === 'victory') {
        const s = calcVictorySettlement(kills, stats.oreValue || 0, DATA.COMBAT.DEBT_RATIO);
        addLedgerRow(ledgerEl, `${(area ? area.specialResource : '矿石')} ×${oreCollected} 自动出售`, `+₿${s.lootValue.toLocaleString()}`, '');
        addLedgerRow(ledgerEl, `强制还债 (${Math.round(DATA.COMBAT.DEBT_RATIO * 100)}%)`, `−₿${s.debtCut.toLocaleString()}`, 'bad');
        addLedgerRow(ledgerEl, '本次到手', `+₿${s.net.toLocaleString()}`, 'total');

        dispatch({ type: 'SET_DEBT', value: Math.max(0, GS.debt - s.debtCut) });
        dispatch({ type: 'ADD_BITCOIN', amount: s.net });
        dispatch({ type: 'SET_COMBAT_RESULT', result: 'victory' });
        SFX.play('victory');
    } else {
        let lootValue = 0;
        let debtCut = 0;
        let totalPenalty = 0;
        const penalties: Array<{ label: string; amount: number; detail?: string }> = [];

        if (result === 'defeat') {
            const p = calcDefeatPenalty();
            penalties.push(...p.penalties);
            totalPenalty = p.totalPenalty;
        } else if (result === 'breakdown') {
            const s = calcBreakdownSettlement(kills, stats.oreValue || 0, DATA.COMBAT.DEBT_RATIO);
            penalties.push(...s.penalties);
            lootValue = s.lootValue;
            debtCut = s.debtCut;
            totalPenalty = s.totalPenalty;
        } else {
            // early leave
            const collected = stats.resourceCollected || 0;
            const s = calcEarlyLeaveSettlement(kills, stats.oreValue || 0, DATA.COMBAT.DEBT_RATIO, resourceGoal, collected);
            penalties.push(...s.penalties);
            lootValue = s.lootValue;
            debtCut = s.debtCut;
            totalPenalty = s.totalPenalty;
        }

        // Loot sale row (only when > 0)
        if (lootValue > 0) {
            addLedgerRow(ledgerEl, `${(area ? area.specialResource : '矿石')} ×${oreCollected} 自动出售`, `+₿${lootValue.toLocaleString()}`, '');
        }
        // Debt cut row (only when > 0)
        if (debtCut > 0) {
            addLedgerRow(ledgerEl, `强制还债 (${Math.round(DATA.COMBAT.DEBT_RATIO * 100)}%)`, `−₿${debtCut.toLocaleString()}`, 'bad');
        }
        // Penalty rows
        for (const p of penalties) {
            const label = p.detail ? `${p.label} (${p.detail})` : p.label;
            addLedgerRow(ledgerEl, label, `−₿${p.amount.toLocaleString()}`, 'bad');
        }

        const net = lootValue - debtCut - totalPenalty;
        addLedgerRow(ledgerEl, '本次到手', `${net >= 0 ? '+' : ''}₿${net.toLocaleString()}`, 'total');

        dispatch({ type: 'SET_DEBT', value: Math.max(0, GS.debt - debtCut) });
        dispatch({ type: 'SET_BITCOIN', value: Math.max(0, GS.bitcoin + net) });
        dispatch({ type: 'SET_COMBAT_RESULT', result });
        SFX.play('defeat');
    }

    // ── Loot summary ──
    const cargo = stats.cargo || [];
    if (cargo.length > 0) {
        lootFieldset.style.display = '';
        lootSummary.innerHTML = '';
        for (const item of cargo) {
            const itemAny = item as Record<string, unknown>;
            const name = String(itemAny.name || itemAny.id || '?');
            const color = String(itemAny.color || '#b56bff');
            const span = document.createElement('span');
            span.textContent = name;
            span.style.color = color;
            span.style.marginRight = '8px';
            lootSummary.appendChild(span);
        }
    } else {
        lootFieldset.style.display = 'none';
    }

    // ── Balance ──
    balanceEl.textContent = `余额：₿${GS.bitcoin.toLocaleString()} · 💵${GS.cash.toLocaleString()}`;

    // ── After first combat, unlock radio ──
    if (GS.firstCombat) {
        dispatch({ type: 'SET_FIRST_COMBAT', value: false });
        dispatch({ type: 'UNLOCK_RADIO' });
    }
    updateTaskbar();
}

/** Append a ledger row: <li style="..."><span>LABEL</span><span>VALUE</span></li> */
function addLedgerRow(parent: HTMLElement, label: string, value: string, cls: string): void {
    const li = document.createElement('li');
    if (cls === 'bad') {
        li.style.color = '#c00';
    } else if (cls === 'total') {
        li.style.borderTop = '1px solid #808080';
        li.style.paddingTop = '2px';
        li.style.marginTop = '2px';
        li.style.fontWeight = 'bold';
    }
    const spanLabel = document.createElement('span');
    spanLabel.textContent = label;
    const spanValue = document.createElement('span');
    spanValue.textContent = value;
    li.appendChild(spanLabel);
    li.appendChild(spanValue);
    parent.appendChild(li);
}
export function returnToHangar(): void {
    // Transfer combat cargo to warehouse
    // Dynamic import to avoid circular dependency
    import('./combat.js').then(m => {
        const cargo = m.CombatCargo;
        if (cargo && cargo.length > 0) {
            for (const item of cargo) {
                addToWarehouse({ ...item, qty: item.qty || 1 });
            }
            cargo.length = 0;
        }
    });
    // Reset selected area
    dispatch({ type: 'SET_SELECTED_AREA', area: 'mine' });
    import('./desktop.js').then(d => d.showDesktop());
    updateTaskbar();
}
