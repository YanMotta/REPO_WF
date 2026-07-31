import { UserDto } from '@workflow-brasal/shared';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const STORAGE_KEY = 'workflow-auth';

interface StoredAuth {
  accessToken: string;
  user: UserDto;
}

interface AuthContextValue {
  user: UserDto | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredAuth | null>(loadStoredAuth);
  const navigate = useNavigate();

  useEffect(() => {
    const handleUnauthorized = () => {
      setStored(null);
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [navigate]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<StoredAuth>('/auth/login', { email, password });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    setStored(result);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStored(null);
  }, []);

  const value: AuthContextValue = {
    user: stored?.user ?? null,
    isAuthenticated: !!stored?.accessToken,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
