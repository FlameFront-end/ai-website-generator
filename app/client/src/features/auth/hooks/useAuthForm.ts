import { useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { authService } from "@/api/services/auth";
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
} from "@/api/services/auth";
import { useAuth } from "@/lib";
import { ROUTES } from "@/model";

type AuthMode = "login" | "register";

interface UseAuthFormOptions {
  mode: AuthMode;
  successMessage: string;
  errorMessage: string;
}

export function useAuthForm({
  mode,
  successMessage,
  errorMessage,
}: UseAuthFormOptions) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (credentials: LoginCredentials | RegisterCredentials) => {
    setIsLoading(true);

    try {
      const response: AuthResponse =
        mode === "login"
          ? await authService.login(credentials)
          : await authService.register(credentials as RegisterCredentials);
      login(response.accessToken, response.user);
      toast.success(successMessage);
      navigate(ROUTES.RUNS);
    } catch (error: unknown) {
      const fallback = errorMessage;
      const apiMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ??
        (error as Error)?.message ??
        fallback;
      toast.error(mode === "login" ? fallback : apiMessage);
      console.error(`${mode} error:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  return { submit, isLoading };
}
