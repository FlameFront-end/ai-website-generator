import type { FormEvent } from "react";
import { useState } from "react";

import { Link } from "react-router-dom";

import { Button, Input, PasswordInput } from "@/kit";
import { ROUTES } from "@/model";

import { AuthCard } from "../components";
import { useAuthForm } from "../hooks/useAuthForm";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { submit, isLoading } = useAuthForm({
    mode: "login",
    successMessage: "Вход выполнен успешно!",
    errorMessage: "Неверный email или пароль",
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit({ email, password });
  };

  return (
    <AuthCard
      title="Войдите в Forgesite"
      onSubmit={handleSubmit}
      footer={
        <>
          Нет аккаунта? <Link to={ROUTES.REGISTER}>Создать аккаунт</Link>
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
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" fullWidth isLoading={isLoading}>
        Войти
      </Button>
    </AuthCard>
  );
}
