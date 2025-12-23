/**
 * Auth Context
 * Kullanıcı authentication durumu ve işlemleri
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Token'ı localStorage veya sessionStorage'dan al
  const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  const setToken = (token, rememberMe = false) => {
    if (rememberMe) {
      localStorage.setItem('token', token);
      sessionStorage.removeItem('token'); // Diğerini temizle
    } else {
      sessionStorage.setItem('token', token);
      localStorage.removeItem('token'); // Diğerini temizle
    }
  };

  const removeToken = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  };

  // Axios interceptor - her istekte token ekle
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token geçersiz veya süresi dolmuş
          await logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Sayfa yüklendiğinde kullanıcı bilgisini al
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/auth/me`);
        setUser(response.data.user);
      } catch (error) {
        console.error('Auth init error:', error);
        removeToken();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Login
  const login = async (email, password, rememberMe = false) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      const { token, user: userData } = response.data;
      setToken(token, rememberMe);
      setUser(userData);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Giriş başarısız';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      removeToken();
      setUser(null);
    }
  };

  // Rol kontrolü
  const hasRole = (roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  // SUPER_ADMIN mi?
  const isSuperAdmin = () => hasRole(['SUPER_ADMIN']);

  // ADMIN veya SUPER_ADMIN mi?
  const isAdmin = () => hasRole(['ADMIN', 'SUPER_ADMIN']);

  // Kullanıcı yönetimi yetkisi var mı?
  const canManageUsers = () => hasRole(['ADMIN', 'SUPER_ADMIN']);

  // Proje oluşturma/silme yetkisi var mı?
  const canManageProjects = () => hasRole(['SUPER_ADMIN', 'ADMIN']);

  // Agent Management erişimi var mı?
  const canAccessAgentManagement = () => hasRole(['SUPER_ADMIN']);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    hasRole,
    isSuperAdmin,
    isAdmin,
    canManageUsers,
    canManageProjects,
    canAccessAgentManagement,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
