import { Link } from 'react-router-dom'
import { viewerPath } from '../app/paths'
import type { ScoreId, ScoreMeta, SetlistEntry, SetlistEntryId } from '../lib/db'

type Props = {
  entries: SetlistEntry[]
  scoresById: Map<ScoreId, ScoreMeta>
  onRemove: (entryId: SetlistEntryId) => void
  onMoveUp: (entryId: SetlistEntryId) => void
  onMoveDown: (entryId: SetlistEntryId) => void
}

export function SetlistPanel({
  entries,
  scoresById,
  onRemove,
  onMoveUp,
  onMoveDown,
}: Props) {
  return (
    <div>
      <h2>セットリスト</h2>
      <p>
        ライブの曲順に合わせて曲を並べます。（{entries.length}曲）
      </p>

      {entries.length === 0 ? (
        <p style={{ marginTop: 16 }}>
          ライブラリから曲を追加してください。
        </p>
      ) : (
        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '12px 0 0',
          }}
        >
          {entries.map((entry, index) => {
            const score = scoresById.get(entry.scoreId)
            const isFirst = index === 0
            const isLast = index === entries.length - 1

            return (
              <li
                key={entry.id}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 10,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    minWidth: 24,
                    color: '#555',
                    fontSize: 14,
                  }}
                  aria-hidden
                >
                  {index + 1}.
                </span>
                {score ? (
                  <Link to={viewerPath(entry.scoreId)}>{score.filename}</Link>
                ) : (
                  <span style={{ color: '#888' }}>（削除済み）</span>
                )}
                <button
                  type="button"
                  disabled={isFirst}
                  aria-label={`${score?.filename ?? '曲'}を上へ`}
                  onClick={() => onMoveUp(entry.id)}
                >
                  上へ
                </button>
                <button
                  type="button"
                  disabled={isLast}
                  aria-label={`${score?.filename ?? '曲'}を下へ`}
                  onClick={() => onMoveDown(entry.id)}
                >
                  下へ
                </button>
                <button
                  type="button"
                  aria-label={`${score?.filename ?? '曲'}をセットリストから削除`}
                  onClick={() => onRemove(entry.id)}
                >
                  削除
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
