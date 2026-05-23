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
  renderAfter?: (item: TabItem<T>) => ReactNode;
}

export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  className,
  ariaLabel,
  renderAfter,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={clsx(styles.tabs, className)}
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const isActive = value === item.id;
        return (
          <div key={item.id} className={styles.tabWrapper}>
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              className={clsx(
                styles.tab,
                isActive && styles.active,
                item.disabled && styles.disabled,
              )}
              onClick={() => !item.disabled && onChange(item.id)}
              disabled={item.disabled}
              tabIndex={isActive ? 0 : -1}
            >
              {item.label}
            </button>
            {renderAfter?.(item)}
          </div>
        );
      })}
    </div>
  );
}
