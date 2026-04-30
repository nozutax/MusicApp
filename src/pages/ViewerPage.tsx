import { Link, useParams } from 'react-router-dom'

export function ViewerPage() {
  const { scoreId } = useParams()

  return (
    <div style={{ padding: 16 }}>
      <h1>Viewer</h1>
      <p>scoreId: {scoreId}</p>
      <p>
        <Link to="/">Back to Home</Link>
      </p>
    </div>
  )
}
