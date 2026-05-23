import type { FC, ReactNode } from "react";
import { useEffect, useState } from "react";

import clsx from "clsx";
import {
  Activity,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
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
import { useAuth, safeStorage } from "@/lib";
import { useTheme } from "@/hooks";
import { ROUTES } from "@/model";

import { AppHeader, type AppHeaderBackLink } from "./AppHeader";
import { Logo } from "./Logo";
import styles from "./Layout.module.scss";

interface LayoutProps {
  children: ReactNode;
}

interface HeaderConfig {
  title: string;
  backLink?: AppHeaderBackLink;
}

const getHeaderConfig = (pathname: string): HeaderConfig => {
  if (pathname.startsWith(ROUTES.RUN_DETAILS_PREFIX)) {
    return {
      title: "Детали проекта",
      backLink: {
        to: ROUTES.RUNS,
        label: "Проекты",
        ariaLabel: "Вернуться к проектам",
      },
    };
  }

  if (pathname === ROUTES.NEW_RUN) {
    return { title: "Новый проект" };
  }

  return { title: "Проекты" };
};

export const Layout: FC<LayoutProps> = ({ children }) => {
  const { theme, toggle } = useTheme();
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return safeStorage.getString("sidebar-collapsed") === "true";
  });

  const headerConfig = getHeaderConfig(location.pathname);

  useEffect(() => {
    safeStorage.setString("sidebar-collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const handleLogout = () => {
    logout();
    toast.success("Вы вышли из системы");
    void navigate(ROUTES.LOGIN);
  };

  return (
    <div
      className={clsx(
        styles.layout,
        isSidebarCollapsed && styles.layoutCollapsed,
      )}
    >
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.sidebarHeader}>
            <Link className={styles.logo} to={ROUTES.RUNS} title="Forgesite">
              <Logo size={28} />
              <strong>Forgesite</strong>
            </Link>
            <button
              className={styles.collapseButton}
              type="button"
              onClick={() => setIsSidebarCollapsed((value) => !value)}
              title={
                isSidebarCollapsed ? "Развернуть сайдбар" : "Свернуть сайдбар"
              }
              aria-label={
                isSidebarCollapsed ? "Развернуть сайдбар" : "Свернуть сайдбар"
              }
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen size={15} />
              ) : (
                <PanelLeftClose size={15} />
              )}
            </button>
          </div>
          <nav className={styles.nav}>
            <NavLink
              className={({ isActive }) =>
                isActive ? styles.navActive : undefined
              }
              to={ROUTES.RUNS}
              end
              title="Проекты"
            >
              <Activity size={15} />
              <span>Проекты</span>
            </NavLink>
            <div className={styles.navDisabled} title="Подписка">
              <CreditCard size={15} />
              <span>Подписка</span>
            </div>
            <div className={styles.navDisabled} title="Аккаунт">
              <UserRound size={15} />
              <span>Аккаунт</span>
            </div>
            <div className={styles.navDisabled} title="Настройки">
              <Settings size={15} />
              <span>Настройки</span>
            </div>
          </nav>
        </div>
        <div className={styles.sidebarFooter}>
          <div className={styles.quickActions}>
            <button
              type="button"
              onClick={() => navigate(ROUTES.NEW_RUN)}
              title="Новый проект"
              aria-label="Новый проект"
            >
              <Plus size={14} />
              <span>Новый проект</span>
            </button>
            <button
              type="button"
              onClick={toggle}
              title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
              aria-label={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              <span>{theme === "dark" ? "Светлая тема" : "Тёмная тема"}</span>
            </button>
          </div>
          <div className={styles.sidebarBottom}>
            <div className={styles.userIdentity}>
              <div className={styles.userAvatar} aria-hidden="true">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" />
                ) : (
                  <UserRound size={16} />
                )}
              </div>
              <span title={user?.email ?? undefined}>
                {user?.email ?? "Аккаунт"}
              </span>
            </div>
            <span className={styles.planBadge}>Базовый</span>
          </div>
        </div>
      </aside>
      <div className={styles.workspace}>
        <AppHeader
          title={headerConfig.title}
          backLink={headerConfig.backLink}
          actions={
            isAuthenticated ? (
              <IconButton
                icon={<LogOut size={16} />}
                onClick={handleLogout}
                tone="danger"
                title="Выйти"
                aria-label="Выйти"
              />
            ) : null
          }
        />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
};
