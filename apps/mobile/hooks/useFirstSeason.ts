import { useState, useEffect, useCallback } from "react";
import type { ImageSourcePropType } from "react-native";
import { supabase } from "@/services/supabase";

const DEFAULT_SEASON_HERO_IMAGE = require("@/assets/images/whispering-wind.png");

export type StorySlide =
  | { type: "text"; value: string }
  | { type: "image"; value: string }
  | { type: "text-image"; text: string; image: string };

export type FirstSeason = {
  id: number;
  name: string | null;
  hero_image: string | null;
  story: string | null;
  story_parts: string[] | null;
  story_slides: StorySlide[] | null;
} | null;

export function useFirstSeason(): {
  firstSeason: FirstSeason;
  seasonNumber: number;
  heroImageSource: ImageSourcePropType;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [firstSeason, setFirstSeason] = useState<FirstSeason>(null);
  const [seasonNumber, setSeasonNumber] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);
    const { data: seasons, error: err } = await supabase
      .from("seasons")
      .select("id, name, hero_image, story, story_parts, story_slides, created_at")
      .order("created_at", { ascending: false });
    if (err) {
      setError(err.message ?? "Failed to load season");
      setFirstSeason(null);
      setSeasonNumber(0);
    } else {
      const latest = seasons?.[0] ?? null;
      const count = seasons?.length ?? 0;
      setFirstSeason(latest ? { id: latest.id, name: latest.name, hero_image: latest.hero_image, story: latest.story, story_parts: latest.story_parts, story_slides: latest.story_slides } : null);
      setSeasonNumber(count);
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

  return { firstSeason, seasonNumber, heroImageSource, loading, error, refetch: fetchData };
}
