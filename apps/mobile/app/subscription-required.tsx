import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchases } from "@/contexts/PurchasesContext";

/**
 * Blocking screen shown when a signed-in user does not have an active subscription.
 * They must subscribe, restore purchases, or sign out to proceed.
 */
export default function SubscriptionRequiredScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const {
    subscriptionInfo,
    isLoading,
    presentPaywall,
    refreshSubscriptionStatus,
  } = usePurchases();

  // When they become subscribed (e.g. after purchase or restore), send them into the app
  useEffect(() => {
    if (!isLoading && subscriptionInfo.isSubscribed) {
      router.replace("/(tabs)");
    }
  }, [isLoading, subscriptionInfo.isSubscribed, router]);

  const handleSubscribe = async () => {
    await presentPaywall();
    await refreshSubscriptionStatus();
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out? You'll need to sign in again to access the app.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: () => signOut() },
      ]
    );
  };

  if (isLoading) {
    return (
      <ThemedView className="flex-1 bg-huntly-cream justify-center items-center">
        <ActivityIndicator size="large" color="#4A7C59" />
        <ThemedText type="body" className="text-huntly-charcoal mt-4">
          Checking subscription...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1 bg-huntly-cream">
      <View className="flex-1 justify-center px-8">
        <View className="items-center mb-10">
          <View className="w-24 h-24 bg-huntly-sage rounded-full items-center justify-center mb-6">
            <ThemedText className="text-5xl">🔒</ThemedText>
          </View>
          <ThemedText
            type="title"
            className="text-huntly-forest text-center mb-3"
          >
            Subscription required
          </ThemedText>
          <ThemedText
            type="body"
            className="text-huntly-charcoal text-center leading-6"
          >
            Huntly Club requires an active subscription to access the app.
            Subscribe below or restore a previous purchase to continue.
          </ThemedText>
        </View>

        <View className="gap-4">
          <Button
            variant="primary"
            size="large"
            onPress={handleSubscribe}
            className="w-full"
          >
            Subscribe to unlock
          </Button>
          <Button
            variant="cancel"
            size="large"
            onPress={handleSignOut}
            className="w-full mt-4"
          >
            Sign out
          </Button>
        </View>
      </View>
    </ThemedView>
  );
}
