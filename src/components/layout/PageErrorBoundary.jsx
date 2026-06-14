import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

/**
 * Catches render errors for a single route so the app shell (sidebar/header) stays visible.
 */
export default class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error("[PageErrorBoundary]", error, info);
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-container">
          <div className="section-card p-8 sm:p-10 text-center max-w-lg mx-auto mt-8">
            <div className="empty-state__icon-wrap mx-auto">
              <AlertCircle className="empty-state__icon text-red-500" aria-hidden="true" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 mt-2">
              {this.props.title ?? "This page failed to load"}
            </h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              {this.props.message ??
                "Something went wrong while rendering this screen. You can try again or use another section from the menu."}
            </p>
            <button type="button" onClick={this.handleRetry} className="btn btn-primary btn-md mt-6">
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
