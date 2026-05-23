import type { FC, ReactNode } from "react";
import { useEffect, useRef } from "react";

import { Button } from "@/kit";

import styles from "./Modal.module.scss";

export interface ModalProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: "danger" | "primary";
}

export const Modal: FC<ModalProps> = ({
  isOpen,
  title,
  children,
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  onConfirm,
  onCancel,
  isLoading = false,
  variant = "primary",
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (e.target === overlayRef.current) onCancel();
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div ref={overlayRef} className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.content}>{children}</div>
        <div className={styles.actions}>
          <Button variant="secondary" disabled={isLoading} onClick={onCancel}>
            {cancelText}
          </Button>
          {onConfirm && (
            <Button
              variant={variant === "danger" ? "dangerSolid" : "primary"}
              isLoading={isLoading}
              onClick={onConfirm}
            >
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
