'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../lib/api';
import { useRouter } from 'next/navigation';

interface User {
  id: string; email: string; firstName: string; lastName: string;
  role: string; referralCode: string; language: string;
  rank?: string; totalBv?: number; packageName?: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  lang: string;
  setLang: (l: string) => void;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLangState] = useState('fr');
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('ss1_lang') || 'fr';
    setLangState(saved);
    const token = localStorage.getItem('ss1_access_token');
    if (token) {
      authApi.me().then(({ data }) => {
        const u = data.user;
        setUser({
          id: u.id, email: u.email,
          firstName: u.first_name, lastName: u.last_name,
          role: u.role, referralCode: u.referral_code,
          language: u.language, rank: u.rank,
          totalBv: u.total_bv, packageName: u.package_name
        });
      }).catch(() => {
        localStorage.removeItem('ss1_access_token');
        localStorage.removeItem('ss1_refresh_token');
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem('ss1_access_token', data.accessToken);
    localStorage.setItem('ss1_refresh_token', data.refreshToken);
    const u = data.user;
    setUser({
      id: u.id, email: u.email,
      firstName: u.first_name || u.firstName,
      lastName: u.last_name || u.lastName,
      role: u.role, referralCode: u.referral_code || u.referralCode,
      language: u.language || 'fr'
    });
    if (['admin', 'superadmin'].includes(u.role)) {
      router.push('/admin-panel');
    } else {
      router.push('/dashboard');
    }
  };

  const register = async (data: any) => {
    const { data: res } = await authApi.register(data);
    localStorage.setItem('ss1_access_token', res.accessToken);
    localStorage.setItem('ss1_refresh_token', res.refreshToken);
    const u = res.user;
    setUser({
      id: u.id, email: u.email,
      firstName: u.firstName, lastName: u.lastName,
      role: u.role, referralCode: u.referralCode, language: 'fr'
    });
    router.push('/dashboard');
  };

  const logout = () => {
    const refresh = localStorage.getItem('ss1_refresh_token') || '';
    authApi.logout(refresh).catch(() => {});
    localStorage.removeItem('ss1_access_token');
    localStorage.removeItem('ss1_refresh_token');
    setUser(null);
    router.push('/');
  };

  const setLang = (l: string) => {
    setLangState(l);
    localStorage.setItem('ss1_lang', l);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, lang, setLang }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
