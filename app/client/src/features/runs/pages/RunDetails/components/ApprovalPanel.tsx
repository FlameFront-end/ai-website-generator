import { CheckCircle2 } from "lucide-react";

import { Button } from "@/kit";

import styles from "./ApprovalPanel.module.scss";

interface ApprovalPanelProps {
  status: string;
  onApprove: () => void;
  isLoading?: boolean;
}

const STEP_TITLES: Record<string, string> = {
  awaiting_style_selection: "Стилистика",
  awaiting_reference_approval: "Визуальный референс",
  awaiting_code_approval: "Код проекта",
  awaiting_final_approval: "Финальный результат",
};

export function ApprovalPanel({
  status,
  onApprove,
  isLoading = false,
}: ApprovalPanelProps) {
  const stepTitle = STEP_TITLES[status] || "текущий шаг";
  const isAwaitingApproval = status.startsWith("awaiting_");

  if (!isAwaitingApproval) {
    return null;
  }

  return (
    <div className={styles.inline}>
      <span className={styles.label}>Ожидание: {stepTitle}</span>
      <Button
        onClick={onApprove}
        disabled={isLoading}
        variant="primary"
        className={styles.button}
      >
        <CheckCircle2 className={styles.buttonIcon} />
        Подтвердить
      </Button>
    </div>
  );
}
