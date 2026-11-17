import { Component, type ReactNode } from "react";
import { saveState } from "../services/storage";

/** Last-resort recovery: a child should never see a blank screen. Clears the in-progress round and offers a restart. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    saveState({ round: null });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="screen">
        <div className="later" role="alert">
          <p>Oops! Let's start again.</p>
          <button type="button" className="pill-btn" data-testid="error-restart" onClick={() => window.location.assign("/")}>
            Start again
          </button>
        </div>
      </main>
    );
  }
}
