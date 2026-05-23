import type { TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";

import clsx from "clsx";

import styles from "./Textarea.module.scss";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, wrapperClassName, className, id, ...rest }, ref) => {
    return (
      <div className={clsx(styles.wrapper, wrapperClassName)}>
        {label && (
          <label className={styles.label} htmlFor={id}>
            {label}
          </label>
        )}
        <textarea
          {...rest}
          id={id}
          ref={ref}
          className={clsx(styles.textarea, error && styles.error, className)}
        />
        {error && <span className={styles.errorText}>{error}</span>}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
