import type { FC, FormEventHandler, ReactNode } from "react";

import { Sparkles } from "lucide-react";

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
      <div className={styles.hero}>
        <span>
          <Sparkles size={16} />
          Forgesite
        </span>
        <h2>Генерируйте лендинги из понятного брифа</h2>
        <p>
          Сохраняйте запуски, проверяйте дизайн, скачивайте код и доводите
          первый экран до готового результата.
        </p>
      </div>
      <div className={styles.card}>
        <div className={styles.cardBadge}>AI Website Generator</div>
        <h1 className={styles.title}>{title}</h1>
        <form className={styles.form} onSubmit={onSubmit}>
          {children}
        </form>
        {footer && <p className={styles.link}>{footer}</p>}
      </div>
    </div>
  );
};
