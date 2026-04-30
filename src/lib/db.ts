import { type DBSchema, type IDBPDatabase, openDB } from 'idb'

export type ScoreId = string

export type ScoreRecord = {
  id: ScoreId
  filename: string
  createdAt: number
  updatedAt: number
  pageCount: number
  pdfBytes: ArrayBuffer
}

export type AnnotationPoint = {
  x: number
  y: number
  t: number
}

export type Stroke = {
  tool: 'pen' | 'eraser'
  color?: 'black' | 'red' | 'blue'
  width: 1 | 2 | 3
  points: AnnotationPoint[]
}

export type PageAnnotationRecord = {
  scoreId: ScoreId
  page: number
  updatedAt: number
  viewportW: number
  viewportH: number
  strokes: Stroke[]
}

type ScoreShelfDbSchema = DBSchema & {
  scores: {
    key: ScoreId
    value: ScoreRecord
    indexes: { 'by-updatedAt': number }
  }
  annotations: {
    key: [ScoreId, number]
    value: PageAnnotationRecord
    indexes: { 'by-scoreId': ScoreId }
  }
}

let dbPromise: Promise<IDBPDatabase<ScoreShelfDbSchema>> | null = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<ScoreShelfDbSchema>('score-shelf', 1, {
      upgrade(db) {
        const scores = db.createObjectStore('scores', { keyPath: 'id' })
        scores.createIndex('by-updatedAt', 'updatedAt')

        const annotations = db.createObjectStore('annotations', {
          keyPath: ['scoreId', 'page'],
        })
        annotations.createIndex('by-scoreId', 'scoreId')
      },
    })
  }
  return dbPromise
}

export async function listScores(): Promise<ScoreRecord[]> {
  const db = await getDb()
  return db.getAllFromIndex('scores', 'by-updatedAt')
}

export async function putScore(score: ScoreRecord): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('scores', 'readwrite')
  await tx.store.put(score)
  await tx.done
}

export async function getScore(id: ScoreId): Promise<ScoreRecord | undefined> {
  const db = await getDb()
  return db.get('scores', id)
}

export async function deleteScore(id: ScoreId): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['scores', 'annotations'], 'readwrite')

  await tx.objectStore('scores').delete(id)

  const annotationsStore = tx.objectStore('annotations')
  const byScoreId = annotationsStore.index('by-scoreId')

  let cursor = await byScoreId.openKeyCursor(id)
  while (cursor) {
    await annotationsStore.delete(cursor.primaryKey)
    cursor = await cursor.continue()
  }

  await tx.done
}

export async function getPageAnnotations(
  scoreId: ScoreId,
  page: number,
): Promise<PageAnnotationRecord | undefined> {
  const db = await getDb()
  return db.get('annotations', [scoreId, page])
}

export async function putPageAnnotations(
  record: PageAnnotationRecord,
): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('annotations', 'readwrite')
  await tx.store.put(record)
  await tx.done
}
