import type { ButtonHTMLAttributes, FC, ReactNode } from "react";

import clsx from "clsx";

import { Spinner } from "../../UI/Spinner/Spinner";
import styles from "./Button.module.scss";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "dangerSolid";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button: FC<ButtonProps> = ({
  variant = "primary",
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  type = "button",
  className,
  children,
  ...rest
}) => {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || isLoading}
      className={clsx(
        styles.button,
        styles[variant],
        fullWidth && styles.fullWidth,
        className,
      )}
    >
      {isLoading ? <Spinner size={14} /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
