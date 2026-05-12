import type { FC, ReactNode } from "react";

import {
  Activity,
  CreditCard,
  Settings,
  UserRound,
  LogOut,
  Moon,
  Plus,
  Sun,
} from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
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
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const headerTitle = location.pathname.startsWith(ROUTES.RUN_DETAILS_PREFIX)
    ? "Детали проекта"
    : location.pathname === ROUTES.NEW_RUN
      ? "Новый проект"
      : "Проекты";

  const handleLogout = () => {
    logout();
    toast.success("Вы вышли из системы");
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <Link className={styles.logo} to={ROUTES.RUNS}>
            <Logo size={28} />
            <strong>Forgesite</strong>
          </Link>
          <nav className={styles.nav}>
            <NavLink
              className={({ isActive }) =>
                isActive ? styles.navActive : undefined
              }
              to={ROUTES.RUNS}
              end
            >
              <Activity size={15} />
              Проекты
            </NavLink>
            <span className={styles.navDisabled}>
              <CreditCard size={15} />
              Подписка
            </span>
            <span className={styles.navDisabled}>
              <UserRound size={15} />
              Аккаунт
            </span>
            <span className={styles.navDisabled}>
              <Settings size={15} />
              Настройки
            </span>
          </nav>
        </div>
        <div className={styles.sidebarFooter}>
          <div className={styles.quickActions}>
            <button type="button" onClick={() => navigate(ROUTES.NEW_RUN)}>
              <Plus size={14} />
              Новый проект
            </button>
            <button type="button" onClick={toggle}>
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            </button>
          </div>
          <div className={styles.sidebarBottom}>
            <span title={user?.email ?? undefined}>
              {user?.email ?? "Аккаунт"}
            </span>
            <span>Базовый</span>
          </div>
        </div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.header}>
          <div>
            <strong>{headerTitle}</strong>
            <div className={styles.actions}>
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
    </div>
  );
};
