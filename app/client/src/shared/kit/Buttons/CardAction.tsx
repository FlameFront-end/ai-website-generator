import type { FC, MouseEvent, ReactNode } from "react";

interface CardActionProps {
  icon: ReactNode;
  title: string;
  ariaLabel?: string;
  onClick: () => void;
  className?: string;
}

export const CardAction: FC<CardActionProps> = ({
  icon,
  title,
  ariaLabel,
  onClick,
  className,
}) => {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={title}
      aria-label={ariaLabel ?? title}
      className={className}
    >
      {icon}
    </button>
  );
};
