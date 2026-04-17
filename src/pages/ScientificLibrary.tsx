import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, ExternalLink, Search } from "lucide-react";
import {
  GENERAL_REFERENCES,
  PATHOLOGY_REFERENCES,
  pubmedUrlForDoi,
  type ScientificReference,
} from "@/lib/scientificReferences";

function matches(r: ScientificReference, term: string) {
  if (!term) return true;
  const t = term.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const haystack = `${r.authors} ${r.title} ${r.journal} ${r.doi}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return haystack.includes(t);
}

export default function ScientificLibrary() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activePathology, setActivePathology] = useState<string | null>(null);

  const sortedPathologies = useMemo(
    () =>
      PATHOLOGY_REFERENCES.slice().sort((a, b) =>
        a.pathology.localeCompare(b.pathology, "pt-BR", { sensitivity: "base" })
      ),
    []
  );

  const activeBlock = activePathology
    ? sortedPathologies.find((p) => p.pathology === activePathology)
    : null;

  const filteredRefs = useMemo(() => {
    if (!activeBlock) return [];
    const all = [...activeBlock.refs, ...GENERAL_REFERENCES];
    return all
      .filter((r) => matches(r, search))
      .sort((a, b) => b.year - a.year);
  }, [activeBlock, search]);

  return (
    <div className="min-h-screen bg-secondary/20 p-4">
      <div className="mx-auto max-w-5xl">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Dashboard
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Biblioteca científica</h1>
            <p className="text-sm text-muted-foreground">
              Referências organizadas por patologia. Visível apenas para o médico — nunca aparece nos PDFs.
            </p>
          </div>
        </div>

        {!activeBlock ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedPathologies.map((p) => (
                <Card
                  key={p.pathology}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setActivePathology(p.pathology)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{p.pathology}</CardTitle>
                    <CardDescription className="text-xs">
                      {p.refs.length} estudo(s) específico(s) · {GENERAL_REFERENCES.length} ref. gerais
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary" className="text-xs">
                      Faixa: {p.doseReference}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Referências gerais (válidas para todas patologias)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {GENERAL_REFERENCES.slice()
                  .sort((a, b) => b.year - a.year)
                  .map((r) => (
                    <RefBlock key={r.doi + r.title} r={r} />
                  ))}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => { setActivePathology(null); setSearch(""); }} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-1" /> Todas as patologias
            </Button>
            <Card>
              <CardHeader>
                <CardTitle>{activeBlock.pathology}</CardTitle>
                <CardDescription>
                  Faixa de referência: <strong>{activeBlock.doseReference}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por autor, título ou palavra-chave..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {filteredRefs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Nenhuma referência encontrada para "{search}".
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredRefs.map((r) => (
                      <RefBlock key={r.doi + r.title} r={r} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function RefBlock({ r }: { r: ScientificReference }) {
  return (
    <div className="p-3 rounded-lg border bg-card">
      <p className="text-sm font-semibold">{r.authors}</p>
      <p className="text-sm">"{r.title}"</p>
      <p className="text-xs text-muted-foreground mt-1">
        {r.journal} · {r.year}
      </p>
      <p className="text-xs text-muted-foreground italic mt-0.5">{r.doseInfo}</p>
      <div className="mt-2">
        <a href={pubmedUrlForDoi(r.doi)} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="h-7 text-xs">
            doi:{r.doi} · Abrir no PubMed <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </a>
      </div>
    </div>
  );
}
