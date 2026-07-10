"use client";

import React, { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { LinearCard, LinearButton } from "@/components/ui/linear";

interface Props {
  children: ReactNode;
  /** Custom fallback element. If omitted, renders the default error card. */
  fallback?: ReactNode;
  /** Optional label shown in the error card (e.g. "Campaign list"). */
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const sectionLabel = this.props.label ? `${this.props.label} failed to load` : "Something went wrong";

    return (
      <LinearCard
        padding="lg"
        className="flex flex-col items-center text-center gap-4 py-10"
      >
        <div className="h-12 w-12 rounded-2xl bg-red-950/40 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden />
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-slate-200">{sectionLabel}</p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
        </div>

        <LinearButton variant="secondary" size="sm" onClick={this.reset}>
          Try again
        </LinearButton>
      </LinearCard>
    );
  }
}
