import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AdventurePlanDraft } from "@/services/adventurePlanService";

export type SignUpPlayer = {
  name: string;
  nickname: string;
  colour: string;
};

type SignUpContextValue = {
  parentEmail: string;
  setParentEmail: (email: string) => void;
  /** Account password (collected on the account step). Never persisted. */
  password: string;
  setPassword: (password: string) => void;
  players: SignUpPlayer[];
  addPlayer: (player: SignUpPlayer) => void;
  removePlayer: (index: number) => void;
  /** Move player at fromIndex to toIndex (e.g. to top with toIndex 0). */
  movePlayer: (fromIndex: number, toIndex: number) => void;
  /** Replace player at index (e.g. after editing). */
  replacePlayer: (index: number, player: SignUpPlayer) => void;
  /** Replace the whole explorer list at once. */
  setAllPlayers: (players: SignUpPlayer[]) => void;
  /** Team name chosen on "Choose your team" (e.g. "Bears", "Foxes", "Otters"). */
  selectedTeamName: string | null;
  setSelectedTeamName: (name: string | null) => void;
  /** When the family plans their first adventure (asked before the account is created). */
  adventurePlan: AdventurePlanDraft | null;
  setAdventurePlan: (plan: AdventurePlanDraft | null) => void;
  /** True once players, team and plan are chosen and only the account is left to create. */
  hasPendingSetup: boolean;
  /** True once the persisted draft has been restored from storage. */
  draftLoaded: boolean;
  clearSignUpData: () => void;
  /** True only once after completing sign-up; used to show welcome modal then dismiss. */
  showPostSignUpWelcome: boolean;
  setShowPostSignUpWelcome: (value: boolean) => void;
  /** Tutorial step: welcome → missions → team → journal → done */
  tutorialStep: "welcome" | "missions" | "team" | "journal" | "done";
  setTutorialStep: (step: "welcome" | "missions" | "team" | "journal" | "done") => void;
  /** When true, show tutorial even if user has completed it (e.g. "Show tutorial again" from Settings). */
  replayTutorialRequested: boolean;
  setReplayTutorialRequested: (value: boolean) => void;
  /** True while the post-sign-up tutorial overlay is active (skip tab refetches). */
  isTutorialActive: boolean;
};

const SignUpContext = createContext<SignUpContextValue | null>(null);

/**
 * The onboarding draft survives the app being closed (e.g. while the parent
 * checks their email), so nobody has to pick a team twice.
 */
const DRAFT_KEY = "huntly.signUpDraft.v1";

type Draft = {
  parentEmail: string;
  players: SignUpPlayer[];
  selectedTeamName: string | null;
  adventurePlan: AdventurePlanDraft | null;
};

export function SignUpProvider({ children }: { children: React.ReactNode }) {
  const [parentEmail, setParentEmail] = useState("");
  const [password, setPassword] = useState("");
  const [players, setPlayers] = useState<SignUpPlayer[]>([]);
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null);
  const [adventurePlan, setAdventurePlan] = useState<AdventurePlanDraft | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [showPostSignUpWelcome, setShowPostSignUpWelcome] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<
    "welcome" | "missions" | "team" | "journal" | "done"
  >("welcome");
  const [replayTutorialRequested, setReplayTutorialRequested] = useState(false);
  const restoredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const draft = JSON.parse(raw) as Partial<Draft>;
        if (draft.parentEmail) setParentEmail((prev) => prev || draft.parentEmail!);
        if (Array.isArray(draft.players)) setPlayers((prev) => (prev.length ? prev : draft.players!));
        if (draft.selectedTeamName) setSelectedTeamName((prev) => prev ?? draft.selectedTeamName!);
        if (draft.adventurePlan) setAdventurePlan((prev) => prev ?? draft.adventurePlan!);
      })
      .catch(() => undefined)
      .finally(() => {
        restoredRef.current = true;
        if (!cancelled) setDraftLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!restoredRef.current) return;
    const draft: Draft = { parentEmail, players, selectedTeamName, adventurePlan };
    const empty = !parentEmail && players.length === 0 && !selectedTeamName && !adventurePlan;
    (empty ? AsyncStorage.removeItem(DRAFT_KEY) : AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft))).catch(
      () => undefined
    );
  }, [parentEmail, players, selectedTeamName, adventurePlan, draftLoaded]);

  const addPlayer = useCallback((player: SignUpPlayer) => {
    setPlayers((prev) => [...prev, player]);
  }, []);

  const removePlayer = useCallback((index: number) => {
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const movePlayer = useCallback((fromIndex: number, toIndex: number) => {
    setPlayers((prev) => {
      if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= prev.length) return prev;
      const item = prev[fromIndex];
      const next = [...prev];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  const replacePlayer = useCallback((index: number, player: SignUpPlayer) => {
    setPlayers((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = [...prev];
      next[index] = player;
      return next;
    });
  }, []);

  const clearSignUpData = useCallback(() => {
    setParentEmail("");
    setPassword("");
    setPlayers([]);
    setSelectedTeamName(null);
    setAdventurePlan(null);
  }, []);

  const hasPendingSetup = players.length > 0 && selectedTeamName != null && adventurePlan != null;

  const isTutorialActive = useMemo(
    () => showPostSignUpWelcome && tutorialStep !== "done",
    [showPostSignUpWelcome, tutorialStep]
  );

  return (
    <SignUpContext.Provider
      value={{
        parentEmail,
        setParentEmail,
        password,
        setPassword,
        players,
        addPlayer,
        removePlayer,
        movePlayer,
        replacePlayer,
        setAllPlayers: setPlayers,
        selectedTeamName,
        setSelectedTeamName,
        adventurePlan,
        setAdventurePlan,
        hasPendingSetup,
        draftLoaded,
        clearSignUpData,
        showPostSignUpWelcome,
        setShowPostSignUpWelcome,
        tutorialStep,
        setTutorialStep,
        replayTutorialRequested,
        setReplayTutorialRequested,
        isTutorialActive,
      }}
    >
      {children}
    </SignUpContext.Provider>
  );
}

export function useSignUp() {
  const ctx = useContext(SignUpContext);
  if (!ctx) {
    throw new Error("useSignUp must be used within SignUpProvider");
  }
  return ctx;
}

export function useSignUpOptional() {
  return useContext(SignUpContext);
}
