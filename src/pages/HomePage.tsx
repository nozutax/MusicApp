import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listScores, type ScoreMeta } from '../lib/db'
import { viewerPath } from '../app/paths'

export function HomePage() {
  const [scores, setScores] = useState<ScoreMeta[]>([])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const rows = await listScores()
      if (!cancelled) {
        setScores(rows)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <h2>Home</h2>

      {scores.length === 0 ? (
        <p>No scores yet.</p>
      ) : (
        <ul>
          {scores.map((score) => (
            <li key={score.id}>
              <Link to={viewerPath(score.id)}>{score.filename}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
