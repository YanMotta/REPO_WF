import { Role } from '@workflow-brasal/shared';
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/** Redirects non-admins back to Atividades — used on tabs the common user shouldn't see. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== Role.ADMIN) {
    return <Navigate to="/fechamento" replace />;
  }
  return <>{children}</>;
}
