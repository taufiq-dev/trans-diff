import type { RouteObject } from 'react-router';
import Layout from './pages/layout';
import Home from './pages/home';

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
    ],
  },
];

export { routes };
