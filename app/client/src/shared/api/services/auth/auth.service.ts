import axiosInstance from "@/shared/api/axiosInstance";

import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  User,
} from "./auth.types";

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axiosInstance.post<AuthResponse>(
      "/auth/login",
      credentials,
    );
    return response.data;
  },

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await axiosInstance.post<AuthResponse>(
      "/auth/register",
      credentials,
    );
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await axiosInstance.get<User>("/auth/me");
    return response.data;
  },
};
