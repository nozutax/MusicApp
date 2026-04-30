import { describe, expect, it } from 'vitest'
import { fromNormalized, toNormalized } from './normalize'

describe('normalize', () => {
  it('round-trips a point across viewport sizes', () => {
    const base = { w: 600, h: 800 }
    const view = { w: 1200, h: 1600 }
    const p = { x: 150, y: 200 }
    const n = toNormalized(p, base)
    const p2 = fromNormalized(n, view)
    expect(p2.x).toBeCloseTo(300, 6)
    expect(p2.y).toBeCloseTo(400, 6)
  })
})
