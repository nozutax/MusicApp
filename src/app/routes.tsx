import { createBrowserRouter } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { ViewerPage } from '../pages/ViewerPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/viewer/:scoreId',
    element: <ViewerPage />,
  },
])
