import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getReferencesForPathology, pubmedUrlForDoi, type ScientificReference } from "@/lib/scientificReferences";

interface Props {
  pathologyName: string;
}

function RefRow({ r }: { r: ScientificReference }) {
  return (
    <div className="py-2 border-b last:border-b-0 border-border/50">
      <p className="text-sm font-medium leading-snug">{r.authors}</p>
      <p className="text-sm text-foreground/90 leading-snug">"{r.title}"</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {r.journal} · {r.year}
      </p>
      <p className="text-xs text-muted-foreground italic mt-0.5">{r.doseInfo}</p>
      <a
        href={pubmedUrlForDoi(r.doi)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1"
      >
        doi:{r.doi} <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

export function ScientificReferencesCard({ pathologyName }: Props) {
  const [open, setOpen] = useState(false);
  const { doseReference, specific, general, total } = getReferencesForPathology(pathologyName);

  if (total === 0) return null;

  return (
    <div className="rounded-lg border border-blue-300 bg-blue-50/40 dark:bg-blue-950/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-blue-100/40 transition-colors"
      >
        <BookOpen className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
            Referências científicas — {pathologyName} ({total} artigos)
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Doses prescritas baseadas nos estudos de maior dose por peso (mg/kg) disponíveis na literatura.
            {doseReference && <> Faixa de referência: <strong>{doseReference}</strong>.</>}
          </p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-3 pt-1 bg-white/70 dark:bg-background/40">
          {specific.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-2 mb-1">
                Estudos específicos
              </p>
              <div>
                {specific.map((r) => (
                  <RefRow key={r.doi + r.title} r={r} />
                ))}
              </div>
            </>
          )}
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-3 mb-1">
            Referências gerais
          </p>
          <div>
            {general.map((r) => (
              <RefRow key={r.doi + r.title} r={r} />
            ))}
          </div>
          <div className="flex justify-end mt-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Ocultar referências
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
