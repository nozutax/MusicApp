import { Link } from 'react-router-dom'
import { viewerPath } from '../app/paths'

export function HomePage() {
  return (
    <div>
      <p>Home</p>
      <p>
        <Link to={viewerPath('demo')}>Open demo score</Link>
      </p>
    </div>
  )
}
