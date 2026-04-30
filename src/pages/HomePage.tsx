import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { viewerPath } from '../app/paths'
import { listScores, type ScoreRecord } from '../lib/db'

export function HomePage() {
  const [scores, setScores] = useState<ScoreRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listScores()
      .then((rows) => {
        if (cancelled) return
        setScores(rows)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <p>Home</p>
      <p>
        <Link to={viewerPath('demo')}>Open demo score</Link>
      </p>

      <h2>Saved scores</h2>
      {error && <p role="alert">{error}</p>}
      {!scores && !error && <p>Loading...</p>}
      {scores && scores.length === 0 && <p>(none)</p>}
      {scores && scores.length > 0 && (
        <ul>
          {scores.map((s) => (
            <li key={s.id}>{s.filename}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
