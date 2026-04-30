import { Link } from 'react-router-dom'
import { homePath } from '../app/paths'

export function NotFoundPage() {
  return (
    <div>
      <h2>Not Found</h2>
      <p>
        <Link to={homePath()}>Go to Home</Link>
      </p>
    </div>
  )
}
