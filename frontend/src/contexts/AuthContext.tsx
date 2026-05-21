import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

// ---------- Types ----------
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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// ---------- NEVER‑NULL default ----------
const defaultAuthContext: AuthContextType = {
  user: null,
  token: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshUser: async () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// ---------- Provider ----------
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('sasl_token')
  );

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    api
      .get('/users/profile/')
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('sasl_token');
        setToken(null);
      });
  }, [token]);

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await api.get('/users/profile/');
      setUser(res.data);
    } catch { /* ignore */ }
  };

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/token/', { email, password });
    const { access } = res.data;
    localStorage.setItem('sasl_token', access);
    setToken(access);
  };

  const register = async (email: string, username: string, password: string) => {
    await api.post('/users/register/', {
      email,
      username,
      password,
      password2: password,
    });
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('sasl_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------- Hook ----------
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  return ctx;
}