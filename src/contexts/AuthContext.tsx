import React, { createContext, useContext, useState, useCallback } from 'react';
import { User } from '@/types';
import { users } from '@/data/mockData';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const validCredentials: Record<string, string> = {
  'robertaaron': 'robert123',
  'robertadmin': 'robert123',
  'manager1': 'manager123',
  'tester2': 'tester123',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('technieum_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (validCredentials[username] === password) {
      const foundUser = users.find(u => u.username === username);
      if (foundUser) {
        setUser(foundUser);
        localStorage.setItem('technieum_user', JSON.stringify(foundUser));
        return true;
      }
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('technieum_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
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
