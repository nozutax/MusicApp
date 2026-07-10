import type { ScoreId, SetlistEntry, SetlistEntryId } from '../db'

export function addEntry(
  entries: SetlistEntry[],
  scoreId: ScoreId,
  createId: () => SetlistEntryId = () => crypto.randomUUID(),
): SetlistEntry[] {
  return [...entries, { id: createId(), scoreId }]
}

export function removeEntry(
  entries: SetlistEntry[],
  entryId: SetlistEntryId,
): SetlistEntry[] {
  if (!entries.some((e) => e.id === entryId)) return entries
  return entries.filter((e) => e.id !== entryId)
}

export function moveEntry(
  entries: SetlistEntry[],
  entryId: SetlistEntryId,
  direction: 'up' | 'down',
): SetlistEntry[] {
  const index = entries.findIndex((e) => e.id === entryId)
  if (index === -1) return entries

  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= entries.length) return entries

  const next = [...entries]
  const [item] = next.splice(index, 1)
  next.splice(targetIndex, 0, item)
  return next
}

export function pruneMissingScores(
  entries: SetlistEntry[],
  scoreIds: Iterable<ScoreId>,
): SetlistEntry[] {
  const valid = new Set(scoreIds)
  return entries.filter((e) => valid.has(e.scoreId))
}
