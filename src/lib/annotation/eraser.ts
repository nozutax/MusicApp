import type { Stroke } from '../db'

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

function distPointToSegmentSq(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const vx = x2 - x1
  const vy = y2 - y1
  const wx = px - x1
  const wy = py - y1
  const c1 = vx * wx + vy * wy
  if (c1 <= 0) return distSq(px, py, x1, y1)
  const c2 = vx * vx + vy * vy
  if (c2 <= c1) return distSq(px, py, x2, y2)
  const t = c1 / c2
  const projx = x1 + t * vx
  const projy = y1 + t * vy
  return distSq(px, py, projx, projy)
}

/** Hit test in **reference** (PDF scale-1) coordinates. */
export function strokeHitByCircle(
  stroke: Stroke,
  cx: number,
  cy: number,
  r: number,
): boolean {
  if (stroke.tool !== 'pen') return false
  const r2 = r * r
  const pts = stroke.points
  for (let i = 0; i < pts.length; i++) {
    if (distSq(cx, cy, pts[i].x, pts[i].y) <= r2) return true
    if (i > 0) {
      const d2 = distPointToSegmentSq(
        cx,
        cy,
        pts[i - 1].x,
        pts[i - 1].y,
        pts[i].x,
        pts[i].y,
      )
      if (d2 <= r2) return true
    }
  }
  return false
}

/** Legacy-style helper for tests: points only (vertices), no segments. */
export function hitStroke(
  points: { x: number; y: number }[],
  p: { x: number; y: number },
  r: number,
): boolean {
  const r2 = r * r
  for (const q of points) {
    const dx = q.x - p.x
    const dy = q.y - p.y
    if (dx * dx + dy * dy <= r2) return true
  }
  return false
}
