import { describe, expect, it } from 'vitest'
import { classifyHorizontalSwipe } from './gesture'

describe('classifyHorizontalSwipe', () => {
  it('returns next on sufficient left swipe', () => {
    expect(
      classifyHorizontalSwipe({ dx: -140, dy: 10 }, { minDx: 120, maxDy: 60 }),
    ).toBe('next')
  })

  it('returns prev on sufficient right swipe', () => {
    expect(
      classifyHorizontalSwipe({ dx: 140, dy: 10 }, { minDx: 120, maxDy: 60 }),
    ).toBe('prev')
  })

  it('returns none when vertical movement too large', () => {
    expect(
      classifyHorizontalSwipe({ dx: -200, dy: 120 }, { minDx: 120, maxDy: 60 }),
    ).toBe('none')
  })
})
