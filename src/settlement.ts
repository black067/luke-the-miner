/* ============================================================
   SETTLEMENT.TS — Combat settlement screen
   ============================================================ */

import { showScreen, updateTaskbar } from './screens.js';
import { GS, dispatch, addToWarehouse } from './state.js';
import { DATA } from './data.js';
import { SFX } from './audio.js';
import { div, span } from './dom.js';
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

    // Cache DOM refs (guaranteed to exist after screen switch)
    const settleTitle = document.getElementById('settle-title')!;
    const settleKills = document.getElementById('settle-kills')!;
    const settleHits = document.getElementById('settle-hits')!;
    const settleAcc = document.getElementById('settle-acc')!;
    const settleLoot = document.getElementById('settle-loot')!;
    const settleDebt = document.getElementById('settle-debt')!;
    const settleNet = document.getElementById('settle-net')!;
    const settleRemaining = document.getElementById('settle-remaining')!;
    const penaltiesEl = document.getElementById('settle-penalties')!;

    // Title
    const titleMap: Record<string, string> = {
        victory: '✅ 下班！',
        defeat: '💀 坠机',
        breakdown: '🚗 抛锚',
    };
    const titleText = titleMap[result] || '😰 早退';
    settleTitle.textContent = titleText;

    // Stats
    settleKills.textContent = String(stats.killed || 0);
    settleHits.textContent = String(stats.hits || 0);
    settleAcc.textContent =
        stats.shots > 0 ? Math.round((stats.hits / stats.shots) * 100) + '%' : '--';

    if (result === 'victory') {
        const s = calcVictorySettlement(
            stats.killed || 0,
            stats.oreValue || 0,
            DATA.COMBAT.DEBT_RATIO,
        );
        settleLoot.textContent = '+₿ ' + s.lootValue.toLocaleString();
        settleDebt.textContent = '-₿ ' + s.debtCut.toLocaleString();
        settleNet.textContent = '+₿ ' + s.net.toLocaleString();
        penaltiesEl.innerHTML = '';

        dispatch({ type: 'SET_DEBT', value: Math.max(0, GS.debt - s.debtCut) });
        dispatch({ type: 'ADD_BITCOIN', amount: s.net });
        dispatch({ type: 'SET_COMBAT_RESULT', result: 'victory' });
        SFX.play('victory');
    } else {
        const penalties: Array<{ label: string; amount: number; detail?: string }> = [];
        let lootValue: number;
        let debtCut: number;
        let totalPenalty: number;

        if (result === 'defeat') {
            const p = calcDefeatPenalty();
            penalties.push(...p.penalties);
            lootValue = 0;
            debtCut = 0;
            totalPenalty = p.totalPenalty;
            settleLoot.textContent = '+₿ 0';
            settleDebt.textContent = '-₿ 0 (货舱物品已丢失)';
        } else if (result === 'breakdown') {
            const s = calcBreakdownSettlement(
                stats.killed || 0,
                stats.oreValue || 0,
                DATA.COMBAT.DEBT_RATIO,
            );
            penalties.push(...s.penalties);
            lootValue = s.lootValue;
            debtCut = s.debtCut;
            totalPenalty = s.totalPenalty;
        } else {
            // 早退
            const area = DATA.AREAS.find(a => a.id === areaId);
            const resourceGoal = area ? area.resourceGoal : 30;
            const collected = stats.resourceCollected || 0;
            const s = calcEarlyLeaveSettlement(
                stats.killed || 0,
                stats.oreValue || 0,
                DATA.COMBAT.DEBT_RATIO,
                resourceGoal,
                collected,
            );
            penalties.push(...s.penalties);
            lootValue = s.lootValue;
            debtCut = s.debtCut;
            totalPenalty = s.totalPenalty;
        }

        // Show loot/debt for non-defeat cases
        if (result !== 'defeat') {
            settleLoot.textContent = '+₿ ' + lootValue.toLocaleString();
            settleDebt.textContent = '-₿ ' + debtCut.toLocaleString();
        }

        // Render penalty rows
        penaltiesEl.textContent = ''; // Clear
        for (const p of penalties) {
            // Main row: label + amount
            const row = div({ className: 'field-row' });
            const labelEl = document.createElement('label');
            labelEl.textContent = p.label;
            row.appendChild(labelEl);
            const valueSpan = span({ textContent: `-₿ ${p.amount.toLocaleString()}` });
            row.appendChild(valueSpan);
            penaltiesEl.appendChild(row);
            // Detail line: indented, smaller, with line-wrap
            if (p.detail) {
                const detailRow = div({ style: 'color:#555;margin:-2px 0 4px 0;padding-left:2em;line-height:1.4;' });
                detailRow.textContent = p.detail;
                penaltiesEl.appendChild(detailRow);
            }
        }

        // Apply: net = loot - debt - penalties
        const net = lootValue - debtCut - totalPenalty;
        dispatch({ type: 'SET_DEBT', value: Math.max(0, GS.debt - debtCut) });
        dispatch({ type: 'SET_BITCOIN', value: Math.max(0, GS.bitcoin + net) });
        settleNet.textContent =
            (net >= 0 ? '+₿ ' : '-₿ ') + Math.abs(net).toLocaleString();
        dispatch({ type: 'SET_COMBAT_RESULT', result });
        SFX.play('defeat');
    }

    settleRemaining.textContent = '¥ ' + GS.debt.toLocaleString();

    // After first combat, unlock radio
    if (GS.firstCombat) {
        dispatch({ type: 'SET_FIRST_COMBAT', value: false });
        dispatch({ type: 'UNLOCK_RADIO' });
    }
    updateTaskbar();
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
