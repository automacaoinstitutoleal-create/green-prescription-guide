import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BookOpen, ExternalLink, Search, Star, Share2, Filter, X, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  GENERAL_REFERENCES,
  PATHOLOGY_REFERENCES,
  externalUrlForRef,
  doiOrgUrl,
  getAllTags,
  totalReferenceCount,
  searchAllReferences,
  type ScientificReference,
  type PathologyReferences,
} from "@/lib/scientificReferences";
import { useFavoriteReferences } from "@/hooks/useFavoriteReferences";

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function matchesSearch(r: ScientificReference, term: string) {
  if (!term) return true;
  const t = normalize(term);
  const haystack = normalize(`${r.authors} ${r.title} ${r.journal} ${r.doi} ${r.doseInfo} ${(r.tags || []).join(" ")}`);
  return haystack.includes(t);
}

function matchesTags(r: ScientificReference, activeTags: Set<string>) {
  if (activeTags.size === 0) return true;
  if (!r.tags) return false;
  return Array.from(activeTags).every((t) => r.tags!.includes(t));
}

interface RefRowProps {
  r: ScientificReference;
  pathology?: string | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

function RefRow({ r, pathology, isFavorite, onToggleFavorite }: RefRowProps) {
  const handleShare = async () => {
    const text = `📚 ${r.authors}\n"${r.title}"\n${r.journal} · ${r.year}\n${r.doseInfo}\nDOI: ${r.doi}\n${externalUrlForRef(r)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: r.title,
          text,
          url: externalUrlForRef(r),
        });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Referência copiada para área de transferência!");
      }
    } catch (err: unknown) {
      const error = err as { name?: string };
      if (error?.name !== "AbortError") {
        toast.error("Não foi possível compartilhar");
      }
    }
  };

  const handleWhatsapp = () => {
    const text = encodeURIComponent(
      `📚 *${r.title}*\n\n${r.authors}\n${r.journal} · ${r.year}\n\n${r.doseInfo}\n\nDOI: ${r.doi}\n${externalUrlForRef(r)}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="py-3 border-b last:border-b-0 border-border/50 group">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{r.authors}</p>
          <p className="text-sm text-foreground/90 leading-snug mt-0.5">"{r.title}"</p>
          <p className="text-xs text-muted-foreground mt-1">
            {r.journal} · {r.year}
            {pathology && <> · <span className="text-primary/80">{pathology}</span></>}
          </p>
          <p className="text-xs text-muted-foreground italic mt-0.5">{r.doseInfo}</p>

          {r.tags && r.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {r.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-2">
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
            <span className="text-[10px] text-muted-foreground">doi:{r.doi}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggleFavorite}
            title={isFavorite ? "Remover dos favoritos" : "Favoritar"}
          >
            <Star className={`h-4 w-4 ${isFavorite ? "fill-amber-400 text-amber-500" : "text-muted-foreground"}`} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleShare}
            title="Compartilhar"
          >
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleWhatsapp}
            title="Compartilhar no WhatsApp"
          >
            <span className="text-sm">📱</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ScientificLibrary() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activePathology, setActivePathology] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"browse" | "search" | "favorites">("browse");

  const { favorites, isFavorite, toggle: toggleFav } = useFavoriteReferences();

  const sortedPathologies = useMemo(
    () =>
      PATHOLOGY_REFERENCES.slice().sort((a, b) =>
        a.pathology.localeCompare(b.pathology, "pt-BR", { sensitivity: "base" })
      ),
    []
  );

  const allTags = useMemo(() => getAllTags(), []);
  const totalRefs = useMemo(() => totalReferenceCount(), []);

  const activeBlock = activePathology
    ? sortedPathologies.find((p) => p.pathology === activePathology)
    : null;

  const filteredPathologyRefs = useMemo(() => {
    if (!activeBlock) return [];
    const all = [...activeBlock.refs, ...GENERAL_REFERENCES];
    return all
      .filter((r) => matchesSearch(r, search) && matchesTags(r, activeTags))
      .sort((a, b) => b.year - a.year);
  }, [activeBlock, search, activeTags]);

