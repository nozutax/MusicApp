import { Outlet, useLocation } from 'react-router-dom'
import './styles.css'

export function App() {
  const { pathname } = useLocation()
  const hideChrome = pathname.startsWith('/viewer/')

  return (
    <div className={hideChrome ? 'app app--viewer' : 'app'}>
      {hideChrome ? null : (
        <header className="app__header">
          <h1>Score Shelf</h1>
        </header>
      )}
      <main className="app__main">
        <Outlet />
      </main>
    </div>
  )
}

export default App
