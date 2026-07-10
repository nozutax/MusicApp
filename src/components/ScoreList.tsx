import { Link } from 'react-router-dom'
import { viewerPath } from '../app/paths'
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
    <div style={{ marginTop: 12 }}>
      {groups.map(({ category, label, items }) => (
        <section
          key={category}
          style={{ marginBottom: 16 }}
          aria-label={label}
        >
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: 14,
              color: '#555',
              borderBottom: '1px solid #e5e5e9',
              paddingBottom: 4,
            }}
          >
            {label}
          </h3>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
            }}
          >
            {items.map((score) => (
              <li
                key={score.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  marginBottom: 10,
                  flexWrap: 'wrap',
                }}
              >
                {deleteMode ? (
                  <>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(score.id)}
                      aria-label={`${score.filename}を選択`}
                      onChange={() => onToggleSelected?.(score.id)}
                    />
                    <span>{score.filename}</span>
                  </>
                ) : (
                  <>
                    <Link to={viewerPath(score.id)}>{score.filename}</Link>
                    {onAddToSetlist ? (
                      <button
                        type="button"
                        aria-label={`${score.filename}をセットリストに追加`}
                        onClick={() => onAddToSetlist(score.id)}
                      >
                        追加
                      </button>
                    ) : null}
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
