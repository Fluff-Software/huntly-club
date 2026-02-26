import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { View } from "react-native";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

type NetworkContextType = {
  /** True when the device has an active network connection. */
  isConnected: boolean;
  /** True only after we have received at least one state (avoids flashing offline on init). */
  isReady: boolean;
};

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

/**
 * When the user goes from offline → online, we remount the entire app tree (by changing key)
 * so that all providers, screens, and state refresh as if the app was freshly opened.
 */
export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NetInfoState | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const prevConnectedRef = useRef<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((nextState) => {
      setState(nextState);
    });

    NetInfo.fetch().then(setState);

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (state === null) return;
    const isConnected = state.isConnected ?? false;
    const prev = prevConnectedRef.current;

    if (prev === null) {
      prevConnectedRef.current = isConnected;
      return;
    }
    if (prev === false && isConnected === true) {
      setRefreshKey((k) => k + 1);
      prevConnectedRef.current = true;
    } else if (!isConnected) {
      prevConnectedRef.current = false;
    }
  }, [state]);

  const isConnected = state?.isConnected ?? false;
  const isReady = state !== null;

  const value: NetworkContextType = {
    isConnected,
    isReady,
  };

  return (
    <NetworkContext.Provider value={value}>
      <View key={refreshKey} style={{ flex: 1 }}>
        {children}
      </View>
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextType {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}
