"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : "Erro inesperado.";
    return { hasError: true, message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Algo deu errado
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
              {this.state.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="text-sm font-medium text-brand hover:text-brand-dark transition"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
