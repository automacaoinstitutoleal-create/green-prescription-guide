import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Captura erros de render no React e exibe uma tela de diagnóstico
 * em vez de uma tela em branco. Sem isso, qualquer erro de render
 * deixa o app sem feedback visual, dificultando o suporte.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
    window.location.href = "/login";
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            backgroundColor: "#FAF8F4",
            color: "#1A1F1B",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "640px",
              width: "100%",
              backgroundColor: "white",
              border: "1px solid #D2DAD5",
              borderRadius: "8px",
              padding: "2rem",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "#1B5E48",
                marginBottom: "1rem",
                fontWeight: 600,
              }}
            >
              Precision · Erro inesperado
            </p>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                margin: "0 0 0.5rem",
                lineHeight: 1.2,
              }}
            >
              Algo deu errado ao carregar a tela
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#525C56", margin: "0 0 1.5rem" }}>
              O aplicativo encontrou um erro inesperado. Este painel ajuda a
              identificar a causa rapidamente.
            </p>

            <details
              open
              style={{
                backgroundColor: "#FCF7F0",
                border: "1px solid #E8DBC8",
                borderRadius: "6px",
                padding: "0.875rem 1rem",
                marginBottom: "1rem",
              }}
            >
              <summary
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "#78500F",
                }}
              >
                Detalhes técnicos do erro
              </summary>
              <pre
                style={{
                  marginTop: "0.75rem",
                  fontSize: "0.75rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                  color: "#1A1F1B",
                  margin: "0.75rem 0 0",
                }}
              >
                {error?.name}: {error?.message}
                {error?.stack && (
                  <>
                    {"\n\n"}
                    {error.stack.split("\n").slice(0, 8).join("\n")}
                  </>
                )}
                {errorInfo?.componentStack && (
                  <>
                    {"\n\n--- Componente ---"}
                    {errorInfo.componentStack.split("\n").slice(0, 6).join("\n")}
                  </>
                )}
              </pre>
            </details>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: "0.625rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  backgroundColor: "#1B5E48",
                  color: "#FAF8F4",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Recarregar a página
              </button>
              <button
                onClick={this.handleClearStorage}
                style={{
                  padding: "0.625rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  backgroundColor: "white",
                  color: "#1A1F1B",
                  border: "1px solid #D2DAD5",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Limpar sessão e voltar ao login
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
