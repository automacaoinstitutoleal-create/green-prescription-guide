import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FavoriteReference {
  id: string;
  reference_doi: string;
  reference_title: string;
  pathology: string | null;
  notes: string | null;
  created_at: string;
}

export function useFavoriteReferences() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteReference[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("favorite_references")
      .select("*")
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Erro ao carregar favoritos:", error);
    } else {
      setFavorites((data as FavoriteReference[]) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isFavorite = useCallback(
    (doi: string) => favorites.some((f) => f.reference_doi === doi),
    [favorites]
  );

  const toggle = useCallback(
    async (params: { doi: string; title: string; pathology?: string | null }) => {
      if (!user) {
        toast.error("Faça login para favoritar artigos");
        return;
      }
      const existing = favorites.find((f) => f.reference_doi === params.doi);
      if (existing) {
        const { error } = await supabase.from("favorite_references").delete().eq("id", existing.id);
        if (error) {
          toast.error("Erro ao remover favorito");
          return;
        }
        setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
        toast.success("Removido dos favoritos");
      } else {
        const { data, error } = await supabase
          .from("favorite_references")
          .insert({
            doctor_id: user.id,
            reference_doi: params.doi,
            reference_title: params.title,
            pathology: params.pathology ?? null,
          })
          .select()
          .single();
        if (error) {
          toast.error("Erro ao favoritar: " + error.message);
          return;
        }
        if (data) setFavorites((prev) => [data as FavoriteReference, ...prev]);
        toast.success("Adicionado aos favoritos!");
      }
    },
    [user, favorites]
  );

  return { favorites, loading, isFavorite, toggle, refresh };
}
