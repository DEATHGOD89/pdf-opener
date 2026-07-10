import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-color)' }}>
          <h2 style={{ color: '#ef4444' }}>Something went wrong.</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto' }}>
            The PDF renderer encountered a critical error. This usually happens if the PDF is severely corrupted or contains unsupported proprietary formatting.
          </p>
          <div style={{ marginTop: 24, padding: 16, background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, textAlign: 'left', overflow: 'auto', maxHeight: 200 }}>
            <pre style={{ margin: 0 }}>{this.state.error?.toString()}</pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: 24, padding: '8px 16px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
