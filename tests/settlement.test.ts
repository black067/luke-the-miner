/* ============================================================
   SETTLEMENT.TEST.TS — Unit tests for settlement pure functions
   ============================================================ */

import { describe, it, expect } from 'vitest';
import {
    PENALTY_RESCUE_FEE,
    PENALTY_REPAIR_FEE,
    PENALTY_TOW_FEE,
    PENALTY_FINE_PER_SHORTFALL,
    KILL_BONUS_VICTORY,
    KILL_BONUS_PARTIAL,
    calcVictorySettlement,
    calcDefeatPenalty,
    calcBreakdownSettlement,
    calcEarlyLeaveSettlement,
} from '../src/settlement.js';

// ============================================================
// CONSTANTS
// ============================================================
describe('Settlement Constants', () => {
    it('should have correct penalty constants', () => {
        expect(PENALTY_RESCUE_FEE).toBe(500);
        expect(PENALTY_REPAIR_FEE).toBe(200);
        expect(PENALTY_TOW_FEE).toBe(300);
        expect(PENALTY_FINE_PER_SHORTFALL).toBe(30);
    });

    it('should have correct kill bonus constants', () => {
        expect(KILL_BONUS_VICTORY).toBe(40);
        expect(KILL_BONUS_PARTIAL).toBe(30);
    });
});

// ============================================================
// calcVictorySettlement
// ============================================================
describe('calcVictorySettlement', () => {
    it('should calculate zero-values correctly', () => {
        const result = calcVictorySettlement(0, 0, 0.5);
        expect(result.lootValue).toBe(0);
        expect(result.debtCut).toBe(0);
        expect(result.net).toBe(0);
    });

    it('should calculate loot value from kills and ore', () => {
        const result = calcVictorySettlement(5, 200, 0.5);
        expect(result.lootValue).toBe(200 + 5 * 40); // 400
        expect(result.lootValue).toBe(400);
    });

    it('should calculate debt cut as floor(lootValue * debtRatio)', () => {
        const result = calcVictorySettlement(3, 100, 0.5);
        // lootValue = 100 + 3*40 = 220, debtCut = floor(220*0.5) = 110
        expect(result.debtCut).toBe(110);
    });

    it('should handle odd lootValue with debtRatio', () => {
        const result = calcVictorySettlement(1, 1, 0.5);
        // lootValue = 1+40=41, debtCut = floor(41*0.5) = 20, net=21
        expect(result.debtCut).toBe(20);
        expect(result.net).toBe(21);
    });

    it('should calculate net as lootValue - debtCut', () => {
        const result = calcVictorySettlement(10, 500, 0.5);
        // lootValue = 500 + 400 = 900, debtCut = 450, net = 450
        expect(result.net).toBe(450);
        expect(result.net).toBe(result.lootValue - result.debtCut);
    });

    it('should work with 100% debt ratio', () => {
        const result = calcVictorySettlement(5, 100, 1.0);
        // lootValue = 100 + 200 = 300, debtCut = 300
        expect(result.debtCut).toBe(300);
        expect(result.net).toBe(0);
    });
});

// ============================================================
// calcDefeatPenalty
// ============================================================
describe('calcDefeatPenalty', () => {
    it('should return total penalty of 700', () => {
        const result = calcDefeatPenalty();
        expect(result.totalPenalty).toBe(700);
    });

    it('should return rescue and repair penalties', () => {
        const result = calcDefeatPenalty();
        expect(result.penalties).toHaveLength(2);
        expect(result.penalties[0]).toEqual({ label: '救援费', amount: 500 });
        expect(result.penalties[1]).toEqual({ label: '修理费', amount: 200 });
    });

    it('should be deterministic (no randomness)', () => {
        const r1 = calcDefeatPenalty();
        const r2 = calcDefeatPenalty();
        expect(r1).toEqual(r2);
    });
});

// ============================================================
// calcBreakdownSettlement
// ============================================================
describe('calcBreakdownSettlement', () => {
    it('should calculate breakdown with zero values', () => {
        const result = calcBreakdownSettlement(0, 0, 0.5);
        expect(result.lootValue).toBe(0);
        expect(result.debtCut).toBe(0);
        expect(result.totalPenalty).toBe(300);
        expect(result.net).toBe(-300);
    });

    it('should use KILL_BONUS_VICTORY for kills', () => {
        const result = calcBreakdownSettlement(5, 100, 0.5);
        // lootValue = 100 + 200 = 300, debtCut = 150, totalPenalty = 300, net = 300-150-300 = -150
        expect(result.lootValue).toBe(300);
        expect(result.debtCut).toBe(150);
        expect(result.net).toBe(-150);
    });

    it('should have one tow fee penalty', () => {
        const result = calcBreakdownSettlement(0, 0, 0.5);
        expect(result.penalties).toHaveLength(1);
        expect(result.penalties[0]).toEqual({ label: '拖车费', amount: 300 });
    });

    it('should handle large values correctly', () => {
        const result = calcBreakdownSettlement(100, 10000, 0.5);
        // lootValue = 10000 + 4000 = 14000, debtCut = 7000, penalty = 300, net = 14000-7000-300 = 6700
        expect(result.lootValue).toBe(14000);
        expect(result.debtCut).toBe(7000);
        expect(result.totalPenalty).toBe(300);
        expect(result.net).toBe(6700);
    });
});

// ============================================================
// calcEarlyLeaveSettlement
// ============================================================
describe('calcEarlyLeaveSettlement', () => {
    it('should detect shortfall correctly', () => {
        const result = calcEarlyLeaveSettlement(0, 0, 0.5, 30, 15);
        expect(result.shortfall).toBe(15);
    });

    it('should have zero shortfall when collected >= goal', () => {
        const result = calcEarlyLeaveSettlement(0, 0, 0.5, 30, 40);
        expect(result.shortfall).toBe(0);
    });

    it('should calculate fine as shortfall * 30', () => {
        const result = calcEarlyLeaveSettlement(0, 0, 0.5, 50, 20);
        // shortfall = 30, fine = 30 * 30 = 900
        expect(result.totalPenalty).toBe(900);
    });

    it('should have no penalty when goal is met', () => {
        const result = calcEarlyLeaveSettlement(5, 200, 0.5, 30, 30);
        expect(result.totalPenalty).toBe(0);
        expect(result.penalties).toHaveLength(0);
    });

    it('should use KILL_BONUS_PARTIAL (30) not KILL_BONUS_VICTORY (40)', () => {
        const result = calcEarlyLeaveSettlement(10, 0, 0.5, 30, 30);
        // lootValue = 0 + 10*30 = 300, not 0 + 10*40 = 400
        expect(result.lootValue).toBe(300);
    });

    it('should calculate net correctly with penalty', () => {
        const result = calcEarlyLeaveSettlement(5, 100, 0.5, 30, 10);
        // lootValue = 100 + 150 = 250, debtCut = 125, fine = (30-10)*30 = 600
        // net = 250 - 125 - 600 = -475
        expect(result.lootValue).toBe(250);
        expect(result.debtCut).toBe(125);
        expect(result.totalPenalty).toBe(600);
        expect(result.net).toBe(-475);
    });
});
