'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserSession } from '@/utils/auth';

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (user: UserSession) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Incluir cookies
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = (userData: UserSession) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' 
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    window.location.href = '/auth';
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions.includes(permission) || false;
  };

  const hasRole = (role: string): boolean => {
    return user?.roles.includes(role) || false;
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    hasPermission,
    hasRole,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}