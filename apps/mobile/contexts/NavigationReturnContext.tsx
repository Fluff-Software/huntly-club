import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
} from "react";
import { router, usePathname, type Href } from "expo-router";

type NavigationReturnContextValue = {
  /** Push a route and remember the current screen to return to. */
  pushWithReturn: (href: Href) => void;
  /** Return to the screen before the last pushWithReturn, or use native back / Clubhouse. */
  goBack: (options?: { fallbackRoute?: Href }) => void;
};

const NavigationReturnContext =
  createContext<NavigationReturnContextValue | null>(null);

export function NavigationReturnProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const returnStackRef = useRef<string[]>([]);

  const pushWithReturn = useCallback(
    (href: Href) => {
      returnStackRef.current.push(pathname);
      router.push(href);
    },
    [pathname]
  );

  const goBack = useCallback((options?: { fallbackRoute?: Href }) => {
    const fallback = options?.fallbackRoute ?? "/(tabs)";
    const stack = returnStackRef.current;
    if (stack.length > 0) {
      const target = stack.pop()!;
      router.replace(target as Href);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallback);
  }, []);

  return (
    <NavigationReturnContext.Provider value={{ pushWithReturn, goBack }}>
      {children}
    </NavigationReturnContext.Provider>
  );
}

export function useNavigationReturn(): NavigationReturnContextValue {
  const ctx = useContext(NavigationReturnContext);
  if (!ctx) {
    throw new Error(
      "useNavigationReturn must be used within NavigationReturnProvider"
    );
  }
  return ctx;
}

export function useNavigationReturnOptional() {
  return useContext(NavigationReturnContext);
}
