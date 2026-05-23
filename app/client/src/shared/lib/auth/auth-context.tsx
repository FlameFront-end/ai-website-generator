import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { User } from "@/api/services/auth";
import { queryClient, isUser } from "@/api";

import { AuthContext } from "./auth-types";
import { TOKEN_KEY, USER_KEY } from "./auth-types";
import type { AuthContextValue } from "./auth-types";
import { registerAuthErrorHandler } from "./auth-events";

function readStoredUser(): User | null {
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  try {
    const parsed: unknown = JSON.parse(stored);
    if (isUser(parsed)) return parsed;
    localStorage.removeItem(USER_KEY);
    return null;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [user, setUserState] = useState<User | null>(readStoredUser);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUserState(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUserState(null);
    queryClient.clear();
  }, []);

  useEffect(() => {
    return registerAuthErrorHandler(() => {
      logout();
    });
  }, [logout]);

  const setUser = useCallback((newUser: User | null) => {
    if (newUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(USER_KEY);
    }
    setUserState(newUser);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      logout,
      setUser,
      setLoading,
    }),
    [user, token, isLoading, login, logout, setUser, setLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
