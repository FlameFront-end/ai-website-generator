import type { InputHTMLAttributes } from "react";
import { forwardRef, useState } from "react";

import { Eye, EyeOff } from "lucide-react";

import { IconButton } from "@/kit";

import { Input } from "../Input/Input";

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: string;
  error?: string;
  wrapperClassName?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (props, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <Input
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        endAdornment={
          <IconButton
            icon={visible ? <EyeOff size={18} /> : <Eye size={18} />}
            onClick={() => setVisible((v) => !v)}
            title={visible ? "Скрыть пароль" : "Показать пароль"}
            aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
          />
        }
      />
    );
  },
);

PasswordInput.displayName = "PasswordInput";
