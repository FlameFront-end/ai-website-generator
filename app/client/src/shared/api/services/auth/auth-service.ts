import { axiosInstance } from "@/api";
import { API_ENDPOINTS } from "@/model";

import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  User,
} from "./auth-types";

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axiosInstance.post<AuthResponse>(
      API_ENDPOINTS.AUTH_LOGIN,
      credentials,
    );
    return response.data;
  },

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await axiosInstance.post<AuthResponse>(
      API_ENDPOINTS.AUTH_REGISTER,
      credentials,
    );
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await axiosInstance.get<User>(API_ENDPOINTS.AUTH_ME);
    return response.data;
  },
};
