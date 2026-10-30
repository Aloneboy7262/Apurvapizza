import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

/**
 * ErrorBoundary Component:
 * Catches unhandled runtime exceptions in the component tree to prevent
 * solid black/blank screens, rendering a clean, branded recovery UI.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Exception caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 bg-[var(--bg-app)] dark:bg-[#080402] text-center transition-colors">
          <div className="max-w-md w-full bg-white dark:bg-slate-900/90 border border-red-300 dark:border-red-500/40 p-8 rounded-3xl shadow-xl dark:shadow-2xl backdrop-blur-xl space-y-5">
            <div className="w-16 h-16 bg-red-500/15 text-red-500 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto border border-red-500/30">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Something Went Wrong</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                An unexpected interface issue occurred. Tap below to reload the screen or return to the menu.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-[11px] text-red-600 dark:text-red-300 font-mono text-left overflow-x-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-extrabold text-xs shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer border border-orange-400/30"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload View</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Menu</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
