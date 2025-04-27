import React, { useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, FlatList, Pressable, Platform, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { PurchasesPackage } from 'react-native-purchases';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { usePurchases } from '@/contexts/PurchasesContext';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { offerings, subscriptionInfo, isLoading, purchasePackage, restorePurchases } = usePurchases();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);

  useEffect(() => {
    if (offerings) {
      setPackages(offerings.availablePackages);
    }
  }, [offerings]);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    try {
      const customerInfo = await purchasePackage(pkg);
      if (customerInfo) {
        Alert.alert('Success', 'Thank you for your purchase!');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Purchase Failed', 'There was an error processing your purchase.');
    }
  };

  const handleRestore = async () => {
    try {
      const customerInfo = await restorePurchases();
      if (customerInfo && customerInfo.entitlements.active && Object.keys(customerInfo.entitlements.active).length > 0) {
        Alert.alert('Success', 'Your purchases have been restored!');
      } else {
        Alert.alert('No Purchases', 'No previous purchases were found to restore.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Restore Failed', 'There was an error restoring your purchases.');
    }
  };

  const formatPrice = (price: string, period: string): string => {
    return `${price}/${period}`;
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Subscription', headerShown: true }} />

      {subscriptionInfo.isSubscribed ? (
        <ThemedView style={styles.subscribedContainer}>
          <ThemedText type="title">You're Subscribed!</ThemedText>
          <ThemedText>
            Your subscription is active until{' '}
            {subscriptionInfo.expirationDate
              ? subscriptionInfo.expirationDate.toLocaleDateString()
              : 'unknown date'}
          </ThemedText>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ThemedText style={styles.buttonText}>Go Back</ThemedText>
          </Pressable>
        </ThemedView>
      ) : (
        <>
          <ThemedText type="title" style={styles.header}>Choose a Plan</ThemedText>
          <ThemedText style={styles.description}>
            Subscribe to unlock premium features and support our app.
          </ThemedText>

          {isLoading ? (
            <ActivityIndicator size="large" style={styles.loader} />
          ) : !offerings ? (
            <ThemedText>No subscription options available at this time.</ThemedText>
          ) : (
            <FlatList
              data={packages}
              keyExtractor={(item) => item.identifier}
              renderItem={({ item }) => (
                <ThemedView style={styles.packageItem}>
                  <ThemedView style={styles.packageInfo}>
                    <ThemedText type="defaultSemiBold">{item.product.title}</ThemedText>
                    <ThemedText>{item.product.description}</ThemedText>
                    <ThemedText type="defaultSemiBold">
                      {formatPrice(item.product.priceString, item.packageType)}
                    </ThemedText>
                  </ThemedView>
                  <Pressable style={styles.purchaseButton} onPress={() => handlePurchase(item)}>
                    <ThemedText style={styles.buttonText}>Subscribe</ThemedText>
                  </Pressable>
                </ThemedView>
              )}
              style={styles.packagesList}
            />
          )}

          <Pressable style={styles.restoreButton} onPress={handleRestore}>
            <ThemedText>Restore Purchases</ThemedText>
          </Pressable>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 24,
  },
  loader: {
    marginTop: 20,
  },
  packagesList: {
    flex: 1,
  },
  packageItem: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageInfo: {
    flex: 1,
    marginRight: 16,
  },
  purchaseButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  restoreButton: {
    alignSelf: 'center',
    padding: 12,
    marginVertical: 16,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  subscribedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
}); 