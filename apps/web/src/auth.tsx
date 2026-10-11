import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api, Me, token } from './api';

interface AuthValue {
  user: Me | null;
  loading: boolean;
  signIn: (accessToken: string) => Promise<void>;
  signOut: () => void;
  setUser: (user: Me) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(() => {
    token.clear();
    setUser(null);
  }, []);

  // If a token is saved from last time, find out who it belongs to.
  useEffect(() => {
    if (!token.get()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => token.clear())
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (accessToken: string) => {
    token.set(accessToken);
    setUser(await api.me());
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
