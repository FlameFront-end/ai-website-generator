export interface User {
  id: string;
  email: string;
  avatarUrl: string | null;
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
  /** Base64 data URI, not a remote URL. */
  avatarUrl?: string;
}
