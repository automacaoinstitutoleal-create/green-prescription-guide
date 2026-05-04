import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { BrandMark } from "@/components/BrandMark";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-8 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <BrandMark size={26} className="text-primary" />
          <span className="font-display text-[17px] font-semibold tracking-tight">
            Greenlion <span className="font-normal italic text-primary">Precision</span>
          </span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-ink-soft">
            Página não encontrada
          </p>
          <p className="mt-6 font-display text-[120px] font-medium leading-none tracking-tight text-primary tabular">
            404
          </p>
          <h1 className="mt-6 font-display text-[28px] font-semibold tracking-tight">
            O endereço solicitado não existe
          </h1>
          <p className="mt-3 text-[14px] text-ink-soft">
            Verifique o link ou volte para o painel principal.
            <br />
            <code className="mt-2 inline-block rounded border border-border bg-muted px-2 py-1 font-mono text-[12px]">
              {location.pathname}
            </code>
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-[13.5px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o painel
          </Link>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
