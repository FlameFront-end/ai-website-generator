import type { FC, ReactNode } from "react";

import { LogOut, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { IconButton } from "@/kit";
import { useAuth } from "@/lib";
import { useTheme } from "@/hooks";
import { ROUTES } from "@/model";

import { Logo } from "./Logo";
import styles from "./Layout.module.scss";

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  const { theme, toggle } = useTheme();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Вы вышли из системы");
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div>
          <a className={styles.logo} href="/">
            <Logo size={28} />
            <strong>Forgesite</strong>
          </a>
          <div className={styles.actions}>
            <IconButton
              icon={theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              onClick={toggle}
              title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
              aria-label="Переключить тему"
            />
            {isAuthenticated && (
              <IconButton
                icon={<LogOut size={16} />}
                onClick={handleLogout}
                tone="danger"
                title="Выйти"
                aria-label="Выйти"
              />
            )}
          </div>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
};
