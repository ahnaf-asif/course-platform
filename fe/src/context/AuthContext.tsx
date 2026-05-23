'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { updateAccessToken, setAuthHandlers } from '@/lib/axios';

interface AuthContextType {
  accessToken: string | null;
  role: string | null;
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const clearAuth = useCallback(() => {
    setAccessTokenState(null);
    setRole(null);
    updateAccessToken(null, false);
    localStorage.removeItem('refresh_token');
  }, []);

  const setAccessToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    updateAccessToken(token, false);
    if (token) {
      const payload = decodeJWT(token);
      setRole(payload?.role || null);
    } else {
      setRole(null);
    }
  }, []);

  useEffect(() => {
    setAuthHandlers(setAccessToken, clearAuth);
  }, [setAccessToken, clearAuth]);

  const isAuthenticated = !!accessToken;

  useEffect(() => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      const hydrate = async () => {
        try {
          const response = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          setAccessToken(response.data.access_token);
          localStorage.setItem('refresh_token', response.data.refresh_token);
        } catch (error) {
          console.error('Failed to hydrate auth state:', error);
          localStorage.removeItem('refresh_token');
          updateAccessToken(null, false);
        }
      };
      hydrate();
    }
  }, [setAccessToken]);

  return (
    <AuthContext.Provider value={{ accessToken, role, setAccessToken, clearAuth, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
