import type { FC, ReactNode } from "react";

import { QueryClientProvider } from "@tanstack/react-query";
import { AlertCircle, Check, Info, X, XCircle } from "lucide-react";
import {
  ToastContainer,
  type CloseButtonProps,
  type IconProps,
} from "react-toastify";

import { queryClient } from "@/api/query-client";
import { useTheme } from "@/hooks";
import { AuthProvider } from "@/lib";

import "react-toastify/dist/ReactToastify.css";
import "./toast-overrides.scss";

interface ProvidersProps {
  children: ReactNode;
}

const toastIcon = ({ type }: IconProps) => {
  if (type === "success") {
    return <Check aria-hidden="true" />;
  }

  if (type === "error") {
    return <XCircle aria-hidden="true" />;
  }

  if (type === "warning") {
    return <AlertCircle aria-hidden="true" />;
  }

  return <Info aria-hidden="true" />;
};

const toastCloseButton = ({ closeToast }: CloseButtonProps) => (
  <button
    aria-label="Закрыть уведомление"
    className="custom-toast-close"
    type="button"
    onClick={closeToast}
  >
    <X aria-hidden="true" />
  </button>
);

const ToastWrapper: FC<{ children: ReactNode }> = ({ children }) => {
  const { theme } = useTheme();

  return (
    <>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={2800}
        pauseOnFocusLoss={false}
        hideProgressBar={true}
        newestOnTop={true}
        closeOnClick={false}
        rtl={false}
        draggable="touch"
        theme={theme === "dark" ? "dark" : "light"}
        className="custom-toast-container"
        closeButton={toastCloseButton}
        icon={toastIcon}
        toastClassName={(context) =>
          `${context?.defaultClassName ?? ""} custom-toast custom-toast--${context?.type ?? "default"}`
        }
        progressClassName="custom-toast-progress"
      />
    </>
  );
};

export const Providers: FC<ProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ToastWrapper>{children}</ToastWrapper>
      </QueryClientProvider>
    </AuthProvider>
  );
};
