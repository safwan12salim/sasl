import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

export interface User {
  id: string;
  username: string;
  email: string;
  display_name?: string;
  bio?: string;
  avatar?: string;
  avatar_url?: string;
  is_verified?: boolean;
  is_creator?: boolean;
  is_teacher?: boolean;
  is_seller?: boolean;
  followers_count?: number;
  following_count?: number;
  total_earned?: number;
  wallet: { balance: number; total_earned?: number };
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(() => {
    try { return localStorage.getItem('sasl_token'); } catch { return null; }
  });

  useEffect(() => {
    const t = token || localStorage.getItem('sasl_token');
    if (t) {
      api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      api.get('/users/profile/')
        .then(r => { setUser(r.data); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
  const res = await fetch('http://localhost:8000/api/auth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Login failed');
  }
  
  const data = await res.json();
  localStorage.setItem('sasl_token', data.access);
  api.defaults.headers.common['Authorization'] = `Bearer ${data.access}`;
  
  // Fetch user — if this fails, still set token so user can navigate
  try {
    const userRes = await api.get('/users/profile/');
    setUser(userRes.data);
  } catch (profileErr) {
    console.warn('Profile fetch failed, but token is set');
  }
  
  setToken(data.access);
  setLoading(false);
};


  const register = async (email: string, username: string, password: string) => {
    await api.post('/users/register/', { email, username, password, password2: password });
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('sasl_token');
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  const refreshUser = async () => {
    try { const r = await api.get('/users/profile/'); setUser(r.data); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }