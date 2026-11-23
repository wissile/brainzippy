import { Component, type ReactNode } from "react";
import { saveState } from "../services/storage";
import { track } from "../analytics/track";

/** Last-resort recovery: a child should never see a blank screen. Clears the in-progress round and offers a restart. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    saveState({ round: null });
    // the error's type name only (e.g. "TypeError"), never its message
    const name = error instanceof Error && /^[A-Za-z]{1,40}$/.test(error.name) ? error.name : "";
    track("error", { k1: window.location.pathname.startsWith("/play/") ? "game" : "app", k2: name });
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
