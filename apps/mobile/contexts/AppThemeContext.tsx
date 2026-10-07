/**
 * Seasonal theme provider.
 *
 * Reads the live theme from `app_themes` (date-windowed, edited in admin),
 * caches it so a cold start / offline launch still themes (or un-themes)
 * correctly, and re-evaluates the window locally -- so the app reverts to
 * normal on its own when `ends_at` passes, even with no network.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { vars } from "nativewind";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState, View } from "react-native";
import {
  APP_THEMES,
  isAppThemeSlug,
  remapColor,
  type AppThemePalette,
} from "@/constants/appThemes";
import { supabase } from "@/services/supabase";

const CACHE_KEY = "huntly.appThemes.v1";
const REFRESH_MIN_INTERVAL_MS = 60_000;
/** setTimeout overflows past ~24.8 days. */
const MAX_TIMEOUT_MS = 2_147_000_000;

export type ThemeWindow = {
  slug: string;
  startsAt: number;
  endsAt: number;
};

type AppThemeValue = {
  /** Live palette, or null for the normal look. */
  theme: AppThemePalette | null;
  /** Remap a brand colour for the live theme (identity when none). */
  c: (color: string) => string;
};

const IDENTITY: AppThemeValue = { theme: null, c: (color) => color };
const AppThemeContext = createContext<AppThemeValue>(IDENTITY);

/** Safe outside the provider (tests, storybook): returns the normal look. */
export function useAppTheme(): AppThemeValue {
  return useContext(AppThemeContext);
}

/** First enabled window containing `now`, if its palette ships in this build. */
export function pickLiveWindow(windows: ThemeWindow[], now: number): ThemeWindow | null {
  return (
    windows
      .filter((w) => isAppThemeSlug(w.slug) && now >= w.startsAt && now < w.endsAt)
      .sort((a, b) => b.startsAt - a.startsAt)[0] ?? null
  );
}

/** Next instant the live theme could change (a window starting or ending). */
export function nextBoundary(windows: ThemeWindow[], now: number): number | null {
  let next: number | null = null;
  for (const w of windows) {
    for (const t of [w.startsAt, w.endsAt]) {
      if (t > now && (next === null || t < next)) next = t;
    }
  }
  return next;
}

async function loadCache(): Promise<ThemeWindow[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (w): w is ThemeWindow =>
            !!w &&
            typeof w.slug === "string" &&
            typeof w.startsAt === "number" &&
            typeof w.endsAt === "number"
        )
      : [];
  } catch {
    return [];
  }
}

async function fetchWindows(): Promise<ThemeWindow[] | null> {
  const { data, error } = await supabase
    .from("app_themes")
    .select("slug, starts_at, ends_at")
    .eq("is_active", true);
  if (error || !Array.isArray(data)) return null;
  return data.map((row: Record<string, unknown>) => ({
    slug: String(row.slug),
    startsAt: new Date(String(row.starts_at)).getTime(),
    endsAt: new Date(String(row.ends_at)).getTime(),
  }));
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [windows, setWindows] = useState<ThemeWindow[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const lastRefreshRef = React.useRef(0);

  const refresh = useCallback(async (force = false) => {
    if (!force && Date.now() - lastRefreshRef.current < REFRESH_MIN_INTERVAL_MS) return;
    lastRefreshRef.current = Date.now();
    const fresh = await fetchWindows();
    if (!fresh) return;
    setWindows(fresh);
    setNow(Date.now());
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
    } catch {
      // Cache is best-effort.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadCache().then((cached) => {
      if (!cancelled) {
        setWindows((current) => (current.length ? current : cached));
        setNow(Date.now());
      }
    });
    void refresh(true);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setNow(Date.now());
        void refresh();
      }
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [refresh]);

  // Flip exactly when a window opens or closes -- no network needed to revert.
  useEffect(() => {
    const boundary = nextBoundary(windows, now);
    if (boundary === null) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(boundary - now + 250, MAX_TIMEOUT_MS));
    return () => clearTimeout(timer);
  }, [windows, now]);

  const live = pickLiveWindow(windows, now);
  // Dev builds only: EXPO_PUBLIC_FORCE_THEME=halloween previews a theme without
  // needing a live schedule row. Stripped to a no-op in release builds.
  const forced = __DEV__ ? process.env.EXPO_PUBLIC_FORCE_THEME : undefined;
  const palette = isAppThemeSlug(forced)
    ? APP_THEMES[forced]
    : live && isAppThemeSlug(live.slug)
      ? APP_THEMES[live.slug]
      : null;

  const value = useMemo<AppThemeValue>(
    () => (palette ? { theme: palette, c: (color) => remapColor(color, palette) } : IDENTITY),
    [palette]
  );

  const tailwindVars = useMemo(() => {
    if (!palette) return {};
    const entries: Record<string, string> = {};
    for (const [token, channels] of Object.entries(palette.tailwind)) {
      entries[`--huntly-${token}`] = channels;
    }
    return vars(entries);
  }, [palette]);

  // Always render the wrapper (even un-themed) so toggling a theme never
  // remounts the tree and loses screen state.
  return (
    <AppThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, tailwindVars]}>{children}</View>
    </AppThemeContext.Provider>
  );
}
