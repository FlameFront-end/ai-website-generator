import { useMemo } from "react";
import type { FC } from "react";

import clsx from "clsx";
import { CheckCircle2 } from "lucide-react";

import { Tabs } from "@/kit";
import type { TabItem } from "@/kit";

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

  const items: TabItem<RunDetailsTab>[] = useMemo(
    () =>
      TABS.map((tab) => ({
        id: tab.id,
        label: tab.label,
        disabled: !isTabAvailable(tab.id, status, currentStep),
      })),
    [status, currentStep],
  );

  return (
    <Tabs<RunDetailsTab>
      items={items}
      value={activeTab}
      onChange={onChange}
      ariaLabel="Разделы проекта"
      renderExtra={(item) => {
        const needsApproval = item.id === approvalTab;
        if (!needsApproval || !onApprove) return null;
        return (
          <>
            <span className={styles.approvalDot} />
            <span
              className={clsx(
                styles.approveButton,
                (isApproving || isApproveDisabled) && styles.approveDisabled,
              )}
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
          </>
        );
      }}
    />
  );
};
