import { describe, expect, it } from 'vitest'
import type { Stroke } from '../db'
import { StrokeHistory } from './strokeHistory'

function penStroke(): Stroke {
  return {
    tool: 'pen',
    color: 'black',
    width: 2,
    points: [
      { x: 0, y: 0, t: 1 },
      { x: 1, y: 1, t: 2 },
    ],
  }
}

describe('StrokeHistory', () => {
  it('undo/redo restores stroke lists', () => {
    const h = new StrokeHistory()
    h.reset([])
    h.commit([penStroke()])
    h.commit([penStroke(), penStroke()])

    expect(h.canUndo()).toBe(true)
    const u1 = h.undo()
    expect(u1?.length).toBe(1)
    const u2 = h.undo()
    expect(u2?.length).toBe(0)

    expect(h.canRedo()).toBe(true)
    const r1 = h.redo()
    expect(r1?.length).toBe(1)
    const r2 = h.redo()
    expect(r2?.length).toBe(2)
    expect(h.canRedo()).toBe(false)
  })

  it('commit after undo drops forward snapshots', () => {
    const h = new StrokeHistory()
    h.reset([])
    h.commit([penStroke()])
    h.commit([penStroke(), penStroke()])
    h.undo()

    h.commit([penStroke(), penStroke()])
    expect(h.redo()).toBe(null)
    expect(h.canRedo()).toBe(false)
  })
})
