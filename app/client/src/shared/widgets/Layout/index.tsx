import type { ReactNode } from "react";

import { useTheme } from "@/shared/hooks/useTheme";

import styles from "./Layout.module.scss";

interface LayoutProps {
  children: ReactNode;
}

function IconSun() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function Layout({ children }: LayoutProps) {
  const { theme, toggle } = useTheme();

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div>
          <a className={styles.logo} href="/">
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="32" height="32" rx="7" fill="#6366f1" />
              <path
                d="M19 4 L10 18 L15.5 18 L13 28 L22 14 L16.5 14 Z"
                fill="white"
              />
            </svg>
            <strong>Forgesite</strong>
          </a>
          <button
            type="button"
            className={styles.themeToggle}
            onClick={toggle}
            title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          >
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
