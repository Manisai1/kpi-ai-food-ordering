import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('kpi_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('kpi_token'));

  const persist = (tok, usr) => {
    localStorage.setItem('kpi_token', tok);
    localStorage.setItem('kpi_user', JSON.stringify(usr));
    setToken(tok);
    setUser(usr);
  };

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    persist(data.access_token, data.user);
    return data.user;
  }, []);

  const register = useCallback(async ({ name, email, phone, password }) => {
    const { data } = await api.post('/auth/register', { name, email, phone, password });
    persist(data.access_token, data.user);
    return data.user;
  }, []);

  const registerAdmin = useCallback(async ({ name, email, phone, password, inviteCode }) => {
    const { data } = await api.post('/auth/register-admin', {
      name, email, phone, password, invite_code: inviteCode,
    });
    persist(data.access_token, data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('kpi_token');
    localStorage.removeItem('kpi_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    isAdmin: user?.role?.toLowerCase() === 'admin',
    isCustomer: user?.role?.toLowerCase() === 'customer',
    login,
    register,
    registerAdmin,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
