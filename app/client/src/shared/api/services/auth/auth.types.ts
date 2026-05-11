export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}
