import { Component, type ReactNode } from "react";
import { labels } from "@/lib/labels.ts";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : labels.common.errorUnknown };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-danger-border bg-danger-bg p-4 text-danger-text text-sm" role="alert">
          {labels.error.message(this.state.message)}
        </div>
      );
    }
    return this.props.children;
  }
}
