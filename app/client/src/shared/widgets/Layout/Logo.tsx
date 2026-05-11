import type { FC } from "react";

interface LogoProps {
  size?: number;
}

export const Logo: FC<LogoProps> = ({ size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect width="32" height="32" rx="7" fill="#6366f1" />
    <path d="M19 4 L10 18 L15.5 18 L13 28 L22 14 L16.5 14 Z" fill="white" />
  </svg>
);
