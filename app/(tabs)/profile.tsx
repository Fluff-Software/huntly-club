import { StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BaseLayout } from '@/components/layout/BaseLayout';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchases } from '@/contexts/PurchasesContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { subscriptionInfo } = usePurchases();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const navigateToSubscription = () => {
    router.push('/subscription');
  };

  return (
    <BaseLayout>
      <ThemedView style={styles.section}>
        <ThemedText type="title">Profile</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Account</ThemedText>
        <ThemedText>{user?.email || 'Not signed in'}</ThemedText>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <ThemedText style={styles.signOutButtonText}>Sign Out</ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Subscription</ThemedText>
        <ThemedText>
          {subscriptionInfo.isSubscribed
            ? `Subscribed (expires: ${
                subscriptionInfo.expirationDate
                  ? subscriptionInfo.expirationDate.toLocaleDateString()
                  : 'unknown'
              })`
            : 'Not subscribed'}
        </ThemedText>
        <Pressable style={styles.subscribeButton} onPress={navigateToSubscription}>
          <ThemedText style={styles.buttonText}>
            {subscriptionInfo.isSubscribed ? 'Manage Subscription' : 'Subscribe Now'}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </BaseLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
    marginBottom: 24,
  },
  signOutButton: {
    marginTop: 8,
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  signOutButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  subscribeButton: {
    marginTop: 8,
    backgroundColor: '#4f46e5',
    padding: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
}); 