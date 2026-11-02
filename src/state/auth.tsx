import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, refreshAccessToken, tokenStore } from '../lib/api';
type User = { _id?: string; id?: string; firstName?: string; lastName?: string; name?: string; email?: string; role?: { name?: string; code?: string } | string; permissions?: string[] };
type AuthContextValue = { user: User | null; loading: boolean; signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void>; reload: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);
function userFrom(data: unknown): User | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const candidate = (d.employee ?? d.user ?? d) as User;
  return candidate && (candidate.email || candidate._id || candidate.id) ? candidate : null;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    const response = await api.get<unknown>('/auth/me');
    setUser(userFrom(response.data));
  }, []);
  useEffect(() => { (async () => { if (await refreshAccessToken()) { try { await reload(); } catch { tokenStore.set(null); } } setLoading(false); })(); }, [reload]);
  const signIn = useCallback(async (email: string, password: string) => {
    const result = await api.post<{ accessToken?: string; employee?: User; user?: User }>('/auth/login', { email, password });
    tokenStore.set(result.data.accessToken ?? null);
    if (!tokenStore.get()) throw new Error('The API did not return an access token.');
    try { await reload(); } catch { setUser(userFrom(result.data)); }
  }, [reload]);
  const signOut = useCallback(async () => { try { await api.post('/auth/logout'); } finally { tokenStore.set(null); setUser(null); } }, []);
  const value = useMemo(() => ({ user, loading, signIn, signOut, reload }), [user, loading, signIn, signOut, reload]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
