import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";

import { authService } from "@/shared/api/services/auth";
import { useAuth } from "@/shared/model/auth.context";
import { ROUTES } from "@/shared/model/routes";
import styles from "./auth.module.scss";

function IconEye() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }

    if (password.length < 6) {
      toast.error("Пароль должен содержать минимум 6 символов");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.register({ email, password });
      login(response.accessToken, response.user);
      toast.success("Регистрация прошла успешно!");
      navigate(ROUTES.RUNS);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Ошибка регистрации";
      toast.error(message);
      console.error("Register error:", error?.response?.data || error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Регистрация</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              required
              placeholder="your@email.com"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Пароль
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                required
                placeholder="••••••"
                minLength={6}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="confirmPassword" className={styles.label}>
              Подтвердите пароль
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
                required
                placeholder="••••••"
                minLength={6}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={
                  showConfirmPassword ? "Скрыть пароль" : "Показать пароль"
                }
              >
                {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>
          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>
        <p className={styles.link}>
          Уже есть аккаунт? <Link to={ROUTES.LOGIN}>Войти</Link>
        </p>
      </div>
    </div>
  );
}
