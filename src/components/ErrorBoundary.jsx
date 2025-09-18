// ErrorBoundary.jsx
// Minimal UI error boundary to prevent the whole page from going blank on runtime errors.
// Place it e.g. in src/components/ErrorBoundary.jsx and wrap your <Dashboard/> with it.

import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    // You can forward this to a logger
    // console.error("UI ErrorBoundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-sm">
          <div className="font-semibold mb-2">Qualcosa è andato storto.</div>
          <button
            className="px-3 py-1 rounded bg-gray-800 text-white"
            onClick={() => window.location.reload()}
          >
            Ricarica
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}