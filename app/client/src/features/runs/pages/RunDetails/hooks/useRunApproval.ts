import { toast } from "react-toastify";

import { useApproveStepMutation } from "@/api/services/runs";
import type { Run } from "@/api/services/runs";
import { logger } from "@/lib";

import { getStepFromStatus } from "../lib/run-status-flow";

interface UseRunApprovalResult {
  approveCurrentStep: (run: Run) => Promise<void>;
  isApproving: boolean;
}

export function useRunApproval(onApproved?: () => void): UseRunApprovalResult {
  const approveStepMutation = useApproveStepMutation();

  const approveCurrentStep = async (run: Run): Promise<void> => {
    const step = getStepFromStatus(run.status);
    if (!step) return;

    try {
      await approveStepMutation.mutateAsync({ runId: run.id, step });
      onApproved?.();
    } catch (error) {
      logger.error("run:approve", error, { runId: run.id, step });
      toast.error("Не удалось подтвердить этап");
    }
  };

  return {
    approveCurrentStep,
    isApproving: approveStepMutation.isPending,
  };
}
