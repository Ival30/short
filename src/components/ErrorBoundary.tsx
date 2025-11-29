import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isNetworkError =
        this.state.error?.message.includes('fetch') ||
        this.state.error?.message.includes('network') ||
        this.state.error?.message.includes('QUIC');

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {isNetworkError ? 'Connection Error' : 'Something went wrong'}
                </h1>
                <p className="text-slate-600">
                  {isNetworkError
                    ? 'Cannot connect to services'
                    : 'An unexpected error occurred'}
                </p>
              </div>
            </div>

            {isNetworkError ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-amber-900 font-medium mb-2">
                  Network Connection Issue
                </p>
                <p className="text-sm text-amber-800 mb-3">
                  This error typically occurs when:
                </p>
                <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside mb-3">
                  <li>Running in WebContainer with network restrictions</li>
                  <li>Firewall or proxy blocking Supabase</li>
                  <li>Supabase service temporarily unavailable</li>
                  <li>CORS or SSL certificate issues</li>
                </ul>
                <p className="text-sm text-amber-900 font-medium">
                  Try deploying to production (Vercel, Netlify, etc.) where network access is unrestricted.
                </p>
              </div>
            ) : (
              <div className="bg-slate-100 rounded-lg p-4 mb-6 font-mono text-sm overflow-auto">
                <p className="text-red-600 font-semibold mb-2">Error:</p>
                <p className="text-slate-700">{this.state.error?.message}</p>
                {this.state.errorInfo && (
                  <>
                    <p className="text-red-600 font-semibold mt-4 mb-2">
                      Stack Trace:
                    </p>
                    <pre className="text-xs text-slate-600 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Go Home
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-600 mb-2">
                If this problem persists:
              </p>
              <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                <li>Clear browser cache and cookies</li>
                <li>Try a different browser</li>
                <li>Check browser console for detailed errors</li>
                <li>Verify internet connection</li>
                <li>Deploy to production environment</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
