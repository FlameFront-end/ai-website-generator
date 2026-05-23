import { useCallback } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import {
  useDeleteRunMutation,
  useDownloadCodeMutation,
  useRestartCodeStepMutation,
  useRestartCurrentStepMutation,
  useStopCurrentStepMutation,
  useUpdateRunMutation,
} from "@/api/services/runs";
import { ROUTES } from "@/model";

interface UseRunActionsResult {
  rename: (runId: string, displayName: string | null) => void;
  remove: (runId: string) => void;
  download: (runId: string) => void;
  restartCurrentStep: (runId: string) => void;
  stopCurrentStep: (runId: string) => void;
  restartCodeStep: (runId: string) => void;
  isRenaming: boolean;
  isDeleting: boolean;
  isDownloading: boolean;
  isRestartingStep: boolean;
  isStoppingStep: boolean;
  isRestartingCodeStep: boolean;
}

interface UseRunActionsOptions {
  onRenameSuccess?: () => void;
}

export function useRunActions({
  onRenameSuccess,
}: UseRunActionsOptions = {}): UseRunActionsResult {
  const navigate = useNavigate();
  const updateRunMutation = useUpdateRunMutation();
  const deleteRunMutation = useDeleteRunMutation();
  const downloadCodeMutation = useDownloadCodeMutation();
  const restartCurrentStepMutation = useRestartCurrentStepMutation();
  const stopCurrentStepMutation = useStopCurrentStepMutation();
  const restartCodeStepMutation = useRestartCodeStepMutation();

  const rename = useCallback(
    (runId: string, displayName: string | null) => {
      updateRunMutation.mutate(
        { runId, displayName },
        {
          onSuccess: () => {
            toast.success("Название проекта обновлено");
            onRenameSuccess?.();
          },
          onError: () => toast.error("Не удалось переименовать проект"),
        },
      );
    },
    [updateRunMutation, onRenameSuccess],
  );

  const remove = useCallback(
    (runId: string) => {
      deleteRunMutation.mutate(runId, {
        onSuccess: () => void navigate(ROUTES.RUNS),
        onError: () => toast.error("Не удалось удалить проект"),
      });
    },
    [deleteRunMutation, navigate],
  );

  const download = useCallback(
    (runId: string) => downloadCodeMutation.mutate(runId),
    [downloadCodeMutation],
  );

  const restartCurrentStep = useCallback(
    (runId: string) => {
      restartCurrentStepMutation.mutate(runId, {
        onSuccess: () => toast.success("Текущий шаг перезапущен"),
        onError: () => toast.error("Не удалось перезапустить текущий шаг"),
      });
    },
    [restartCurrentStepMutation],
  );

  const stopCurrentStep = useCallback(
    (runId: string) => {
      stopCurrentStepMutation.mutate(runId, {
        onSuccess: () => toast.success("Шаг остановлен"),
        onError: () => toast.error("Не удалось остановить текущий шаг"),
      });
    },
    [stopCurrentStepMutation],
  );
  const restartCodeStep = useCallback(
    (runId: string) => {
      restartCodeStepMutation.mutate(runId, {
        onSuccess: () => toast.success("Генерация кода перезапущена"),
        onError: () => toast.error("Не удалось перезапустить генерацию кода"),
      });
    },
    [restartCodeStepMutation],
  );

  return {
    rename,
    remove,
    download,
    restartCurrentStep,
    stopCurrentStep,
    restartCodeStep,
    isRenaming: updateRunMutation.isPending,
    isDeleting: deleteRunMutation.isPending,
    isDownloading: downloadCodeMutation.isPending,
    isRestartingStep: restartCurrentStepMutation.isPending,
    isStoppingStep: stopCurrentStepMutation.isPending,
    isRestartingCodeStep: restartCodeStepMutation.isPending,
  };
}
