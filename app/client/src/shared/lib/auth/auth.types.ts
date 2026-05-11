import { createContext } from "react";

import type { User } from "@/api/services/auth";

export const TOKEN_KEY = "access_token";
export const USER_KEY = "user_data";

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
