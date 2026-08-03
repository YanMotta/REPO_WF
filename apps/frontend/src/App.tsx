import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAdmin } from './auth/RequireAdmin';
import { RequireAuth } from './auth/RequireAuth';
import { AppLayout } from './layout/AppLayout';
import { AtividadesPage } from './pages/AtividadesPage';
import { ChecklistPage } from './pages/ChecklistPage';
import { DashboardPage } from './pages/DashboardPage';
import { KanbanPage } from './pages/KanbanPage';
import { LoginPage } from './pages/LoginPage';
import { ProjetosPage } from './pages/ProjetosPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/fechamento" replace />} />
        <Route path="/fechamento" element={<AtividadesPage />} />
        <Route path="/quadro" element={<KanbanPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAdmin>
              <DashboardPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/projetos/:id"
          element={
            <RequireAdmin>
              <KanbanPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/projetos"
          element={
            <RequireAdmin>
              <ProjetosPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/modelos-fechamento"
          element={
            <RequireAdmin>
              <ChecklistPage />
            </RequireAdmin>
          }
        />
      </Route>
    </Routes>
  );
}
