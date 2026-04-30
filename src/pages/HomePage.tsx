import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Score Shelf</h1>
      <p>Home</p>
      <p>
        <Link to="/viewer/demo">Open demo score</Link>
      </p>
    </div>
  )
}
