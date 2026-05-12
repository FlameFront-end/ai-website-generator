import type { FC } from "react";

import { CheckCircle2 } from "lucide-react";

import { TABS, isTabAvailable } from "../constants";
import type { RunDetailsTab } from "../types";

interface RunTabsProps {
  activeTab: RunDetailsTab;
  onChange: (tab: RunDetailsTab) => void;
  styles: Record<string, string>;
  status: string;
  onApprove?: () => void;
  isApproving?: boolean;
}

const STATUS_TO_TAB: Record<string, RunDetailsTab> = {
  awaiting_spec_approval: "spec",
  awaiting_design_approval: "design",
  awaiting_reference_approval: "reference",
  awaiting_code_approval: "code",
  awaiting_final_approval: "result",
};

export const RunTabs: FC<RunTabsProps> = ({
  activeTab,
  onChange,
  styles,
  status,
  onApprove,
  isApproving = false,
}) => {
  const approvalTab = STATUS_TO_TAB[status];

  return (
    <nav className={styles.tabs} aria-label="Разделы запуска">
      {TABS.map((tab) => {
        const isAvailable = isTabAvailable(tab.id, status);
        const needsApproval = tab.id === approvalTab;
        return (
          <button
            key={tab.id}
            type="button"
            className={[
              activeTab === tab.id ? styles.activeTab : "",
              !isAvailable ? styles.disabledTab : "",
              needsApproval ? styles.approvalTab : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => isAvailable && onChange(tab.id)}
            disabled={!isAvailable}
          >
            {tab.label}
            {needsApproval && onApprove && (
              <span
                className={styles.approveButton}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isApproving) return;
                  onApprove();
                }}
                role="button"
                tabIndex={isApproving ? -1 : 0}
                aria-disabled={isApproving}
                title="Подтвердить этап"
              >
                <CheckCircle2 className={styles.approveIcon} />
                <span>Подтвердить</span>
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
