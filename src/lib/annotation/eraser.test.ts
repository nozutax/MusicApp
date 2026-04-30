import { describe, expect, it } from 'vitest'
import type { Stroke } from '../db'
import { hitStroke, strokeHitByCircle } from './eraser'

describe('hitStroke', () => {
  it('hits when a point is within radius', () => {
    const stroke = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ]
    expect(hitStroke(stroke, { x: 18, y: 18 }, 4)).toBe(true)
  })
})

describe('strokeHitByCircle', () => {
  it('hits vertex', () => {
    const s: Stroke = {
      tool: 'pen',
      color: 'black',
      width: 2,
      points: [
        { x: 0, y: 0, t: 0 },
        { x: 10, y: 0, t: 1 },
      ],
    }
    expect(strokeHitByCircle(s, 10, 0, 1)).toBe(true)
  })

  it('hits near segment', () => {
    const s: Stroke = {
      tool: 'pen',
      color: 'black',
      width: 2,
      points: [
        { x: 0, y: 0, t: 0 },
        { x: 10, y: 0, t: 1 },
      ],
    }
    expect(strokeHitByCircle(s, 5, 0.5, 1)).toBe(true)
  })
})
