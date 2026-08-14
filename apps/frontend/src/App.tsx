import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAdmin } from './auth/RequireAdmin';
import { RequireAuth } from './auth/RequireAuth';
import { AppLayout } from './layout/AppLayout';
import { AtividadesPage } from './pages/AtividadesPage';
import { ChecklistPage } from './pages/ChecklistPage';
import { ConfirmEmailChangePage } from './pages/ConfirmEmailChangePage';
import { DashboardPage } from './pages/DashboardPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { GanttPage } from './pages/GanttPage';
import { KanbanPage } from './pages/KanbanPage';
import { LoginPage } from './pages/LoginPage';
import { ProjetosPage } from './pages/ProjetosPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { UsersPage } from './pages/UsersPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { PeriodProvider } from './period/PeriodContext';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/confirm-email-change" element={<ConfirmEmailChangePage />} />
      <Route
        element={
          <RequireAuth>
            <PeriodProvider>
              <AppLayout />
            </PeriodProvider>
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
          path="/gantt"
          element={
            <RequireAdmin>
              <GanttPage />
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
        <Route
          path="/usuarios"
          element={
            <RequireAdmin>
              <UsersPage />
            </RequireAdmin>
          }
        />
      </Route>
    </Routes>
  );
}
