import type { FC } from "react";

import { CheckCircle2 } from "lucide-react";

import { TABS, isTabAvailable } from "../../lib/constants";
import type { RunDetailsTab } from "../../lib/types";

import styles from "./RunTabs.module.scss";

interface RunTabsProps {
  activeTab: RunDetailsTab;
  onChange: (tab: RunDetailsTab) => void;
  status: string;
  currentStep: string;
  onApprove?: () => void;
  isApproving?: boolean;
  isApproveDisabled?: boolean;
  approveDisabledReason?: string;
}

const STATUS_TO_TAB: Record<string, RunDetailsTab> = {
  awaiting_style_selection: "style",
  awaiting_reference_approval: "reference",
  awaiting_final_approval: "result",
};

export const RunTabs: FC<RunTabsProps> = ({
  activeTab,
  onChange,
  status,
  currentStep,
  onApprove,
  isApproving = false,
  isApproveDisabled = false,
  approveDisabledReason,
}) => {
  const approvalTab = STATUS_TO_TAB[status];

  return (
    <nav className={styles.tabs} aria-label="Разделы проекта">
      {TABS.map((tab) => {
        const isAvailable = isTabAvailable(tab.id, status, currentStep);
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
                  if (isApproving || isApproveDisabled) return;
                  onApprove();
                }}
                role="button"
                tabIndex={isApproving || isApproveDisabled ? -1 : 0}
                aria-disabled={isApproving || isApproveDisabled}
                title={approveDisabledReason || "Подтвердить этап"}
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
