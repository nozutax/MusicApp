import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import App from './App'

describe('App', () => {
  it('renders title', () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<App />}>
            <Route index element={<div>Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Score Shelf' })).toBeInTheDocument()
  })
})
