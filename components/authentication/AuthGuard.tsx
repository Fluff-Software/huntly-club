import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { getProfiles } from '@/services/profileService';

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [checkingProfiles, setCheckingProfiles] = useState(false);

  useEffect(() => {
    if (loading || checkingProfiles) return;

    const inAuthGroup = segments[0] === 'auth';
    
    const checkProfiles = async () => {
      if (!user) return;
      
      setCheckingProfiles(true);
      try {
        const profiles = await getProfiles(user.id);
        if (profiles.length === 0) {
          // No profiles found, redirect to profile tab
          router.replace('/(tabs)/profile');
        }
      } catch (error) {
        console.error('Error checking profiles:', error);
      } finally {
        setCheckingProfiles(false);
      }
    };

    if (!user && !inAuthGroup) {
      // Redirect to the auth screen if user is not authenticated and not already on auth screen
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      // Check profiles when user is authenticated and on auth screen
      checkProfiles();
    }
  }, [user, loading, segments, checkingProfiles]);

  if (loading || checkingProfiles) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 