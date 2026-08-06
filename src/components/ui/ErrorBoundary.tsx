import { Component, type ReactNode } from "react";
import { LocaleContext } from "@/lib/i18n/LocaleProvider.tsx";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  static contextType = LocaleContext;
  declare context: React.ContextType<typeof LocaleContext>;

  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : "" };
  }

  render() {
    const t = this.context;
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-danger-border bg-danger-bg p-4 text-danger-text text-sm" role="alert">
          {t.error.message(this.state.message || t.common.errorUnknown)}
        </div>
      );
    }
    return this.props.children;
  }
}
