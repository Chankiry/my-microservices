'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  login as keycloakLogin,
  logout as keycloakLogout,
  register as keycloakRegister,
  loadUserInfo,
  getToken,
  refreshToken,
  UserInfo,
} from '@/lib/keycloak';
import { validateConfig } from '@/lib/config';

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  hasRole: (role: string) => boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      // Validate configuration first
      const { valid, errors } = validateConfig();
      if (!valid) {
        console.error('Configuration errors:', errors);
        setError(`Configuration error: ${errors.join(', ')}`);
        setIsLoading(false);
        return;
      }

      const token = getToken();
      if (token) {
        try {
          const userInfo = await loadUserInfo();
          if (userInfo) {
            setUser(userInfo);
          } else {
            // Token might be expired, try refresh
            const newToken = await refreshToken();
            if (newToken) {
              const refreshedUserInfo = await loadUserInfo();
              setUser(refreshedUserInfo);
            }
          }
        } catch (err) {
          console.error('Auth initialization error:', err);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await keycloakLogin(email, password);
      const userInfo = await loadUserInfo();
      setUser(userInfo);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    }
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    setError(null);
    try {
      await keycloakRegister(email, password, firstName, lastName);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await keycloakLogout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      await refreshToken();
      const userInfo = await loadUserInfo();
      setUser(userInfo);
    } catch (err) {
      console.error('Session refresh error:', err);
      setUser(null);
    }
  }, []);

  const hasRole = useCallback((role: string) => {
    return user?.realm_access?.roles?.includes(role) || false;
  }, [user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshSession,
    hasRole,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
