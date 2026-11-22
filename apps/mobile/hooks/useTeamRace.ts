import { useCallback, useState } from "react";
import { type Guide, GUIDES } from "@/constants/guides";
import { teamKeyFromName, type TeamKey } from "@/constants/fieldKit";
import {
  getAllTeamsWithXp,
  getLastMonthTeamWinner,
  getTeamAchievements,
  getTeamAchievementTotals,
  type TeamAchievementEntry,
  type TeamMonthlyWinner,
} from "@/services/teamActivityService";

export type RaceRow = { team: TeamKey; guide: Guide; total: number };

export type TeamRace = {
  /** Highest first. Ties keep a stable team order. */
  rows: RaceRow[];
  mine: RaceRow | null;
  /** 1-based position of the family's team, sharing a place on a tie. */
  myPlace: number | null;
  leader: RaceRow | null;
  /** Points between the family's team and the team directly above it (0 when leading or tied). */
  gapToNext: number;
  next: RaceRow | null;
  allZero: boolean;
  daysLeft: number;
  monthName: string;
  /** Points the family's own explorers have added this month. */
  familyPoints: number;
  /** Recent moments for the family's team this month. */
  moments: TeamAchievementEntry[];
  lastMonthWinner: TeamMonthlyWinner | null;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function monthMeta(now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.max(0, end.getDate() - now.getDate());
  return { daysLeft, monthName: MONTHS[now.getMonth()] };
}

export function buildRace(
  teams: { id: number; name: string; team_xp?: number | null }[],
  totals: Record<number, number>,
  myTeamName: string | null | undefined
): Pick<TeamRace, "rows" | "mine" | "myPlace" | "leader" | "gapToNext" | "next" | "allZero"> {
  const rows: RaceRow[] = GUIDES.map((g) => {
    const t = teams.find((x) => teamKeyFromName(x.name) === g.team);
    return { team: g.team, guide: g, total: t ? totals[t.id] ?? 0 : 0 };
  }).sort((a, b) => b.total - a.total);
  const myKey = teamKeyFromName(myTeamName);
  const mine = rows.find((r) => r.team === myKey) ?? null;
  const myPlace = mine ? rows.filter((r) => r.total > mine.total).length + 1 : null;
  const above = mine ? rows.filter((r) => r.total > mine.total) : [];
  const next = above.length ? above[above.length - 1] : null;
  return {
    rows,
    mine,
    myPlace,
    leader: rows[0] ?? null,
    gapToNext: next && mine ? next.total - mine.total : 0,
    next,
    allZero: rows.every((r) => r.total === 0),
  };
}

/** Plain-English headline for the race, from the family's side. */
export function raceHeadline(race: Pick<TeamRace, "mine" | "myPlace" | "next" | "gapToNext" | "allZero" | "rows">): string {
  const { mine, myPlace, next, gapToNext, allZero, rows } = race;
  if (!mine || allZero) return "The race is wide open";
  const tiedTop = rows.filter((r) => r.total === mine.total).length > 1 && myPlace === 1;
  if (tiedTop) return `The ${mine.guide.teamName} are level at the top`;
  if (myPlace === 1) return `The ${mine.guide.teamName} are in the lead`;
  if (next) return `The ${mine.guide.teamName} are chasing the ${next.guide.teamName}`;
  return `The ${mine.guide.teamName} are in the race`;
}

const EMPTY: TeamRace = {
  rows: [],
  mine: null,
  myPlace: null,
  leader: null,
  gapToNext: 0,
  next: null,
  allZero: true,
  ...monthMeta(),
  familyPoints: 0,
  moments: [],
  lastMonthWinner: null,
};

/**
 * This month's team race. `detail` also loads the family's contribution, recent
 * team moments and last month's winner (used on the full Team race page).
 */
export function useTeamRace(
  myTeamName: string | null | undefined,
  myTeamId: number | null | undefined,
  profileIds: number[],
  { detail = false }: { detail?: boolean } = {}
) {
  const [race, setRace] = useState<TeamRace>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const idsKey = profileIds.join(",");

  const load = useCallback(async () => {
    try {
      setError(false);
      const [teams, totals] = await Promise.all([
        getAllTeamsWithXp(),
        getTeamAchievementTotals().catch(() => null),
      ]);
      const safeTotals = totals ?? Object.fromEntries(teams.map((t) => [t.id, t.team_xp ?? 0]));
      const base = buildRace(teams, safeTotals, myTeamName);
      let extra: Pick<TeamRace, "familyPoints" | "moments" | "lastMonthWinner"> = {
        familyPoints: 0,
        moments: [],
        lastMonthWinner: null,
      };
      if (detail) {
        const ids = new Set(idsKey ? idsKey.split(",").map(Number) : []);
        const [achievements, winner] = await Promise.all([
          myTeamId ? getTeamAchievements(myTeamId, 40).catch(() => []) : Promise.resolve([]),
          getLastMonthTeamWinner().catch(() => null),
        ]);
        extra = {
          familyPoints: achievements.filter((a) => ids.has(a.profile_id)).reduce((sum, a) => sum + (a.xp ?? 0), 0),
          moments: achievements.slice(0, 12),
          lastMonthWinner: winner,
        };
      }
      setRace({ ...base, ...monthMeta(), ...extra });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [myTeamName, myTeamId, idsKey, detail]);

  return { race, loading, error, load };
}
