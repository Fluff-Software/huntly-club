import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/services/supabase';

export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [message, setMessage] = useState<string>('Confirming your account...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function confirmEmail() {
      try {
        // The access_token and refresh_token should be in the URL params
        // These are automatically handled by Supabase Auth
        
        // Check if we have a session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (data?.session) {
          setMessage('Your email has been confirmed!');
          
          setTimeout(() => {
            router.replace('/sign-up/players');
          }, 2000);
        } else {
          setError('Unable to confirm your account. Try signing in.');
          
          // Wait a moment before redirecting to login
          setTimeout(() => {
            router.replace('/auth');
          }, 3000);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred during confirmation';
        setError(errorMessage);
        
        // Wait a moment before redirecting to login
        setTimeout(() => {
          router.replace('/auth');
        }, 3000);
      }
    }

    confirmEmail();
  }, [router, params]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ title: 'Email Confirmation', headerShown: false }} />
      
      {!error ? (
        <>
          <ActivityIndicator size="large" color="#0284c7" style={styles.loader} />
          <ThemedText type="subtitle" style={styles.message}>{message}</ThemedText>
        </>
      ) : (
        <ThemedText type="subtitle" style={styles.error}>{error}</ThemedText>
      )}
      
      <ThemedText style={styles.redirectText}>
        {error ? 'Redirecting to login...' : 'Redirecting to set up your explorers...'}
      </ThemedText>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loader: {
    marginBottom: 20,
  },
  message: {
    textAlign: 'center',
    marginBottom: 10,
  },
  error: {
    textAlign: 'center',
    color: '#ef4444',
    marginBottom: 10,
  },
  redirectText: {
    marginTop: 20,
    opacity: 0.7,
  },
}); 