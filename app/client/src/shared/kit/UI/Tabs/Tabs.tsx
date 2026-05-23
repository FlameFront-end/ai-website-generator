import type { ReactNode } from "react";

import clsx from "clsx";

import styles from "./Tabs.module.scss";

export interface TabItem<T extends string = string> {
  id: T;
  label: ReactNode;
  disabled?: boolean;
}

interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  ariaLabel?: string;
  renderExtra?: (item: TabItem<T>) => ReactNode;
}

export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  className,
  ariaLabel,
  renderExtra,
}: TabsProps<T>) {
  return (
    <nav className={clsx(styles.tabs, className)} aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={clsx(
            styles.tab,
            value === item.id && styles.active,
            item.disabled && styles.disabled,
          )}
          onClick={() => !item.disabled && onChange(item.id)}
          disabled={item.disabled}
        >
          {item.label}
          {renderExtra?.(item)}
        </button>
      ))}
    </nav>
  );
}
