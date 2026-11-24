import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected error'
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[SpyStation ErrorBoundary]', error, info);
  }

  private handleReload = () => {
    try {
      window.location.reload();
    } catch {
      this.setState({ hasError: false, errorMessage: '' });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="h-full w-full bg-[#030712] text-slate-100 flex items-center justify-center p-6 select-none"
        >
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-sky-500/30 p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-2xl">
              🛰️
            </div>
            <h2 className="text-lg font-black text-white">
              حدث خلل مؤقت في شاشة المحطة
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              تم حماية النظام من التوقف. اضغط الزر بالأسفل لإعادة تحميل الشاشة واستكمال اللعب.
            </p>
            {this.state.errorMessage && (
              <div className="text-[11px] font-mono text-rose-300/80 bg-slate-950 border border-slate-800 rounded-xl p-2.5 truncate">
                {this.state.errorMessage}
              </div>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-black text-sm shadow-lg active:scale-95 transition cursor-pointer"
            >
              إعادة تحميل المحطة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