  const globalSearchResults = useMemo(() => {
    return searchAllReferences(search).filter((item) => matchesTags(item.ref, activeTags));
  }, [search, activeTags]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const clearFilters = () => {
    setActiveTags(new Set());
    setSearch("");
  };

  // Map favorites to actual references for richer display
  const favoritedRefs = useMemo(() => {
    const allRefs = [
      ...GENERAL_REFERENCES.map((r) => ({ ref: r, pathology: null as string | null })),
      ...PATHOLOGY_REFERENCES.flatMap((p) => p.refs.map((r) => ({ ref: r, pathology: p.pathology }))),
    ];
    return favorites
      .map((fav) => allRefs.find((x) => x.ref.doi === fav.reference_doi))
      .filter((x): x is { ref: ScientificReference; pathology: string | null } => Boolean(x));
  }, [favorites]);

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
              {totalRefs} referências organizadas por patologia. Visível apenas para o médico — nunca aparece nos PDFs.
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-6">
          <TabsList className="grid grid-cols-3 w-full sm:w-[460px]">
            <TabsTrigger value="browse">
              <BookOpen className="h-4 w-4 mr-1" /> Por patologia
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-1" /> Buscar tudo
            </TabsTrigger>
            <TabsTrigger value="favorites">
              <Star className="h-4 w-4 mr-1" /> Favoritos {favorites.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{favorites.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* ═══ Search bar (visible in all tabs) ═══ */}
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={tab === "search" ? "Buscar em todas as patologias por título, autor, dose, tag…" : "Filtrar por título, autor, dose…"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Tag filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground shrink-0">Filtrar por tipo:</span>
              {allTags.map((tag) => {
                const active = activeTags.has(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
              {(activeTags.size > 0 || search) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-destructive hover:underline ml-1"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {/* ═══ TAB 1: Browse by pathology ═══ */}
          <TabsContent value="browse" className="mt-6">
            {!activeBlock ? (
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
                        {p.doseReference}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Badge variant="outline" className="text-xs">
                        {p.refs.length} estudos específicos
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{activeBlock.pathology}</CardTitle>
                      <CardDescription className="mt-1">
                        Faixa de dose recomendada: <strong>{activeBlock.doseReference}</strong>
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setActivePathology(null)}>
                      <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredPathologyRefs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhuma referência corresponde aos filtros aplicados.
                    </p>
                  ) : (
                    <div>
                      {filteredPathologyRefs.map((r) => (
                        <RefRow
                          key={r.doi + r.title}
                          r={r}
                          isFavorite={isFavorite(r.doi)}
                          onToggleFavorite={() => toggleFav({ doi: r.doi, title: r.title, pathology: activeBlock.pathology })}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══ TAB 2: Global search ═══ */}
          <TabsContent value="search" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {search ? `Resultados da busca (${globalSearchResults.length})` : "Digite algo para buscar em toda a base"}
                </CardTitle>
                <CardDescription className="text-xs">
                  Busca por: autores, título, periódico, DOI, dose, tags. Filtros adicionais por tags são aplicados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!search ? (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    Use a barra de busca acima para encontrar artigos em toda a biblioteca.
                  </p>
                ) : globalSearchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    Nenhum resultado para "{search}".
                  </p>
                ) : (
                  <div>
                    {globalSearchResults.map((item) => (
                      <RefRow
                        key={item.ref.doi + item.ref.title}
                        r={item.ref}
                        pathology={item.pathology}
                        isFavorite={isFavorite(item.ref.doi)}
                        onToggleFavorite={() =>
                          toggleFav({
                            doi: item.ref.doi,
                            title: item.ref.title,
                            pathology: item.pathology,
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 3: Favorites ═══ */}
          <TabsContent value="favorites" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meus favoritos ({favoritedRefs.length})</CardTitle>
                <CardDescription className="text-xs">
                  Artigos que você marcou para acesso rápido. Sincronizados na sua conta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {favoritedRefs.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Você ainda não favoritou nenhum artigo.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique no ícone <Star className="inline h-3 w-3" /> em qualquer artigo para favoritá-lo.
                    </p>
                  </div>
                ) : (
                  <div>
                    {favoritedRefs
                      .filter(({ ref }) => matchesSearch(ref, search) && matchesTags(ref, activeTags))
                      .map(({ ref, pathology }) => (
                        <RefRow
                          key={ref.doi + ref.title}
                          r={ref}
                          pathology={pathology}
                          isFavorite={true}
                          onToggleFavorite={() => toggleFav({ doi: ref.doi, title: ref.title, pathology })}
                        />
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
