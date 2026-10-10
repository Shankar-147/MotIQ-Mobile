'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, Me, tokenStore } from './api';

type AuthState =
  | { status: 'loading' }
  | { status: 'out'; notice?: string }
  | { status: 'in'; user: Me };

interface AuthContextValue {
  state: AuthState;
  signIn: (token: string) => Promise<void>;
  signOut: (notice?: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const signOut = useCallback((notice?: string) => {
    tokenStore.clear();
    setState({ status: 'out', notice });
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const user = await api.me();
      if (user.role !== 'admin') {
        signOut('That account is not an admin.');
        return;
      }
      setState({ status: 'in', user });
    } catch {
      signOut();
    }
  }, [signOut]);

  useEffect(() => {
    if (!tokenStore.get()) {
      setState({ status: 'out' });
      return;
    }
    loadUser();
  }, [loadUser]);

  const signIn = useCallback(
    async (token: string) => {
      tokenStore.set(token);
      await loadUser();
    },
    [loadUser],
  );

  return <AuthContext.Provider value={{ state, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
