import { Link, useParams } from 'react-router-dom'
import { homePath } from '../app/paths'

export function ViewerPage() {
  const { scoreId } = useParams<{ scoreId?: string }>()

  if (!scoreId) {
    return (
      <div>
        <h2>Viewer</h2>
        <p>Missing score id.</p>
        <p>
          <Link to={homePath()}>Back to Home</Link>
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2>Viewer</h2>
      <p>scoreId: {scoreId}</p>
      <p>
        <Link to={homePath()}>Back to Home</Link>
      </p>
    </div>
  )
}
