
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext<any>({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load current session.');
        }

        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        setSession(data?.session ?? null);
        setUser(data?.user ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setSession(null);
        setUser(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setAuthState = (data: any) => {
    setSession(data?.session ?? null);
    setUser(data?.user ?? null);
  };

  const signUp = async () => {
    throw new Error('Signup is not migrated to MySQL yet.');
  };

  const signIn = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Invalid email or password.');
    }

    setAuthState(data);
    setLoading(false);
    return data;
  };

  const signOut = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });

    setSession(null);
    setUser(null);
    setLoading(false);
  };

  const getCurrentUser = async () => {
    if (user) return user;

    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      setLoading(false);
      throw new Error('Failed to load current user.');
    }

    const data = await response.json();
    setAuthState(data);
    return data?.user ?? null;
  };

  // Check if Email is Verified
  const isEmailVerified = () => {
    return user?.email_confirmed_at !== null;
  };

  const getUserProfile = async () => {
    if (!user) return null;

    const response = await fetch(`/api/mysql/profile/${encodeURIComponent(user.id)}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    isEmailVerified,
    getUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
