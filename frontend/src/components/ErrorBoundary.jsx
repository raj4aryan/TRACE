import { Component } from "react";

// Shows the error on screen instead of a blank page. Handy while developing.
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: 32, maxWidth: 720, margin: "0 auto", fontFamily: "var(--body, sans-serif)", color: "var(--ink, #111)" }}>
        <h2>Something broke on this page</h2>
        <pre style={{ whiteSpace: "pre-wrap", background: "rgba(128,128,128,.15)", padding: 16, borderRadius: 6 }}>{String(this.state.error?.stack || this.state.error)}</pre>
        <button onClick={() => { try { localStorage.removeItem("trace_user"); } catch { /* ignore */ } location.href = "/login"; }}>Clear saved login and reload</button>
      </div>
    );
  }
}