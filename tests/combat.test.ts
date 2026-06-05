/* ============================================================
   COMBAT.TEST.TS — Unit tests for combat pure functions
   ============================================================ */

import { describe, it, expect } from 'vitest';
import {
    dist,
    len,
    norm,
    clamp,
    rayRectHit,
    reflectOnEdge,
    rayCircleHit,
} from '../src/combat.js';

// ============================================================
// dist — Euclidean distance between two points
// ============================================================
describe('dist', () => {
    it('should return 0 for same point', () => {
        expect(dist({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
        expect(dist({ x: 5, y: 3 }, { x: 5, y: 3 })).toBe(0);
    });

    it('should calculate horizontal distance', () => {
        expect(dist({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3);
        expect(dist({ x: 2, y: 5 }, { x: 6, y: 5 })).toBe(4);
    });

    it('should calculate vertical distance', () => {
        expect(dist({ x: 0, y: 0 }, { x: 0, y: 4 })).toBe(4);
        expect(dist({ x: 3, y: 1 }, { x: 3, y: 6 })).toBe(5);
    });

    it('should calculate 3-4-5 triangle distance', () => {
        expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
        expect(dist({ x: 1, y: 1 }, { x: 4, y: 5 })).toBe(5);
    });

    it('should handle negative coordinates', () => {
        expect(dist({ x: -1, y: -1 }, { x: 2, y: 3 })).toBe(5);
    });

    it('should be symmetric', () => {
        const a = { x: 3, y: 7 };
        const b = { x: 10, y: 2 };
        expect(dist(a, b)).toBe(dist(b, a));
    });
});

// ============================================================
// len — Vector length (magnitude)
// ============================================================
describe('len', () => {
    it('should return 0 for zero vector', () => {
        expect(len(0, 0)).toBe(0);
    });

    it('should return absolute value for 1D vector', () => {
        expect(len(3, 0)).toBe(3);
        expect(len(0, 4)).toBe(4);
        expect(len(-3, 0)).toBe(3);
    });

    it('should calculate 3-4-5 vector length', () => {
        expect(len(3, 4)).toBe(5);
        expect(len(-3, 4)).toBe(5);
        expect(len(3, -4)).toBe(5);
    });

    it('should handle large values', () => {
        const v = len(300, 400);
        expect(v).toBe(500);
    });
});

// ============================================================
// norm — Normalize vector to unit length
// ============================================================
describe('norm', () => {
    it('should return zero vector for zero input', () => {
        expect(norm(0, 0)).toEqual({ x: 0, y: 0 });
    });

    it('should normalize 1D vector', () => {
        expect(norm(5, 0)).toEqual({ x: 1, y: 0 });
        expect(norm(0, 7)).toEqual({ x: 0, y: 1 });
        expect(norm(-3, 0)).toEqual({ x: -1, y: 0 });
    });

    it('should normalize 3-4-5 vector', () => {
        const result = norm(3, 4);
        expect(result.x).toBeCloseTo(0.6, 5);
        expect(result.y).toBeCloseTo(0.8, 5);
    });

    it('should produce unit-length vectors', () => {
        const cases = [[1, 1], [2, 7], [5, 3], [10, 1]];
        for (const [x, y] of cases) {
            const n = norm(x, y);
            expect(len(n.x, n.y)).toBeCloseTo(1, 5);
        }
    });

    it('should maintain direction for negative components', () => {
        const n = norm(-3, -4);
        expect(n.x).toBeCloseTo(-0.6, 5);
        expect(n.y).toBeCloseTo(-0.8, 5);
    });
});

// ============================================================
// clamp — Clamp value between lo and hi
// ============================================================
describe('clamp', () => {
    it('should return value when within range', () => {
        expect(clamp(5, 0, 10)).toBe(5);
        expect(clamp(0, 0, 10)).toBe(0);
        expect(clamp(10, 0, 10)).toBe(10);
    });

    it('should clamp to lower bound', () => {
        expect(clamp(-5, 0, 10)).toBe(0);
        expect(clamp(-100, -50, 50)).toBe(-50);
    });

    it('should clamp to upper bound', () => {
        expect(clamp(15, 0, 10)).toBe(10);
        expect(clamp(200, 0, 100)).toBe(100);
    });

    it('should handle negative ranges', () => {
        expect(clamp(0, -10, -5)).toBe(-5);
        expect(clamp(-20, -10, -5)).toBe(-10);
    });

    it('should handle lo > hi gracefully', () => {
        // When lo > hi, clamp treats lo as lower bound, hi as upper bound.
        // clamp(3, 10, 0): 3 < 10 → returns 10
        expect(clamp(3, 10, 0)).toBe(10);
        // clamp(15, 10, 0): 15 < 10 is false, 15 > 0 is true → returns 0
        expect(clamp(15, 10, 0)).toBe(0);
    });
});

// ============================================================
// rayRectHit — Ray vs AABB intersection
// ============================================================
describe('rayRectHit', () => {
    const rect = { left: 10, right: 110, top: 10, bottom: 110 };

    it('should hit when ray goes right through center', () => {
        const hit = rayRectHit(0, 60, 1, 0, rect);
        expect(hit).not.toBeNull();
        expect(hit!.t).toBeCloseTo(10, 3); // 10 px to left wall
        expect(hit!.edge).toBe('left');
    });

    it('should hit when ray goes left through center', () => {
        const hit = rayRectHit(120, 60, -1, 0, rect);
        expect(hit).not.toBeNull();
        expect(hit!.t).toBeCloseTo(10, 3);
        expect(hit!.edge).toBe('right');
    });

    it('should hit when ray goes down through center', () => {
        const hit = rayRectHit(60, 0, 0, 1, rect);
        expect(hit).not.toBeNull();
        expect(hit!.t).toBeCloseTo(10, 3);
        expect(hit!.edge).toBe('top');
    });

    it('should hit when ray goes up through center', () => {
        const hit = rayRectHit(60, 120, 0, -1, rect);
        expect(hit).not.toBeNull();
        expect(hit!.t).toBeCloseTo(10, 3);
        expect(hit!.edge).toBe('bottom');
    });

it('should handle zero-direction ray inside rect', () => {
    // Zero-direction ray inside rect returns {t: Infinity, edge: ''}
    const hit = rayRectHit(60, 60, 0, 0, rect);
    expect(hit).not.toBeNull();
    expect(hit!.t).toBe(Infinity);
    expect(hit!.edge).toBe('');
    });

    it('should return null when ray goes away from rect', () => {
        const hit = rayRectHit(0, 60, -1, 0, rect);
        expect(hit).toBeNull();
    });

    it('should return null when ray misses rect', () => {
        const hit = rayRectHit(0, 200, 1, 0, rect);
        expect(hit).toBeNull();
    });

    it('should hit corner with diagonal ray', () => {
        const hit = rayRectHit(0, 0, 1, 1, rect);
        expect(hit).not.toBeNull();
        expect(hit!.t).toBeGreaterThan(0);
    });

    it('should detect edge correctly for diagonal hit on top-left', () => {
        const hit = rayRectHit(0, 0, 1, 1, rect);
        expect(hit).not.toBeNull();
        // First intersection could be left or top depending on exact geometry
        expect(['left', 'top']).toContain(hit!.edge);
    });
});

// ============================================================
// reflectOnEdge — Reflect velocity vector off an edge
// ============================================================
describe('reflectOnEdge', () => {
    it('should reflect vx on left edge', () => {
        expect(reflectOnEdge(3, 2, 'left')).toEqual({ vx: -3, vy: 2 });
    });

    it('should reflect vx on right edge', () => {
        expect(reflectOnEdge(3, 2, 'right')).toEqual({ vx: -3, vy: 2 });
    });

    it('should reflect vy on top edge', () => {
        expect(reflectOnEdge(3, 2, 'top')).toEqual({ vx: 3, vy: -2 });
    });

    it('should reflect vy on bottom edge', () => {
        expect(reflectOnEdge(3, 2, 'bottom')).toEqual({ vx: 3, vy: -2 });
    });

    it('should not change on unknown edge', () => {
        expect(reflectOnEdge(3, 2, 'corner')).toEqual({ vx: 3, vy: 2 });
    });

    it('should handle negative velocities', () => {
        expect(reflectOnEdge(-5, -3, 'left')).toEqual({ vx: 5, vy: -3 });
        expect(reflectOnEdge(-5, -3, 'top')).toEqual({ vx: -5, vy: 3 });
    });

    it('should handle zero velocities', () => {
        // -1 * 0 produces -0 in JS; use toBeCloseTo to normalize sign
        const r1 = reflectOnEdge(0, 5, 'left');
        expect(r1.vx).toBeCloseTo(0);
        expect(r1.vy).toBe(5);
        const r2 = reflectOnEdge(5, 0, 'top');
        expect(r2.vx).toBe(5);
        expect(r2.vy).toBeCloseTo(0);
    });
});

// ============================================================
// rayCircleHit — Ray vs circle intersection
// ============================================================
describe('rayCircleHit', () => {
    const cx = 100, cy = 100, r = 20;

    it('should hit when ray goes straight through center', () => {
        const t = rayCircleHit(50, 100, 1, 0, cx, cy, r);
        expect(t).toBe(30); // 50 → 80 (enters at 80, center at 100, radius 20)
    });

    it('should hit when ray goes straight down through center', () => {
        const t = rayCircleHit(100, 50, 0, 1, cx, cy, r);
        expect(t).toBe(30);
    });

    it('should return Infinity when ray misses', () => {
        const t = rayCircleHit(50, 50, 1, 0, cx, cy, r);
        expect(t).toBe(Infinity);
    });

    it('should hit tangent point', () => {
        // Ray at y=80, going right, circle at (100,100) with r=20
        const t = rayCircleHit(50, 80, 1, 0, cx, cy, r);
        expect(t).toBeLessThan(Infinity);
        expect(t).toBeGreaterThan(0);
    });

    it('should handle ray starting inside circle', () => {
        const t = rayCircleHit(100, 100, 1, 0, cx, cy, r);
        expect(t).toBeGreaterThan(0); // Exits at edge
    });

    it('should return Infinity for zero-direction ray outside', () => {
        const t = rayCircleHit(50, 100, 0, 0, cx, cy, r);
        expect(t).toBe(Infinity);
    });

    it('should handle ray going away from circle', () => {
        const t = rayCircleHit(50, 100, -1, 0, cx, cy, r);
        expect(t).toBe(Infinity);
    });
});
