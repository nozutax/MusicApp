import { Outlet } from 'react-router-dom'
import './styles.css'

export function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>Score Shelf</h1>
      </header>
      <main className="app__main">
        <Outlet />
      </main>
    </div>
  )
}

export default App
