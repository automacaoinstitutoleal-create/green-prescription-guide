import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft, ExternalLink, Search, BookOpen, Microscope, FileText, Beaker, Users } from "lucide-react";
import {
  GENERAL_REFERENCES,
  PATHOLOGY_REFERENCES,
  pubmedUrlForDoi,
  type ScientificReference,
} from "@/lib/scientificReferences";
import { cn } from "@/lib/utils";

function matches(r: ScientificReference, term: string) {
  if (!term) return true;
  const t = term.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const haystack = `${r.authors} ${r.title} ${r.journal} ${r.doi}`
    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return haystack.includes(t);
}

export default function ScientificLibrary() {
  const [search, setSearch] = useState("");
  const [activePathology, setActivePathology] = useState<string | null>(null);

  const sortedPathologies = useMemo(
    () => PATHOLOGY_REFERENCES.slice().sort(
      (a, b) => a.pathology.localeCompare(b.pathology, "pt-BR", { sensitivity: "base" })
    ),
    []
  );

  const activeBlock = activePathology
    ? sortedPathologies.find((p) => p.pathology === activePathology)
    : null;

  const filteredRefs = useMemo(() => {
    if (!activeBlock) return [];
    const all = [...activeBlock.refs, ...GENERAL_REFERENCES];
    return all.filter((r) => matches(r, search)).sort((a, b) => b.year - a.year);
  }, [activeBlock, search]);

  const totalSpecific = sortedPathologies.reduce((s, p) => s + p.refs.length, 0);

  return (
    <AppShell
      pageEyebrow="Acervo médico"
      pageTitle="Biblioteca científica"
      pageDescription={
        <>
          {totalSpecific} estudos específicos por patologia + {GENERAL_REFERENCES.length} referências gerais.
          Visível apenas para o médico — nunca aparece nos PDFs entregues ao paciente.
        </>
      }
      breadcrumbs={
        activeBlock
          ? [
              { label: "Pacientes", href: "/" },
              { label: "Biblioteca", href: "/biblioteca" },
              { label: activeBlock.pathology },
            ]
          : [{ label: "Pacientes", href: "/" }, { label: "Biblioteca científica" }]
      }
    >
      {!activeBlock ? (
        <>
          {/* Toolbar com KPIs editoriais */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="card-editorial p-4">
              <p className="eyebrow">Patologias cobertas</p>
              <p className="mt-2 font-display text-[28px] font-semibold leading-none tabular">
                {sortedPathologies.length}
              </p>
            </div>
            <div className="card-editorial p-4">
              <p className="eyebrow">Estudos específicos</p>
              <p className="mt-2 font-display text-[28px] font-semibold leading-none tabular">
                {totalSpecific}
              </p>
            </div>
            <div className="card-editorial p-4">
              <p className="eyebrow">Refs. gerais</p>
              <p className="mt-2 font-display text-[28px] font-semibold leading-none tabular">
                {GENERAL_REFERENCES.length}
              </p>
            </div>
          </div>

          {/* Grid de patologias */}
          <h2 className="font-display text-[22px] font-semibold tracking-tight">
            Selecione uma patologia
          </h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Cada cartão lista a faixa de referência terapêutica e o número de estudos disponíveis.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sortedPathologies.map((p) => (
              <button
                key={p.pathology}
                onClick={() => setActivePathology(p.pathology)}
                className="card-editorial group relative overflow-hidden p-5 text-left transition-all hover:border-primary/40 hover:shadow-elev-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-[16px] font-semibold leading-tight tracking-tight">
                      {p.pathology}
                    </p>
                    <p className="mt-1 text-[12px] text-ink-soft">
                      {p.refs.length} estudo{p.refs.length !== 1 ? "s" : ""} específico{p.refs.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Microscope className="h-4 w-4 text-ink-soft transition-colors group-hover:text-primary" />
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-[10.5px] text-ink-soft">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {p.doseReference}
                </div>
              </button>
            ))}
          </div>

          {/* Refs gerais */}
          <section className="mt-10">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h2 className="font-display text-[20px] font-semibold tracking-tight">
                Referências gerais
              </h2>
            </div>
            <p className="mb-5 text-[13px] text-ink-soft">
              Aplicáveis a múltiplas patologias — segurança geral, mecanismo de ação,
              regulamentação.
            </p>
            <div className="space-y-3">
              {GENERAL_REFERENCES.slice()
                .sort((a, b) => b.year - a.year)
                .map((r) => (
                  <RefBlock key={r.doi + r.title} r={r} />
                ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActivePathology(null);
              setSearch("");
            }}
            className="mb-5 -ml-2 h-8 text-ink-soft hover:text-foreground"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Todas as patologias
          </Button>

          <div className="card-editorial p-6">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
              <div>
                <p className="eyebrow mb-2">Patologia</p>
                <h2 className="font-display text-[24px] font-semibold tracking-tight">
                  {activeBlock.pathology}
                </h2>
                <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 font-mono text-[11px] text-primary">
                  Faixa de referência: {activeBlock.doseReference}
                </p>
              </div>
              <div className="text-right text-[12px] text-ink-soft">
                <p className="tabular text-[26px] font-semibold leading-none text-foreground">
                  {filteredRefs.length}
                </p>
                <p className="mt-1">estudo(s) listado(s)</p>
              </div>
            </div>

            <div className="relative mt-5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <Input
                placeholder="Buscar por autor, título, periódico…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-10"
              />
            </div>

            <div className="mt-5 space-y-3">
              {filteredRefs.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-ink-soft">
                  Nenhuma referência encontrada para “{search}”.
                </p>
              ) : (
                filteredRefs.map((r) => <RefBlock key={r.doi + r.title} r={r} />)
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function RefBlock({ r }: { r: ScientificReference }) {
  const [open, setOpen] = useState(false);
  const hasEmbedded = Boolean(r.abstract || r.conclusion);
  return (
    <>
      <article
        className={cn(
          "rounded-lg border border-border bg-surface p-4 transition-colors",
          hasEmbedded
            ? "cursor-pointer hover:border-primary/40 hover:bg-primary-soft/20"
            : "hover:border-border-strong"
        )}
        onClick={hasEmbedded ? () => setOpen(true) : undefined}
        role={hasEmbedded ? "button" : undefined}
      >
        <header className="flex items-start justify-between gap-3">
          <p className="text-[12px] font-medium text-ink-soft">{r.authors}</p>
          <span className="shrink-0 font-mono text-[11px] text-ink-soft tabular">{r.year}</span>
        </header>
        <p className="mt-1.5 font-display text-[15px] font-medium leading-snug tracking-tight">
          “{r.title}”
        </p>
        <p className="mt-1.5 text-[12px] italic text-ink-soft">
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
          <p className="mt-2 rounded border-l-2 border-primary/40 bg-primary-soft/40 px-3 py-1.5 text-[12px] text-foreground">
            {r.doseInfo}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {hasEmbedded && (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-primary/30 bg-primary-soft px-2.5 text-[11.5px] font-medium text-primary">
              <BookOpen className="h-3 w-3" />
              Ler resumo
            </span>
          )}
          <a
            href={pubmedUrlForDoi(r.doi)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex"
          >
            <Button variant="outline" size="sm" className="h-7 px-2.5 font-mono text-[11px]">
              doi:{r.doi}
              <ExternalLink className="ml-1.5 h-3 w-3" />
            </Button>
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
