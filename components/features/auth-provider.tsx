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
const AUTH_EMAIL_KEY = 'postureos-auth-email';

type AuthContextType = {
  ready: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const current = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const currentEmail = window.localStorage.getItem(AUTH_EMAIL_KEY);
    setIsAuthenticated(current === '1');
    setUserEmail(current === '1' ? currentEmail : null);
    setReady(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === AUTH_STORAGE_KEY || event.key === AUTH_EMAIL_KEY) {
        const nextAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);
        const nextEmail = window.localStorage.getItem(AUTH_EMAIL_KEY);
        setIsAuthenticated(nextAuth === '1');
        setUserEmail(nextAuth === '1' ? nextEmail : null);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = (email: string, password: string) => {
    if (!email.trim() || !password.trim()) return false;

    const normalizedEmail = email.trim().toLowerCase();
    window.localStorage.setItem(AUTH_STORAGE_KEY, '1');
    window.localStorage.setItem(AUTH_EMAIL_KEY, normalizedEmail);
    setIsAuthenticated(true);
    setUserEmail(normalizedEmail);
    return true;
  };

  const logout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_EMAIL_KEY);
    setIsAuthenticated(false);
    setUserEmail(null);
  };

  const value = useMemo(
    () => ({
      ready,
      isAuthenticated,
      userEmail,
      login,
      logout
    }),
    [ready, isAuthenticated, userEmail]
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
