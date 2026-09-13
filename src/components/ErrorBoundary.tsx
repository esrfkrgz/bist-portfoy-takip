import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): State {
    if (error?.message === 'Script error.' || error?.message?.includes('Script error')) {
      return { hasError: false, errorMessage: '' };
    }
    return { hasError: true, errorMessage: error?.message || 'Bilinmeyen hata' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (error?.message === 'Script error.' || error?.message?.includes('Script error')) {
      return;
    }
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Bir hata oluştu</h2>
            <p className="text-xs text-slate-400">
              Uygulama çalışırken beklenmedik bir durum gerçekleşti. Sayfayı yenileyerek devam edebilirsiniz.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/10"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sayfayı Yenile</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
