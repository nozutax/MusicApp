import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FileImportButton } from '../components/FileImportButton'
import { ScoreList } from '../components/ScoreList'
import { SetlistPanel } from '../components/SetlistPanel'
import {
  deleteScore,
  getActiveSetlist,
  listScores,
  saveActiveSetlist,
  type ScoreId,
  type ScoreMeta,
  type SetlistEntry,
  type SetlistEntryId,
} from '../lib/db'
import {
  addEntry,
  moveEntry,
  pruneMissingScores,
  removeEntry,
} from '../lib/setlist/ops'

export function HomePage() {
  const location = useLocation()
  const [scores, setScores] = useState<ScoreMeta[]>([])
  const [setlistEntries, setSetlistEntries] = useState<SetlistEntry[]>([])
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<ScoreId>>(() => new Set())
  const mountedRef = useRef(false)
  const setlistEntriesRef = useRef<SetlistEntry[]>([])

  const scoresById = useMemo(
    () => new Map(scores.map((s) => [s.id, s])),
    [scores],
  )

  const refresh = useCallback(async () => {
    const [rows, entries] = await Promise.all([listScores(), getActiveSetlist()])
    const pruned = pruneMissingScores(entries, rows.map((r) => r.id))
    if (pruned.length !== entries.length) {
      await saveActiveSetlist(pruned)
    }
    if (mountedRef.current) {
      setScores(rows)
      setSetlistEntries(pruned)
      setlistEntriesRef.current = pruned
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void refresh()
    return () => {
      mountedRef.current = false
    }
  }, [refresh, location.key])

  async function persistSetlist(
    updater: (prev: SetlistEntry[]) => SetlistEntry[],
  ) {
    const next = updater(setlistEntriesRef.current)
    setlistEntriesRef.current = next
    setSetlistEntries(next)
    await saveActiveSetlist(next)
  }

  function enterDeleteMode() {
    setDeleteMode(true)
  }

  function exitDeleteMode() {
    setDeleteMode(false)
    setSelectedIds(new Set())
  }

  function toggleSelected(id: ScoreId) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function handleBulkDelete() {
    const count = selectedIds.size
    if (count === 0) return

    if (
      !confirm(
        `選択した${count}件の楽曲と保存された注釈を削除します。よろしいですか？`,
      )
    ) {
      return
    }

    for (const id of selectedIds) {
      await deleteScore(id)
    }

    exitDeleteMode()
    await refresh()
  }

  async function handleAddToSetlist(scoreId: ScoreId) {
    await persistSetlist((prev) => addEntry(prev, scoreId))
  }

  async function handleRemoveFromSetlist(entryId: SetlistEntryId) {
    await persistSetlist((prev) => removeEntry(prev, entryId))
  }

  async function handleMoveUp(entryId: SetlistEntryId) {
    await persistSetlist((prev) => moveEntry(prev, entryId, 'up'))
  }

  async function handleMoveDown(entryId: SetlistEntryId) {
    await persistSetlist((prev) => moveEntry(prev, entryId, 'down'))
  }

  return (
    <div className="home-layout">
      <section className="home-panel home-panel--library">
        <h2>ライブラリ</h2>
        <p>
          PDFを追加して曲を管理します。一覧のファイル名を開くと閲覧・手書きメモができます。
        </p>

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <FileImportButton
            onImported={async () => {
              await refresh()
            }}
          />
          {!deleteMode ? (
            <button
              type="button"
              disabled={scores.length === 0}
              onClick={enterDeleteMode}
            >
              削除モード
            </button>
          ) : (
            <>
              <button type="button" onClick={exitDeleteMode}>
                キャンセル
              </button>
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={() => void handleBulkDelete()}
              >
                {selectedIds.size}件を削除
              </button>
            </>
          )}
        </div>

        {scores.length === 0 ? (
          <p style={{ marginTop: 16 }}>
            まだ曲がありません。「PDF追加」から画譜を取り込んでください。
          </p>
        ) : (
          <ScoreList
            scores={scores}
            deleteMode={deleteMode}
            selectedIds={selectedIds}
            onToggleSelected={toggleSelected}
            onAddToSetlist={deleteMode ? undefined : handleAddToSetlist}
          />
        )}
      </section>

      <section className="home-panel home-panel--setlist">
        <SetlistPanel
          entries={setlistEntries}
          scoresById={scoresById}
          onRemove={(id) => void handleRemoveFromSetlist(id)}
          onMoveUp={(id) => void handleMoveUp(id)}
          onMoveDown={(id) => void handleMoveDown(id)}
        />
      </section>
    </div>
  )
}
