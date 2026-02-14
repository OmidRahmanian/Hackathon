'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

const AUTH_STORAGE_KEY = 'postureos-auth';

type AuthContextType = {
  ready: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const current = window.localStorage.getItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(current === '1');
    setReady(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === AUTH_STORAGE_KEY) {
        setIsAuthenticated(event.newValue === '1');
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = (email: string, password: string) => {
    if (!email.trim() || !password.trim()) return false;

    window.localStorage.setItem(AUTH_STORAGE_KEY, '1');
    setIsAuthenticated(true);
    return true;
  };

  const logout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
  };

  const value = useMemo(
    () => ({
      ready,
      isAuthenticated,
      login,
      logout
    }),
    [ready, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
