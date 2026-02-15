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
  email: string | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const current = window.localStorage.getItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(current === '1');
    setEmail(window.localStorage.getItem(AUTH_EMAIL_KEY));
    setReady(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === AUTH_STORAGE_KEY) {
        setIsAuthenticated(event.newValue === '1');
      }
      if (event.key === AUTH_EMAIL_KEY) {
        setEmail(event.newValue);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) return false;

    window.localStorage.setItem(AUTH_STORAGE_KEY, '1');
    window.localStorage.setItem(AUTH_EMAIL_KEY, normalizedEmail);
    setIsAuthenticated(true);
    setEmail(normalizedEmail);
    return true;
  };

  const logout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_EMAIL_KEY);
    setIsAuthenticated(false);
    setEmail(null);
  };

  const value = useMemo(
    () => ({
      ready,
      isAuthenticated,
      email,
      login,
      logout
    }),
    [ready, isAuthenticated, email]
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
