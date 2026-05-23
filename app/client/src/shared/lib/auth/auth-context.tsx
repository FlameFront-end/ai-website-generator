import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { User } from "@/api/services/auth";
import { queryClient, isUser } from "@/api";
import { safeStorage } from "@/lib";

import { AuthContext } from "./auth-types";
import { TOKEN_KEY, USER_KEY } from "./auth-types";
import type { AuthContextValue } from "./auth-types";
import { registerAuthErrorHandler } from "./auth-events";

function readStoredUser(): User | null {
  return safeStorage.getJSON(USER_KEY, isUser);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() =>
    safeStorage.getString(TOKEN_KEY),
  );
  const [user, setUserState] = useState<User | null>(readStoredUser);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback((newToken: string, newUser: User) => {
    safeStorage.setString(TOKEN_KEY, newToken);
    safeStorage.setJSON(USER_KEY, newUser);
    setToken(newToken);
    setUserState(newUser);
  }, []);

  const logout = useCallback(() => {
    safeStorage.remove(TOKEN_KEY);
    safeStorage.remove(USER_KEY);
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
      safeStorage.setJSON(USER_KEY, newUser);
    } else {
      safeStorage.remove(USER_KEY);
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
