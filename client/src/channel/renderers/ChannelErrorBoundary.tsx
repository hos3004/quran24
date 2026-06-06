import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportRuntimeError, requestRuntimeReload } from '../runtimeStability';

type ChannelErrorBoundaryProps = {
  children: ReactNode;
};

type ChannelErrorBoundaryState = {
  errorMessage: string | null;
};

export class ChannelErrorBoundary extends Component<ChannelErrorBoundaryProps, ChannelErrorBoundaryState> {
  state: ChannelErrorBoundaryState = {
    errorMessage: null
  };

  static getDerivedStateFromError(error: unknown) {
    return {
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    reportRuntimeError(error, { force: true });
    reportRuntimeError(`React component stack: ${info.componentStack}`, { force: true });
    requestRuntimeReload('react_error_boundary', { force: true });
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <main className="channel-runtime-shell">
          <section className="channel-stage">
            <section className="channel-program channel-empty">
              <span className="program-kicker">Channel Recovery</span>
              <h2>Recovering channel</h2>
              <p>{this.state.errorMessage}</p>
            </section>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
