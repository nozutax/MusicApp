import type { NormPt, Pt, Size } from './types'

export function toNormalized(p: Pt, base: Size): NormPt {
  return { nx: p.x / base.w, ny: p.y / base.h }
}

export function fromNormalized(n: NormPt, view: Size): Pt {
  return { x: n.nx * view.w, y: n.ny * view.h }
}
