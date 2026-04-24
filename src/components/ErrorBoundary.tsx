import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let displayMessage = "Algo deu errado. Por favor, tente recarregar a página.";
      let subMessage = this.state.error?.message || "";

      // Try to parse FirestoreErrorInfo
      try {
        if (subMessage.startsWith('{') && subMessage.endsWith('}')) {
          const info = JSON.parse(subMessage);
          if (info.authInfo) {
            displayMessage = "Erro de Permissão no Banco de Dados.";
            subMessage = `Operação: ${info.operationType} em ${info.path || 'desconhecido'}`;
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans text-center">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 text-red-500 rounded-2xl mb-6">
              <AlertCircle size={32} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">{displayMessage}</h1>
            <p className="text-sm text-slate-500 mb-8 overflow-hidden text-ellipsis whitespace-nowrap">
              {subMessage}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
            >
              <RefreshCw size={18} /> Recarregar Sistema
            </button>
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Dica: Verifique se o seu computador bloqueia popups ou conexões externas do Google.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
