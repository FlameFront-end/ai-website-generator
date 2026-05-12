import type { FormEvent } from "react";
import { useState } from "react";

import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import { Button, Input, PasswordInput } from "@/kit";
import { ROUTES } from "@/model";

import { AuthCard } from "../components";
import { useAuthForm } from "../hooks/useAuthForm";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { submit, isLoading } = useAuthForm({
    mode: "register",
    successMessage: "Регистрация прошла успешно!",
    errorMessage: "Ошибка регистрации",
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }
    if (password.length < 6) {
      toast.error("Пароль должен содержать минимум 6 символов");
      return;
    }

    void submit({ email, password });
  };

  return (
    <AuthCard
      title="Создайте аккаунт"
      onSubmit={handleSubmit}
      footer={
        <>
          Уже есть аккаунт? <Link to={ROUTES.LOGIN}>Войти</Link>
        </>
      }
    >
      <Input
        id="email"
        type="email"
        label="Почта"
        placeholder="name@example.com"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <PasswordInput
        id="password"
        label="Пароль"
        placeholder="••••••"
        minLength={6}
        autoComplete="new-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <PasswordInput
        id="confirmPassword"
        label="Повторите пароль"
        placeholder="••••••"
        minLength={6}
        autoComplete="new-password"
        required
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <Button type="submit" fullWidth isLoading={isLoading}>
        Создать аккаунт
      </Button>
    </AuthCard>
  );
}
