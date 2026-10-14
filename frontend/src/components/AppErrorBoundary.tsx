import { Component, ErrorInfo, ReactNode } from "react";
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Falha ao exibir a aplicacao", error, info.componentStack);
  }
  render() {
    if (this.state.failed)
      return (
        <div
          role="alert"
          className="grid min-h-screen place-content-center gap-4 bg-slate-100 p-6 text-center text-slate-900 dark:bg-slate-950 dark:text-slate-100"
        >
          <h1 className="text-xl font-semibold">
            Não foi possível exibir esta tela
          </h1>
          <p>Recarregue para tentar novamente.</p>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-white"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      );
    return this.props.children;
  }
}
