import React, { createContext, useContext, useState, useCallback } from "react";

export type SignUpPlayer = {
  name: string;
  nickname: string;
  colour: string;
};

type SignUpContextValue = {
  parentEmail: string;
  setParentEmail: (email: string) => void;
  /** Account password (collected on first sign-up step). */
  password: string;
  setPassword: (password: string) => void;
  players: SignUpPlayer[];
  addPlayer: (player: SignUpPlayer) => void;
  removePlayer: (index: number) => void;
  /** Move player at fromIndex to toIndex (e.g. to top with toIndex 0). */
  movePlayer: (fromIndex: number, toIndex: number) => void;
  /** Replace player at index (e.g. after editing). */
  replacePlayer: (index: number, player: SignUpPlayer) => void;
  /** Team name chosen on "Choose your team" (e.g. "Bears", "Foxes", "Otters"). */
  selectedTeamName: string | null;
  setSelectedTeamName: (name: string | null) => void;
  clearSignUpData: () => void;
  /** True only once after completing sign-up; used to show welcome modal then dismiss. */
  showPostSignUpWelcome: boolean;
  setShowPostSignUpWelcome: (value: boolean) => void;
  /** Tutorial step: intro → ... → team → wrap_up → done */
  tutorialStep:
    | "intro"
    | "clubhouse"
    | "click_story"
    | "seasons"
    | "click_missions"
    | "missions"
    | "click_team"
    | "team"
    | "wrap_up"
    | "done";
  setTutorialStep: (
    step:
      | "intro"
      | "clubhouse"
      | "click_story"
      | "seasons"
      | "click_missions"
      | "missions"
      | "click_team"
      | "team"
      | "wrap_up"
      | "done"
  ) => void;
  /** When true, show tutorial even if user has completed it (e.g. "Show tutorial again" from Settings). */
  replayTutorialRequested: boolean;
  setReplayTutorialRequested: (value: boolean) => void;
};

const SignUpContext = createContext<SignUpContextValue | null>(null);

export function SignUpProvider({ children }: { children: React.ReactNode }) {
  const [parentEmail, setParentEmail] = useState("");
  const [password, setPassword] = useState("");
  const [players, setPlayers] = useState<SignUpPlayer[]>([]);
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null);
  const [showPostSignUpWelcome, setShowPostSignUpWelcome] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<
    "intro" | "clubhouse" | "click_story" | "seasons" | "click_missions" | "missions" | "click_team" | "team" | "wrap_up" | "done"
  >("intro");
  const [replayTutorialRequested, setReplayTutorialRequested] = useState(false);

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
  }, []);

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
        selectedTeamName,
        setSelectedTeamName,
        clearSignUpData,
        showPostSignUpWelcome,
        setShowPostSignUpWelcome,
        tutorialStep,
        setTutorialStep,
        replayTutorialRequested,
        setReplayTutorialRequested,
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
