import { Link } from 'react-router-dom'
import { viewerPath } from '../app/paths'
import { stripPdfExtension } from '../lib/display/filename'
import type { ScoreId, ScoreMeta, SetlistEntry, SetlistEntryId } from '../lib/db'

type Props = {
  entries: SetlistEntry[]
  scoresById: Map<ScoreId, ScoreMeta>
  onRemove: (entryId: SetlistEntryId) => void
}

export function SetlistPanel({
  entries,
  scoresById,
  onRemove,
}: Props) {
  return (
    <div>
      <div className="panel-header">
        <h2>セットリスト</h2>
        <span className="panel-badge">{entries.length}曲</span>
      </div>

      {entries.length === 0 ? (
        <p className="panel-empty">ライブラリから曲を追加してください。</p>
      ) : (
        <ol className="panel-list">
          {entries.map((entry, index) => {
            const score = scoresById.get(entry.scoreId)
            const displayName = score
              ? stripPdfExtension(score.filename)
              : '（削除済み）'

            return (
              <li key={entry.id} className="list-row list-row--setlist">
                <span className="list-row__index" aria-hidden>
                  {index + 1}
                </span>
                {score ? (
                  <Link
                    to={viewerPath(entry.scoreId)}
                    className="list-row__title"
                    title={score.filename}
                  >
                    {displayName}
                  </Link>
                ) : (
                  <span className="list-row__name list-row__name--missing">
                    {displayName}
                  </span>
                )}
                <button
                  type="button"
                  className="btn-icon btn-icon--danger"
                  aria-label={`${score?.filename ?? '曲'}をセットリストから削除`}
                  onClick={() => onRemove(entry.id)}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
