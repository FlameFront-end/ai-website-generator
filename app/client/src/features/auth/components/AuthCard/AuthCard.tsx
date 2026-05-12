import type { FC, FormEventHandler, ReactNode } from "react";

import { Logo } from "@/shared/widgets/Layout/Logo";

import styles from "./AuthCard.module.scss";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  footer?: ReactNode;
}

export const AuthCard: FC<AuthCardProps> = ({
  title,
  subtitle,
  onSubmit,
  children,
  footer,
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <Logo size={24} />
          <span>Forgesite</span>
        </div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        <form className={styles.form} onSubmit={onSubmit}>
          {children}
        </form>
        {footer && <p className={styles.link}>{footer}</p>}
      </div>
    </div>
  );
};
