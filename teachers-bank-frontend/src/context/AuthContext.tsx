'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'operator';
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PHP_BASE = 'http://localhost/teachersbank/teachers-bank-api/index.php';
const PUBLIC_PATHS = ['/login'];
const TOKEN_KEY = 'tb_jwt';

// ── Token helpers — sessionStorage so it clears on tab close ─────────────────
function saveToken(t: string) { sessionStorage.setItem(TOKEN_KEY, t); }
function loadToken(): string  { return sessionStorage.getItem(TOKEN_KEY) || ''; }
function clearToken()         { sessionStorage.removeItem(TOKEN_KEY); }

// ── Exported so api.ts can read the token ────────────────────────────────────
export function getAuthToken(): string { return loadToken(); }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router   = useRouter();
  const pathname = usePathname();

  // On mount: if we have a saved token, verify it with /api/auth/me
  const checkAuth = useCallback(async () => {
    const token = loadToken();
    if (!token) { setLoading(false); return; }

    try {
      const res  = await fetch(`${PHP_BASE}/api/auth/me`, {
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.success && json.data?.user) {
        setUser(json.data.user);
      } else {
        clearToken();
        setUser(null);
      }
    } catch {
      // Network error — keep user logged in if token exists, retry later
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  // Redirect logic
  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
    if (!user && !isPublic) router.replace('/login');
    else if (user && pathname === '/login') router.replace('/');
  }, [user, loading, pathname, router]);

  async function login(email: string, password: string) {
    const res  = await fetch(`${PHP_BASE}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
      cache:   'no-store',
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Login failed');

    saveToken(json.data.token);
    setUser(json.data.user);
    router.replace('/');
  }

  function logout() {
    clearToken();
    setUser(null);
    router.replace('/login');
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
