import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState } from "react";

import { Upload, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import { Button, Input, PasswordInput } from "@/kit";
import { ROUTES } from "@/model";

import { AuthCard } from "../components";
import { useAuthForm } from "../hooks/useAuthForm";
import styles from "./Register.module.scss";

const MAX_AVATAR_SIZE = 1024 * 1024;

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { submit, isLoading } = useAuthForm({
    mode: "register",
    successMessage: "Регистрация прошла успешно!",
    errorMessage: "Ошибка регистрации",
  });

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Выберите изображение");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      toast.error("Аватар должен быть не больше 1 МБ");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(
        typeof reader.result === "string" ? reader.result : undefined,
      );
    };
    reader.onerror = () => {
      toast.error("Не удалось прочитать файл");
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarRemove = () => {
    setAvatarUrl(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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

    void submit({ email, password, avatarUrl });
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
      <div className={styles.avatarField}>
        <div className={styles.avatarPreview} aria-hidden="true">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" />
          ) : (
            <span>{email.trim().charAt(0).toUpperCase() || "A"}</span>
          )}
        </div>
        <div className={styles.avatarActions}>
          <input
            ref={fileInputRef}
            id="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleAvatarChange}
          />
          <label htmlFor="avatar">
            <Upload size={14} />
            <span>{avatarUrl ? "Изменить аватар" : "Добавить аватар"}</span>
          </label>
          {avatarUrl && (
            <button type="button" onClick={handleAvatarRemove}>
              <X size={14} />
              <span>Убрать</span>
            </button>
          )}
        </div>
      </div>
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
