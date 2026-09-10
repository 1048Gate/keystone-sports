import { Component, type ErrorInfo, type ReactNode } from "react";

type BoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
  label?: string;
};

type BoundaryState = { failed: boolean };

/** Catches render errors so one Beat card/module cannot take down /news. */
export class BeatErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (typeof console !== "undefined") {
      console.warn(`[Beat] ${this.props.label ?? "boundary"} failed`, error.message, info.componentStack);
    }
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}
