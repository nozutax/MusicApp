import type { Stroke } from '../db'

function cloneStrokes(strokes: Stroke[]): Stroke[] {
  return structuredClone(strokes)
}

/** Snapshot-based undo/redo for the stroke list of a single page. */
export class StrokeHistory {
  private snapshots: Stroke[][] = [[]]
  private index = 0

  reset(strokes: Stroke[]) {
    this.snapshots = [cloneStrokes(strokes)]
    this.index = 0
  }

  /** Record a new committed state (e.g. after adding a stroke). Clears redo branch. */
  commit(current: Stroke[]) {
    const copy = cloneStrokes(current)
    this.snapshots = this.snapshots.slice(0, this.index + 1)
    this.snapshots.push(copy)
    this.index = this.snapshots.length - 1
  }

  undo(): Stroke[] | null {
    if (this.index <= 0) return null
    this.index--
    return cloneStrokes(this.snapshots[this.index])
  }

  redo(): Stroke[] | null {
    if (this.index >= this.snapshots.length - 1) return null
    this.index++
    return cloneStrokes(this.snapshots[this.index])
  }

  canUndo(): boolean {
    return this.index > 0
  }

  canRedo(): boolean {
    return this.index < this.snapshots.length - 1
  }
}
