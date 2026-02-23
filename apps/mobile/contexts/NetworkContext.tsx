import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

export type NetworkContextType = {
  /** True when the device has an active connection (Wi‑Fi or cellular). */
  isConnected: boolean | null;
  /** True when the connection is likely to reach the internet (may be null if unknown). */
  isInternetReachable: boolean | null;
  /** Increments each time we transition from offline to online. Use in useEffect deps to refetch when back online. */
  backOnlineTrigger: number;
  /** Call this to refetch data when connection is restored. Register once (e.g. in useEffect). */
  onBackOnline: (callback: () => void) => () => void;
};

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);
  const [backOnlineTrigger, setBackOnlineTrigger] = useState(0);
  const wasOffline = useRef(false);
  const callbacks = useRef<Set<() => void>>(new Set());

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? false;
      const reachable = state.isInternetReachable;
      setIsConnected(connected);
      setIsInternetReachable(reachable);

      const effectivelyOffline = !connected || reachable === false;
      if (effectivelyOffline) {
        wasOffline.current = true;
      } else if (wasOffline.current) {
        wasOffline.current = false;
        setBackOnlineTrigger((n) => n + 1);
        callbacks.current.forEach((cb) => {
          try {
            cb();
          } catch (e) {
            console.warn("[NetworkContext] onBackOnline callback error:", e);
          }
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const onBackOnline = useCallback((callback: () => void) => {
    callbacks.current.add(callback);
    return () => {
      callbacks.current.delete(callback);
    };
  }, []);

  const value: NetworkContextType = {
    isConnected,
    isInternetReachable,
    backOnlineTrigger,
    onBackOnline,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextType {
  const ctx = useContext(NetworkContext);
  if (ctx === undefined) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return ctx;
}
