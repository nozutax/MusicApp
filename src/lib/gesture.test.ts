import { describe, expect, it } from 'vitest'
import { classifyHorizontalSwipe, classifyTapZone } from './gesture'

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

describe('classifyTapZone', () => {
  it('returns prev when tap is within left 30%', () => {
    expect(classifyTapZone(50, 1000, 0.3)).toBe('prev')
    expect(classifyTapZone(299, 1000, 0.3)).toBe('prev')
  })

  it('returns next when tap is within right 30%', () => {
    expect(classifyTapZone(701, 1000, 0.3)).toBe('next')
    expect(classifyTapZone(999, 1000, 0.3)).toBe('next')
  })

  it('returns none when tap is in the center 40%', () => {
    expect(classifyTapZone(300, 1000, 0.3)).toBe('none')
    expect(classifyTapZone(500, 1000, 0.3)).toBe('none')
    expect(classifyTapZone(700, 1000, 0.3)).toBe('none')
  })
})
