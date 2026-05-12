import { useCallback } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import {
  useDeleteRunMutation,
  useDownloadCodeMutation,
  useRebuildRunMutation,
  useUpdateRunMutation,
} from "@/api/services/runs";

interface UseRunActionsResult {
  rename: (runId: string, displayName: string | null) => void;
  remove: (runId: string) => void;
  download: (runId: string) => void;
  rebuild: (runId: string) => void;
  isRenaming: boolean;
  isDeleting: boolean;
  isDownloading: boolean;
  isRebuilding: boolean;
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
  const rebuildRunMutation = useRebuildRunMutation();

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
        onSuccess: () => navigate("/"),
        onError: () => toast.error("Не удалось удалить проект"),
      });
    },
    [deleteRunMutation, navigate],
  );

  const download = useCallback(
    (runId: string) => downloadCodeMutation.mutate(runId),
    [downloadCodeMutation],
  );

  const rebuild = useCallback(
    (runId: string) => rebuildRunMutation.mutate(runId),
    [rebuildRunMutation],
  );

  return {
    rename,
    remove,
    download,
    rebuild,
    isRenaming: updateRunMutation.isPending,
    isDeleting: deleteRunMutation.isPending,
    isDownloading: downloadCodeMutation.isPending,
    isRebuilding: rebuildRunMutation.isPending,
  };
}
