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
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('sasl_token');
    } catch {
      // localStorage may be unavailable (incognito, storage full, etc.)
      return null;
    }
  });
  const [loading, setLoading] = useState(true);  // ← NEW: track initial load

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);  // ← NEW: done loading even without token
      return;
    }

    // Set auth header
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    api
      .get('/users/profile/')
      .then((res) => {
        setUser(res.data);
      })
      .catch((err) => {
        // Only remove token if it's an auth error (401/403), not network error
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          try {
            localStorage.removeItem('sasl_token');
          } catch {}
          setToken(null);
        }
        // If it's a network error (server down), keep the token and try again later
        console.warn('Could not load user profile. Will retry on next request.');
      })
      .finally(() => {
        setLoading(false);  // ← NEW: always mark loading complete
      });
  }, [token]);

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await api.get('/users/profile/');
      setUser(res.data);
    } catch {
      // Silent fail — user stays on current data
    }
  };

  const login = async (email: string, password: string) => {
  // Use fetch directly to bypass any axios interceptor issues
  const response = await fetch('http://localhost:8000/api/auth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }
  
  const data = await response.json();
  const { access } = data;
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
    try {
      localStorage.removeItem('sasl_token');
    } catch {}
    setToken(null);
    setUser(null);
  };

  // ← NEW: Show nothing while checking auth (prevents flash of login page)
  if (loading) {
    return null; // Or return a full-screen loader if you prefer
  }

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