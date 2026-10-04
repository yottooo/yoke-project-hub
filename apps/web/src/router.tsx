import { createBrowserRouter, Navigate } from 'react-router';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { BoardPage } from '@/features/board/BoardPage';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { AppLayout } from '@/layouts/AppLayout';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    // Everything below needs a signed-in user and shares the top bar.
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/projects', element: <ProjectsPage /> },
          { path: '/projects/:projectId', element: <BoardPage /> },
        ],
      },
    ],
  },
  // Any other address, including "/", goes to the project list.
  { path: '*', element: <Navigate to="/projects" replace /> },
]);
