/* ============================================================
   COMBAT-MATH.TS — Pure math/geometry helpers (zero dependencies)
   ============================================================ */

export function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
export function len(vx: number, vy: number): number {
    return Math.hypot(vx, vy);
}
export function norm(vx: number, vy: number): { x: number; y: number } {
    const l = len(vx, vy);
    return l ? { x: vx / l, y: vy / l } : { x: 0, y: 0 };
}
export function rand(min: number, max: number): number {
    return min + Math.random() * (max - min);
}
export function randInt(min: number, max: number): number {
    return Math.floor(rand(min, max + 1));
}
export function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v;
}
export function rayRectHit(
    ox: number, oy: number, dx: number, dy: number,
    rect: { left: number; right: number; top: number; bottom: number }
): { t: number; edge: string } | null {
    let tEnter = -Infinity, tExit = Infinity, enterEdge = '';
    if (Math.abs(dx) > 1e-9) {
        let t1 = (rect.left - ox) / dx, t2 = (rect.right - ox) / dx;
        if (t1 > t2) [t1, t2] = [t2, t1];
        if (t1 > tEnter) { tEnter = t1; enterEdge = dx > 0 ? 'left' : 'right'; }
        if (t2 < tExit) tExit = t2;
    } else if (ox < rect.left || ox > rect.right) return null;
    if (Math.abs(dy) > 1e-9) {
        let t1 = (rect.top - oy) / dy, t2 = (rect.bottom - oy) / dy;
        if (t1 > t2) [t1, t2] = [t2, t1];
        if (t1 > tEnter) { tEnter = t1; enterEdge = dy > 0 ? 'top' : 'bottom'; }
        if (t2 < tExit) tExit = t2;
    } else if (oy < rect.top || oy > rect.bottom) return null;
    if (tEnter < tExit && tExit > 0)
        return tEnter > 1e-9 ? { t: tEnter, edge: enterEdge } : { t: tExit, edge: '' };
    return null;
}
export function reflectOnEdge(vx: number, vy: number, edge: string): { vx: number; vy: number } {
    if (edge === 'left' || edge === 'right') return { vx: -vx, vy };
    if (edge === 'top' || edge === 'bottom') return { vx, vy: -vy };
    return { vx, vy };
}
export function rayCircleHit(
    ox: number, oy: number, dx: number, dy: number,
    cx: number, cy: number, r: number
): number {
    const fx = ox - cx, fy = oy - cy;
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return Infinity;
    const sqrtDisc = Math.sqrt(disc);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);
    if (t1 > 1e-9) return t1;
    if (t2 > 1e-9) return t2;
    return Infinity;
}
