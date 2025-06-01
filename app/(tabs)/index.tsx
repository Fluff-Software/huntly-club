import { StyleSheet, Pressable, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BaseLayout } from '@/components/layout/BaseLayout';
import { getPacks, Pack } from '@/services/packService';

export default function PacksScreen() {
  const router = useRouter();
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

  const handlePackPress = (packId: string) => {
    // TODO: Navigate to pack details
    console.log('Pack pressed:', packId);
  };

  return (
    <BaseLayout>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Packs</ThemedText>
      </ThemedView>

      {loading ? (
        <ThemedText style={styles.message}>Loading packs...</ThemedText>
      ) : error ? (
        <ThemedText style={styles.message}>{error}</ThemedText>
      ) : packs.length === 0 ? (
        <ThemedText style={styles.message}>No packs found</ThemedText>
      ) : (
        <View style={styles.packsList}>
          {packs.map((pack) => (
            <Pressable
              key={pack.id}
              style={styles.packCard}
              onPress={() => handlePackPress(pack.id)}>
              <ThemedView style={styles.packContent}>
                <ThemedText type="defaultSemiBold">{pack.name}</ThemedText>
              </ThemedView>
            </Pressable>
          ))}
        </View>
      )}
    </BaseLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  message: {
    textAlign: 'center',
    marginTop: 20,
  },
  packsList: {
    gap: 12,
  },
  packCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  packContent: {
    padding: 16,
  },
});
