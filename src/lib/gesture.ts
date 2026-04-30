export function classifyHorizontalSwipe(
  delta: { dx: number; dy: number },
  cfg: { minDx: number; maxDy: number },
): 'prev' | 'next' | 'none' {
  if (Math.abs(delta.dy) > cfg.maxDy) return 'none'
  if (delta.dx >= cfg.minDx) return 'prev'
  if (delta.dx <= -cfg.minDx) return 'next'
  return 'none'
}
