import type { FC, FormEventHandler, ReactNode } from "react";

import styles from "./AuthCard.module.scss";

interface AuthCardProps {
  title: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  footer?: ReactNode;
}

export const AuthCard: FC<AuthCardProps> = ({
  title,
  onSubmit,
  children,
  footer,
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        <form className={styles.form} onSubmit={onSubmit}>
          {children}
        </form>
        {footer && <p className={styles.link}>{footer}</p>}
      </div>
    </div>
  );
};
