/**
 * Shared binder UI state (pulled / highlighted card) for sleeve grid cells.
 */
import React, { createContext, useContext } from "react";

type BinderInteractionValue = {
  pulledId: string | null;
  highlightId: string | null;
};

const BinderInteractionContext = createContext<BinderInteractionValue>({
  pulledId: null,
  highlightId: null,
});

export function BinderInteractionProvider({
  pulledId,
  highlightId,
  children,
}: BinderInteractionValue & { children: React.ReactNode }) {
  return (
    <BinderInteractionContext.Provider value={{ pulledId, highlightId }}>
      {children}
    </BinderInteractionContext.Provider>
  );
}

export function useBinderInteraction() {
  return useContext(BinderInteractionContext);
}
