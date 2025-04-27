import { Image, StyleSheet, Platform, FlatList, Pressable } from 'react-native';
import { useEffect, useState } from 'react';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getPacks, Pack } from '@/services/packService';
import { useAuth } from '@/contexts/AuthContext';


export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPacks = async () => {
      try {
        const packsData = await getPacks();
        setPacks(packsData);
      } catch (err) {
        setError('Failed to load packs');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPacks();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedView style={styles.userContainer}>
        <ThemedText type="subtitle">Current User</ThemedText>
        <ThemedText>{user?.email || 'Not signed in'}</ThemedText>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <ThemedText style={styles.signOutButtonText}>Sign Out</ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Packs</ThemedText>
        {loading ? (
          <ThemedText>Loading packs...</ThemedText>
        ) : error ? (
          <ThemedText>{error}</ThemedText>
        ) : packs.length === 0 ? (
          <ThemedText>No packs found</ThemedText>
        ) : (
          <FlatList
            data={packs}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ThemedView style={styles.packItem}>
                <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
              </ThemedView>
            )}
            style={styles.packsList}
          />
        )}
      </ThemedView>
      
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12'
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 2: Explore</ThemedText>
        <ThemedText>
          Tap the Explore tab to learn more about what's included in this starter app.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          When you're ready, run{' '}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  userContainer: {
    gap: 8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  packsList: {
    marginTop: 8,
  },
  packItem: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  signOutButton: {
    marginTop: 8,
    backgroundColor: '#ef4444',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  signOutButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
