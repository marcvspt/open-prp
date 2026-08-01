import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { labels } from "@/lib/labels.ts";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 text-sm text-danger">
          {labels.error.message(this.state.error.message)}
        </div>
      );
    }
    return this.props.children;
  }
}
