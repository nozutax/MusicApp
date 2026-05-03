import { Link } from 'react-router-dom'
import { viewerPath } from '../app/paths'
import { deleteScore, type ScoreMeta } from '../lib/db'
import { groupAndSortScores } from '../lib/library/classify'

type Props = {
  scores: ScoreMeta[]
  onChanged: () => void
}

export function ScoreList({ scores, onChanged }: Props) {
  async function handleDelete(score: ScoreMeta) {
    if (
      !confirm(
        `「${score.filename}」と保存された注釈を削除します。よろしいですか？`,
      )
    ) {
      return
    }
    await deleteScore(score.id)
    await onChanged()
  }

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
                <Link to={viewerPath(score.id)}>{score.filename}</Link>
                <button type="button" onClick={() => void handleDelete(score)}>
                  削除
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
