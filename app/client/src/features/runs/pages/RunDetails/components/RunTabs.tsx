import type { FC } from "react";

import { TABS } from "../constants";
import type { RunDetailsTab } from "../types";

interface RunTabsProps {
  activeTab: RunDetailsTab;
  onChange: (tab: RunDetailsTab) => void;
  styles: Record<string, string>;
}

export const RunTabs: FC<RunTabsProps> = ({ activeTab, onChange, styles }) => {
  return (
    <nav className={styles.tabs} aria-label="Разделы запуска">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={activeTab === tab.id ? styles.activeTab : undefined}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
};
