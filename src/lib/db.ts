import { type DBSchema, type IDBPDatabase, openDB } from 'idb'

export type ScoreId = string

export type ScoreMeta = {
  id: ScoreId
  filename: string
  createdAt: number
  updatedAt: number
  pageCount: number
}

export type PdfRecord = {
  scoreId: ScoreId
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
    value: ScoreMeta
    indexes: { 'by-updatedAt': number }
  }
  pdfs: {
    key: ScoreId
    value: PdfRecord
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
    dbPromise = openDB<ScoreShelfDbSchema>('score-shelf', 2, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          const scores = db.createObjectStore('scores', { keyPath: 'id' })
          scores.createIndex('by-updatedAt', 'updatedAt')

          const annotations = db.createObjectStore('annotations', {
            keyPath: ['scoreId', 'page'],
          })
          annotations.createIndex('by-scoreId', 'scoreId')
        }

        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('pdfs')) {
            db.createObjectStore('pdfs', { keyPath: 'scoreId' })
          }

          // Migrate v1 scores { ...meta, pdfBytes } -> meta-only + pdfs store.
          if (oldVersion >= 1) {
            const scoresStore = tx.objectStore('scores')
            const pdfsStore = tx.objectStore('pdfs')

            const existing = await scoresStore.getAll()
            for (const row of existing as Array<any>) {
              if (row?.id && row?.pdfBytes) {
                await pdfsStore.put({ scoreId: row.id, pdfBytes: row.pdfBytes })
              }

              const { pdfBytes: _pdfBytes, ...meta } = row ?? {}
              if (meta?.id) {
                await scoresStore.put(meta)
              }
            }
          }
        }
      },
    })
  }
  return dbPromise
}

export async function listScores(): Promise<ScoreMeta[]> {
  const db = await getDb()
  const tx = db.transaction('scores', 'readonly')
  const index = tx.store.index('by-updatedAt')

  const rows: ScoreMeta[] = []
  let cursor = await index.openCursor(null, 'prev')
  while (cursor) {
    rows.push(cursor.value)
    cursor = await cursor.continue()
  }

  await tx.done
  return rows
}

export async function putScore(meta: ScoreMeta): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('scores', 'readwrite')
  await tx.store.put(meta)
  await tx.done
}

export async function putPdfBytes(
  scoreId: ScoreId,
  pdfBytes: ArrayBuffer,
): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('pdfs', 'readwrite')
  await tx.store.put({ scoreId, pdfBytes })
  await tx.done
}



export async function putImportedScore(meta: ScoreMeta, pdfBytes: ArrayBuffer): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['scores','pdfs'], 'readwrite');
  await tx.objectStore('scores').put(meta);
  await tx.objectStore('pdfs').put({ scoreId: meta.id, pdfBytes });
  await tx.done;
}
export async function getScoreMeta(
  id: ScoreId,
): Promise<ScoreMeta | undefined> {
  const db = await getDb()
  return db.get('scores', id)
}

export async function getPdfBytes(
  scoreId: ScoreId,
): Promise<ArrayBuffer | undefined> {
  const db = await getDb()
  const row = await db.get('pdfs', scoreId)
  return row?.pdfBytes
}

export async function deleteScore(id: ScoreId): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['scores', 'pdfs', 'annotations'], 'readwrite')

  await tx.objectStore('scores').delete(id)
  await tx.objectStore('pdfs').delete(id)

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
