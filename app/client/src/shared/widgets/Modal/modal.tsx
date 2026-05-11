import { useEffect, useRef } from 'react'

import styles from './modal.module.scss'

export interface ModalProps {
  isOpen: boolean
  title: string
  children: React.ReactNode
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel: () => void
  isLoading?: boolean
  variant?: 'danger' | 'primary'
}

export function Modal({
  isOpen,
  title,
  children,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'primary',
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (e.target === overlayRef.current) {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = ''
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div ref={overlayRef} className={styles.overlay}>
      <div ref={contentRef} className={styles.modal} role="dialog" aria-modal="true">
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.content}>{children}</div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            disabled={isLoading}
            onClick={onCancel}
          >
            {cancelText}
          </button>
          {onConfirm && (
            <button
              type="button"
              className={variant === 'danger' ? styles.dangerButton : styles.confirmButton}
              disabled={isLoading}
              onClick={onConfirm}
            >
              {isLoading ? 'Загрузка...' : confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
