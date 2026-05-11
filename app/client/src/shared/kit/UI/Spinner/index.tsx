import type { FC } from "react";

import { Loader2 } from "lucide-react";

import styles from "./Spinner.module.scss";

interface SpinnerProps {
  size?: number;
  className?: string;
}

export const Spinner: FC<SpinnerProps> = ({ size = 16, className }) => {
  return (
    <Loader2
      size={size}
      className={`${styles.spinner}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    />
  );
};
