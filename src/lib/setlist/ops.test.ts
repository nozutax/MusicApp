import { describe, expect, it } from 'vitest'
import type { SetlistEntry } from '../db'
import {
  addEntry,
  moveEntry,
  pruneMissingScores,
  removeEntry,
} from './ops'

function entry(id: string, scoreId: string): SetlistEntry {
  return { id, scoreId }
}

describe('addEntry', () => {
  it('appends a new entry at the end', () => {
    const result = addEntry([], 'score-a', () => 'entry-1')
    expect(result).toEqual([{ id: 'entry-1', scoreId: 'score-a' }])
  })

  it('allows duplicate scoreIds', () => {
    const initial = [entry('e1', 'score-a')]
    const result = addEntry(initial, 'score-a', () => 'e2')
    expect(result).toHaveLength(2)
    expect(result[1]).toEqual({ id: 'e2', scoreId: 'score-a' })
  })
})

describe('removeEntry', () => {
  it('removes the matching entry', () => {
    const initial = [entry('e1', 'a'), entry('e2', 'b')]
    expect(removeEntry(initial, 'e1')).toEqual([entry('e2', 'b')])
  })

  it('returns unchanged when entry not found', () => {
    const initial = [entry('e1', 'a')]
    expect(removeEntry(initial, 'missing')).toBe(initial)
  })
})

describe('moveEntry', () => {
  const initial = [entry('e1', 'a'), entry('e2', 'b'), entry('e3', 'c')]

  it('moves entry up', () => {
    expect(moveEntry(initial, 'e2', 'up')).toEqual([
      entry('e2', 'b'),
      entry('e1', 'a'),
      entry('e3', 'c'),
    ])
  })

  it('moves entry down', () => {
    expect(moveEntry(initial, 'e2', 'down')).toEqual([
      entry('e1', 'a'),
      entry('e3', 'c'),
      entry('e2', 'b'),
    ])
  })

  it('no-ops at the top when moving up', () => {
    expect(moveEntry(initial, 'e1', 'up')).toBe(initial)
  })

  it('no-ops at the bottom when moving down', () => {
    expect(moveEntry(initial, 'e3', 'down')).toBe(initial)
  })
})

describe('pruneMissingScores', () => {
  it('removes entries whose scoreId is not in the library', () => {
    const initial = [entry('e1', 'a'), entry('e2', 'b'), entry('e3', 'c')]
    expect(pruneMissingScores(initial, ['a', 'c'])).toEqual([
      entry('e1', 'a'),
      entry('e3', 'c'),
    ])
  })
})
