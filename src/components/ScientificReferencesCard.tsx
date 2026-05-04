import { useState } from "react";
import { ChevronDown, ChevronUp, Microscope, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getReferencesForPathology, pubmedUrlForDoi, type ScientificReference } from "@/lib/scientificReferences";

interface Props {
  pathologyName: string;
}

function RefRow({ r }: { r: ScientificReference }) {
  return (
    <article className="border-b border-border/60 py-2.5 last:border-0">
      <header className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium leading-snug text-foreground">{r.authors}</p>
        <span className="shrink-0 font-mono text-[11px] tabular text-ink-soft">{r.year}</span>
      </header>
      <p className="mt-1 font-display text-[13.5px] font-medium leading-snug tracking-tight">
        “{r.title}”
      </p>
      <p className="mt-0.5 text-[11.5px] italic text-ink-soft">{r.journal}</p>
      {r.doseInfo && (
        <p className="mt-1.5 rounded border-l-2 border-primary/40 bg-primary-soft/40 px-2.5 py-1 text-[11.5px] text-foreground">
          {r.doseInfo}
        </p>
      )}
      <a
        href={pubmedUrlForDoi(r.doi)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
      >
        doi:{r.doi}
        <ExternalLink className="h-3 w-3" />
      </a>
    </article>
  );
}

export function ScientificReferencesCard({ pathologyName }: Props) {
  const [open, setOpen] = useState(false);
  const { doseReference, specific, general, total } = getReferencesForPathology(pathologyName);

  if (total === 0) return null;

  return (
    <div className="card-editorial overflow-hidden border-primary/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-primary-soft/40"
      >
        <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-primary-soft text-primary">
          <Microscope className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[14px] font-semibold tracking-tight text-foreground">
            Referências científicas — {pathologyName}
            <span className="ml-1.5 inline-flex items-center rounded-full bg-primary-soft px-1.5 py-0.5 font-mono text-[10px] text-primary">
              {total}
            </span>
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
            Doses prescritas baseadas nos estudos de maior dose por peso (mg/kg)
            disponíveis na literatura.
            {doseReference && (
              <>
                {" "}Faixa de referência:{" "}
                <strong className="font-mono text-foreground">{doseReference}</strong>.
              </>
            )}
          </p>
        </div>
        {open ? (
          <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-ink-soft" />
        ) : (
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-ink-soft" />
        )}
      </button>

      {open && (
        <div className="border-t border-border bg-surface px-4 pb-3 pt-2">
          {specific.length > 0 && (
            <>
              <p className="eyebrow mt-2 mb-1">Estudos específicos</p>
              <div>
                {specific.map((r) => <RefRow key={r.doi + r.title} r={r} />)}
              </div>
            </>
          )}
          <p className="eyebrow mb-1 mt-3">Referências gerais</p>
          <div>
            {general.map((r) => <RefRow key={r.doi + r.title} r={r} />)}
          </div>
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-7 text-[11.5px]">
              Ocultar referências
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
