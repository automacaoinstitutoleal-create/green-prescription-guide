import { useState } from "react";
import { ChevronDown, ChevronUp, Microscope, ExternalLink, BookOpen, FileText, Users, Beaker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getReferencesForPathology, pubmedUrlForDoi, type ScientificReference } from "@/lib/scientificReferences";
import { cn } from "@/lib/utils";

interface Props {
  pathologyName: string;
}

/**
 * Botão clicável que abre um Dialog com o conteúdo embutido do estudo
 * (resumo, conclusão clínica, dose), evitando que o médico precise sair
 * da plataforma para ler o conteúdo. Como muitos ambientes corporativos
 * bloqueiam o pubmed.gov, ter o resumo embutido é essencial.
 */
function RefRow({ r }: { r: ScientificReference }) {
  const [open, setOpen] = useState(false);
  const hasEmbedded = Boolean(r.abstract || r.conclusion);

  return (
    <>
      <article
        className={cn(
          "group border-b border-border/60 py-2.5 last:border-0",
          hasEmbedded && "cursor-pointer transition-colors hover:bg-primary-soft/30"
        )}
        onClick={hasEmbedded ? () => setOpen(true) : undefined}
        role={hasEmbedded ? "button" : undefined}
      >
        <header className="flex items-start justify-between gap-3">
          <p className="text-[12px] font-medium leading-snug text-foreground">{r.authors}</p>
          <span className="shrink-0 font-mono text-[11px] tabular text-ink-soft">{r.year}</span>
        </header>
        <p className="mt-1 font-display text-[13.5px] font-medium leading-snug tracking-tight">
          “{r.title}”
        </p>
        <p className="mt-0.5 text-[11.5px] italic text-ink-soft">
          {r.journal}
          {r.studyType && (
            <>
              {" · "}
              <span className="not-italic font-medium text-foreground">{r.studyType}</span>
            </>
          )}
          {r.sampleSize && <> · {r.sampleSize}</>}
        </p>
        {r.doseInfo && (
          <p className="mt-1.5 rounded border-l-2 border-primary/40 bg-primary-soft/40 px-2.5 py-1 text-[11.5px] text-foreground">
            {r.doseInfo}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          {hasEmbedded && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary group-hover:underline">
              <BookOpen className="h-3 w-3" />
              Ler resumo
            </span>
          )}
          <a
            href={pubmedUrlForDoi(r.doi)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-soft hover:text-primary hover:underline"
          >
            doi:{r.doi}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </article>

      {hasEmbedded && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <p className="eyebrow !mb-1.5">{r.studyType ?? "Estudo científico"}</p>
              <DialogTitle className="font-display text-[20px] leading-tight tracking-tight">
                “{r.title}”
              </DialogTitle>
              <DialogDescription className="!mt-2 text-[12.5px]">
                <span className="text-foreground">{r.authors}</span>
                <br />
                <span className="italic">{r.journal}</span> · {r.year}
                {r.sampleSize && <> · {r.sampleSize}</>}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2 space-y-5">
              {r.protocolDose && (
                <div>
                  <p className="eyebrow mb-1.5 flex items-center gap-1.5">
                    <Beaker className="h-3 w-3" />
                    Protocolo / posologia usada
                  </p>
                  <p className="rounded-md border border-border bg-muted/40 px-3.5 py-2.5 text-[12.5px] leading-relaxed">
                    {r.protocolDose}
                  </p>
                </div>
              )}

              {r.abstract && (
                <div>
                  <p className="eyebrow mb-1.5 flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    Resumo do estudo
                  </p>
                  <p className="text-[13px] leading-relaxed text-foreground">
                    {r.abstract}
                  </p>
                </div>
              )}

              {r.conclusion && (
                <div>
                  <p className="eyebrow mb-1.5 flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    Conclusão clínica
                  </p>
                  <p className="rounded-md border-l-4 border-primary bg-primary-soft/50 px-4 py-3 text-[13px] leading-relaxed font-medium text-foreground">
                    {r.conclusion}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="font-mono text-[11px] text-ink-soft">
                  doi:{r.doi}
                </span>
                <a
                  href={pubmedUrlForDoi(r.doi)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[12px] text-ink-soft hover:border-primary/40 hover:text-primary"
                >
                  Ver no PubMed
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
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
            Doses prescritas baseadas em estudos peer-reviewed. Clique em um
            estudo para ler o resumo e a conclusão clínica embutidos.
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
