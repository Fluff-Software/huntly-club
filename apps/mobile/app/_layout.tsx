import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Slot, router } from "expo-router";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import * as Linking from "expo-linking";
import {
  useFonts as useJuaFonts,
  Jua_400Regular,
} from "@expo-google-fonts/jua";
import {
  useFonts as useComicNeueFonts,
  ComicNeue_400Regular,
  ComicNeue_700Bold,
} from "@expo-google-fonts/comic-neue";

import { useColorScheme } from "@/hooks/useColorScheme";
import { AuthProvider } from "@/contexts/AuthContext";
import { NetworkProvider } from "@/contexts/NetworkContext";
import { PurchasesProvider } from "@/contexts/PurchasesContext";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { SignUpProvider } from "@/contexts/SignUpContext";
import { AuthGuard } from "@/components/authentication/AuthGuard";
import { supabase } from "@/services/supabase";

import "../global.css";

/** If the URL contains auth tokens in the hash (from email verification redirect), set the session. */
async function setSessionFromAuthConfirmUrl(url: string): Promise<void> {
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return;
  const fragment = url.slice(hashIndex + 1);
  const params = new URLSearchParams(fragment);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) {
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [juaLoaded] = useJuaFonts({
    Jua_400Regular,
  });
  const [comicNeueLoaded] = useComicNeueFonts({
    ComicNeue_400Regular,
    ComicNeue_700Bold,
  });
  const [spaceMonoLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const fontsLoaded = juaLoaded && comicNeueLoaded && spaceMonoLoaded;

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { screen?: string } | undefined;
      if (data?.screen === "story") {
        router.push("/(tabs)/story");
      }
    });
    return () => sub.remove();
  }, []);

  // Handle deep links (e.g. email verification: huntlyclub://auth/confirm#access_token=...)
  useEffect(() => {
    const handleAuthConfirmUrl = async (url: string) => {
      const parsed = Linking.parse(url);
      if (!parsed.path?.includes("auth/confirm")) return;
      await setSessionFromAuthConfirmUrl(url);
      router.replace("/auth/confirm");
    };

    const subscription = Linking.addEventListener("url", (event) => {
      void handleAuthConfirmUrl(event.url);
    });

    const checkInitialLink = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) await handleAuthConfirmUrl(initialUrl);
    };

    void checkInitialLink();

    return () => {
      subscription.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <NetworkProvider>
        <SignUpProvider>
          <PurchasesProvider>
            <PlayerProvider>
              <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
                <AuthGuard>
                  <Slot />
                </AuthGuard>
                <StatusBar style="auto" />
              </ThemeProvider>
            </PlayerProvider>
          </PurchasesProvider>
        </SignUpProvider>
      </NetworkProvider>
    </AuthProvider>
  );
}
