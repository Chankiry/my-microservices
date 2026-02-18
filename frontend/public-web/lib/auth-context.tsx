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

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (token) {
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
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await keycloakLogin(email, password);
    const userInfo = await loadUserInfo();
    setUser(userInfo);
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    await keycloakRegister(email, password, firstName, lastName);
  }, []);

  const logout = useCallback(async () => {
    await keycloakLogout();
    setUser(null);
  }, []);

  const refreshSession = useCallback(async () => {
    await refreshToken();
    const userInfo = await loadUserInfo();
    setUser(userInfo);
  }, []);

  const hasRole = useCallback((role: string) => {
    return user?.realm_access?.roles?.includes(role) || false;
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshSession,
    hasRole,
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
