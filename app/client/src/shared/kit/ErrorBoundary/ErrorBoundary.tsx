import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

import { logger } from "@/lib";

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error("ErrorBoundary", error, {
      componentStack: info.componentStack ?? "",
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
            <p>Произошла ошибка при отображении этого раздела.</p>
            <button
              type="button"
              style={{
                marginTop: "0.5rem",
                cursor: "pointer",
                color: "var(--text-link)",
                background: "none",
                border: "none",
                textDecoration: "underline",
              }}
              onClick={() => this.setState({ hasError: false })}
            >
              Попробовать снова
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
