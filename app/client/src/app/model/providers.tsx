import type { FC, ReactNode } from "react";

import { QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";

import { queryClient } from "@/api";
import { AuthProvider } from "@/lib";

import "react-toastify/dist/ReactToastify.css";
import "./toast.styles.scss";

interface ProvidersProps {
  children: ReactNode;
}

export const Providers: FC<ProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <ToastContainer
          position="top-right"
          autoClose={4000}
          pauseOnFocusLoss={false}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick={true}
          rtl={false}
          draggable={true}
          theme="dark"
          toastClassName="custom-toast"
          progressClassName="custom-toast-progress"
        />
      </QueryClientProvider>
    </AuthProvider>
  );
};
