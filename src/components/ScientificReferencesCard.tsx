import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen, ExternalLink, Star, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getReferencesForPathology,
  externalUrlForRef,
  doiOrgUrl,
  type ScientificReference,
} from "@/lib/scientificReferences";
import { useFavoriteReferences } from "@/hooks/useFavoriteReferences";

interface Props {
  pathologyName: string;
}

function RefRow({
  r,
  pathology,
  isFavorite,
  onToggleFavorite,
}: {
  r: ScientificReference;
  pathology: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="py-2 border-b last:border-b-0 border-border/50">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{r.authors}</p>
          <p className="text-sm text-foreground/90 leading-snug">"{r.title}"</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {r.journal} · {r.year}
          </p>
          <p className="text-xs text-muted-foreground italic mt-0.5">{r.doseInfo}</p>
          {r.tags && r.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {r.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <a
              href={externalUrlForRef(r)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> PubMed
            </a>
            {!r.doi.startsWith("FDA-") && (
              <a
                href={doiOrgUrl(r.doi)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 hover:underline"
              >
                <FileText className="h-3 w-3" /> Artigo (DOI)
              </a>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onToggleFavorite}
          title={isFavorite ? "Remover dos favoritos" : "Favoritar"}
        >
          <Star className={`h-4 w-4 ${isFavorite ? "fill-amber-400 text-amber-500" : "text-muted-foreground"}`} />
        </Button>
      </div>
    </div>
  );
}

export function ScientificReferencesCard({ pathologyName }: Props) {
  const [open, setOpen] = useState(false);
  const { doseReference, specific, general, total } = getReferencesForPathology(pathologyName);
  const { isFavorite, toggle } = useFavoriteReferences();

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
                  <RefRow
                    key={r.doi + r.title}
                    r={r}
                    pathology={pathologyName}
                    isFavorite={isFavorite(r.doi)}
                    onToggleFavorite={() => toggle({ doi: r.doi, title: r.title, pathology: pathologyName })}
                  />
                ))}
              </div>
            </>
          )}
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-3 mb-1">
            Referências gerais (efeito entourage, dose-resposta, full spectrum)
          </p>
          <div>
            {general.map((r) => (
              <RefRow
                key={r.doi + r.title}
                r={r}
                pathology={pathologyName}
                isFavorite={isFavorite(r.doi)}
                onToggleFavorite={() => toggle({ doi: r.doi, title: r.title, pathology: pathologyName })}
              />
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
