import { Navigate, Route, Routes } from 'react-router-dom';
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
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/quadro" element={<KanbanPage />} />
        <Route path="/projetos/:id" element={<KanbanPage />} />
        <Route path="/projetos" element={<ProjetosPage />} />
        <Route path="/modelos-fechamento" element={<ChecklistPage />} />
      </Route>
    </Routes>
  );
}
