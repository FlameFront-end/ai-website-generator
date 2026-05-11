import type { ButtonHTMLAttributes, FC, ReactNode } from "react";

import clsx from "clsx";

import styles from "./IconButton.module.scss";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  tone?: "default" | "danger";
}

export const IconButton: FC<IconButtonProps> = ({
  icon,
  tone = "default",
  type = "button",
  className,
  ...rest
}) => {
  return (
    <button
      {...rest}
      type={type}
      className={clsx(
        styles.button,
        tone === "danger" && styles.danger,
        className,
      )}
    >
      {icon}
    </button>
  );
};
