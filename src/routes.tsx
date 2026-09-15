import type { RouteObject } from 'react-router';
import Layout from './pages/layout';
import Home from './pages/home';
import ErrorPage from './pages/error';

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Home />,
      },
    ],
  },
];

export { routes };
