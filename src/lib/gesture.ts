export function classifyHorizontalSwipe(
  delta: { dx: number; dy: number },
  cfg: { minDx: number; maxDy: number },
): 'prev' | 'next' | 'none' {
  if (Math.abs(delta.dy) > cfg.maxDy) return 'none'
  if (delta.dx >= cfg.minDx) return 'prev'
  if (delta.dx <= -cfg.minDx) return 'next'
  return 'none'
}

/** 左30% / 中央40% / 右30%（境界は中央に含める: x は [leftEdge, rightEdge] が無効） */
export function classifyTapZone(
  x: number,
  width: number,
  ratio = 0.3,
): 'prev' | 'next' | 'none' {
  if (width <= 0) return 'none'
  const leftEdge = width * ratio
  const rightEdge = width * (1 - ratio)
  if (x < leftEdge) return 'prev'
  if (x > rightEdge) return 'next'
  return 'none'
}
