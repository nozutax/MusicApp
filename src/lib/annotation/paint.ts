import type { Stroke } from '../db'
import { refPointToCanvas } from './coords'
import { strokeToCssColor, widthToCanvasPx } from './draw'

function paintStrokePath(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  ref: { w: number; h: number },
  disp: { w: number; h: number },
) {
  if (stroke.tool !== 'pen') return
  if (stroke.points.length === 0) return

  const lineW = widthToCanvasPx(stroke.width)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = strokeToCssColor(stroke.color)
  ctx.lineWidth = lineW

  if (stroke.points.length === 1) {
    const p = refPointToCanvas(
      stroke.points[0].x,
      stroke.points[0].y,
      ref,
      disp,
    )
    const r = Math.max(1, lineW / 2)
    ctx.beginPath()
    ctx.fillStyle = strokeToCssColor(stroke.color)
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  ctx.beginPath()
  const p0 = refPointToCanvas(
    stroke.points[0].x,
    stroke.points[0].y,
    ref,
    disp,
  )
  ctx.moveTo(p0.x, p0.y)
  for (let i = 1; i < stroke.points.length; i++) {
    const p = refPointToCanvas(
      stroke.points[i].x,
      stroke.points[i].y,
      ref,
      disp,
    )
    ctx.lineTo(p.x, p.y)
  }
  ctx.stroke()
}

/** Clears the annotation canvas and draws all committed strokes plus optional in-progress stroke. */
export function paintAnnotationLayer(
  ctx: CanvasRenderingContext2D,
  disp: { w: number; h: number },
  ref: { w: number; h: number },
  strokes: Stroke[],
  active: Stroke | null,
) {
  ctx.clearRect(0, 0, disp.w, disp.h)
  for (const s of strokes) {
    if (s.tool !== 'pen') continue
    if (s.points.length < 1) continue
    paintStrokePath(ctx, s, ref, disp)
  }
  if (active && active.tool === 'pen' && active.points.length > 0) {
    paintStrokePath(ctx, active, ref, disp)
  }
}
