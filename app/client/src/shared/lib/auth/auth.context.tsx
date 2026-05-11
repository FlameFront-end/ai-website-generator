import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";

import type { User } from "@/api/services/auth";

import { AuthContext } from "./auth.types";
import { TOKEN_KEY, USER_KEY } from "./auth.types";
import type { AuthContextValue } from "./auth.types";

function readStoredUser(): User | null {
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch {
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
  }, []);

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
