import { useState, useEffect, useCallback } from "react";
import type { ImageSourcePropType } from "react-native";
import { supabase } from "@/services/supabase";

const DEFAULT_SEASON_HERO_IMAGE = require("@/assets/images/whispering-wind.png");

export type FirstSeason = { name: string | null; hero_image: string | null; story: string | null } | null;

export function useFirstSeason(): {
  firstSeason: FirstSeason;
  heroImageSource: ImageSourcePropType;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [firstSeason, setFirstSeason] = useState<FirstSeason>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);
    const { data, error: err } = await supabase
      .from("seasons")
      .select("name, hero_image, story")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (err) {
      setError(err.message ?? "Failed to load season");
      setFirstSeason(null);
    } else {
      setFirstSeason(data ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const heroImageSource: ImageSourcePropType =
    firstSeason?.hero_image != null && firstSeason.hero_image !== ""
      ? { uri: firstSeason.hero_image }
      : DEFAULT_SEASON_HERO_IMAGE;

  return { firstSeason, heroImageSource, loading, error, refetch: fetchData };
}
