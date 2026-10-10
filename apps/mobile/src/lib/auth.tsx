import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, Me } from './api';
import { tokenStore } from './storage';

interface AuthContextValue {
  user: Me | null;
  loading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    await tokenStore.clear();
    setUser(null);
  }, []);

  // Restore a saved session on launch.
  useEffect(() => {
    (async () => {
      if (await tokenStore.get()) {
        try {
          setUser(await api.me());
        } catch {
          await tokenStore.clear();
        }
      }
      setLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (token: string) => {
    await tokenStore.set(token);
    setUser(await api.me());
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
