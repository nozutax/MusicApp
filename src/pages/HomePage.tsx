import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileImportButton } from '../components/FileImportButton'
import { listScores, type ScoreMeta } from '../lib/db'
import { viewerPath } from '../app/paths'

export function HomePage() {
  const [scores, setScores] = useState<ScoreMeta[]>([])
  const mountedRef = useRef(false)

  const refresh = useCallback(async () => {
    const rows = await listScores()
    if (mountedRef.current) {
      setScores(rows)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void refresh()
    return () => {
      mountedRef.current = false
    }
  }, [refresh])

  return (
    <div>
      <h2>Home</h2>

      <FileImportButton
        onImported={async () => {
          await refresh()
        }}
      />

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
