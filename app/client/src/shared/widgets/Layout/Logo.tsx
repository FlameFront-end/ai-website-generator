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
    <rect
      x="0.5"
      y="0.5"
      width="31"
      height="31"
      rx="7.5"
      fill="currentColor"
      fillOpacity="0.04"
    />
    <rect
      x="0.5"
      y="0.5"
      width="31"
      height="31"
      rx="7.5"
      stroke="currentColor"
      strokeOpacity="0.2"
    />
    <path d="M16 6.5L25 22H7L16 6.5Z" fill="currentColor" />
    <path d="M16 11.2L20.8 19.5H11.2L16 11.2Z" fill="var(--bg-page)" />
  </svg>
);
