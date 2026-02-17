import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/services/supabase";

export type ParentResource = {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
  sort_order: number;
  category: string | null;
};

export function useParentResources(): {
  resources: ParentResource[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [resources, setResources] = useState<ParentResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from("parent_resources")
      .select("id, title, description, file_url, sort_order, category")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError(fetchError.message ?? "Failed to load resources");
      setResources([]);
    } else {
      setResources((data ?? []) as ParentResource[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    resources,
    loading,
    error,
    refetch: fetchData,
  };
}
