import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import * as Linking from 'expo-linking';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { PurchasesProvider } from '@/contexts/PurchasesContext';
import { AuthGuard } from '@/components/authentication/AuthGuard';

import "../global.css"

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Handle deep links
  useEffect(() => {
    // Add event listener for deep links
    const subscription = Linking.addEventListener('url', (event) => {
      const parsed = Linking.parse(event.url);
      
      // Handle authentication redirect URLs
      if (parsed.path?.includes('auth/confirm')) {
        router.replace('/auth/confirm');
      }
    });

    // Check for initial URL when app starts
    const checkInitialLink = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const parsed = Linking.parse(initialUrl);
        
        // Handle authentication redirect URLs
        if (parsed.path?.includes('auth/confirm')) {
          router.replace('/auth/confirm');
        }
      }
    };

    checkInitialLink();

    return () => {
      subscription.remove();
    };
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <PurchasesProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthGuard>
            <Slot />
          </AuthGuard>
          <StatusBar style="auto" />
        </ThemeProvider>
      </PurchasesProvider>
    </AuthProvider>
  );
}
