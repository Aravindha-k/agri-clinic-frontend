import React from "react";
import { AlertCircle } from "lucide-react";

function logWidgetError(name, error, info) {
  if (import.meta.env.DEV) {
    console.error(`[DashboardWidget:${name ?? "unknown"}]`, error, info);
  }
}

/** Catches render errors in a single dashboard card/widget without crashing the page. */
export class WidgetErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logWidgetError(this.props.name, error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className={`section-card p-6 flex flex-col items-center justify-center text-center ${this.props.className ?? "min-h-[180px]"}`}
        >
          <AlertCircle className="w-8 h-8 text-red-400 mb-2" aria-hidden="true" />
          <p className="text-sm font-semibold text-gray-800">
            {this.props.title ?? "Section unavailable"}
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-xs">
            {this.props.message ??
              "This section failed to load. The rest of the dashboard is still available."}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-3 text-xs font-semibold text-emerald-700 hover:underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Last-resort boundary so the dashboard shell (header + KPIs) can still render. */
export class DashboardShellErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logWidgetError("shell", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-container">
          {this.props.header}
          <div className="section-card p-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm font-semibold text-gray-800">Dashboard content failed to render</p>
            <p className="text-xs text-gray-500 mt-1">
              Core data loaded, but a section crashed. Try refreshing the page.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 btn btn-secondary btn-md"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
