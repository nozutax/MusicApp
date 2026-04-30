import { Link } from 'react-router-dom'
import { viewerPath } from '../app/paths'
import { deleteScore, type ScoreMeta } from '../lib/db'

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

  return (
    <ul
      style={{
        listStyle: 'none',
        padding: 0,
        margin: '12px 0 0',
      }}
    >
      {scores.map((score) => (
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
  )
}
