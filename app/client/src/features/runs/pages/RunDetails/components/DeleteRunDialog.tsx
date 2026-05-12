import type { FC } from "react";

import { Modal } from "@/kit";
import type { Run } from "@/api/services/runs";

import { getRunTitle } from "../../../lib";

interface DeleteRunDialogProps {
  run: Run;
  isOpen: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteRunDialog: FC<DeleteRunDialogProps> = ({
  run,
  isOpen,
  isLoading,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      title="Удалить проект?"
      confirmText="Удалить"
      cancelText="Отмена"
      variant="danger"
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <p>
        Проект <strong>{getRunTitle(run)}</strong> будет удален безвозвратно.
      </p>
    </Modal>
  );
};
