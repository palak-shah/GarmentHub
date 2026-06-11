import { Component, type ReactNode } from 'react';

const clientDebug = import.meta.env.VITE_CLIENT_DEBUG === 'true';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
          <p className="text-lg font-bold text-red-600 mb-2">Something went wrong</p>
          {clientDebug ? (
            <pre className="max-w-full overflow-auto rounded-lg bg-red-50 p-4 text-xs text-red-800 text-left mb-4">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
          ) : (
            <p className="mb-4 max-w-md text-sm text-gray-600">
              An unexpected error occurred. Set <code className="rounded bg-gray-100 px-1">VITE_CLIENT_DEBUG=true</code> in{' '}
              <code className="rounded bg-gray-100 px-1">.env</code> during development to show technical details on this screen.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
            className="rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
