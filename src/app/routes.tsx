import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ViewerPage } from '../pages/ViewerPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'viewer/:scoreId',
        element: <ViewerPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
