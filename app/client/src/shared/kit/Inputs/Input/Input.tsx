import type { InputHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";

import clsx from "clsx";

import styles from "./Input.module.scss";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  endAdornment?: ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      endAdornment,
      wrapperClassName,
      className,
      id,
      ...rest
    },
    ref,
  ) => {
    return (
      <div className={clsx(styles.wrapper, wrapperClassName)}>
        {label && (
          <label className={styles.label} htmlFor={id}>
            {label}
          </label>
        )}
        <div
          className={clsx(styles.field, endAdornment && styles.withEndAdornment)}
        >
          <input
            {...rest}
            id={id}
            ref={ref}
            className={clsx(styles.input, error && styles.error, className)}
          />
          {endAdornment && <div className={styles.endAdornment}>{endAdornment}</div>}
        </div>
        {error && <span className={styles.errorText}>{error}</span>}
      </div>
    );
  },
);

Input.displayName = "Input";
