import { Link } from 'react-router-dom'
import { viewerPath } from '../app/paths'
import { stripPdfExtension } from '../lib/display/filename'
import type { ScoreId, ScoreMeta } from '../lib/db'
import { groupAndSortScores } from '../lib/library/classify'

type Props = {
  scores: ScoreMeta[]
  deleteMode?: boolean
  selectedIds?: Set<ScoreId>
  onToggleSelected?: (id: ScoreId) => void
  onAddToSetlist?: (id: ScoreId) => void
}

export function ScoreList({
  scores,
  deleteMode = false,
  selectedIds = new Set(),
  onToggleSelected,
  onAddToSetlist,
}: Props) {
  const groups = groupAndSortScores(scores)

  return (
    <div className="score-list">
      {groups.map(({ category, label, items }) => (
        <section key={category} className="panel-section" aria-label={label}>
          <h3 className="category-pill">{label}</h3>
          <ul className="panel-list">
            {items.map((score) => {
              const displayName = stripPdfExtension(score.filename)

              return (
                <li
                  key={score.id}
                  className={
                    deleteMode ? 'list-row list-row--delete' : 'list-row'
                  }
                >
                  {deleteMode ? (
                    <>
                      <input
                        type="checkbox"
                        className="list-row__checkbox"
                        checked={selectedIds.has(score.id)}
                        aria-label={`${score.filename}を選択`}
                        onChange={() => onToggleSelected?.(score.id)}
                      />
                      <span className="list-row__name">{displayName}</span>
                    </>
                  ) : (
                    <>
                      <Link
                        to={viewerPath(score.id)}
                        className="list-row__title"
                        title={score.filename}
                      >
                        {displayName}
                      </Link>
                      {onAddToSetlist ? (
                        <button
                          type="button"
                          className="btn-icon btn-icon--primary"
                          aria-label={`${score.filename}をセットリストに追加`}
                          onClick={() => onAddToSetlist(score.id)}
                        >
                          +
                        </button>
                      ) : null}
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
