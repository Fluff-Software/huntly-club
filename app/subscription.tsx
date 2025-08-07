import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Platform,
  Alert,
  View,
  ScrollView,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { PurchasesPackage } from "react-native-purchases";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { usePurchases } from "@/contexts/PurchasesContext";

export default function SubscriptionScreen() {
  const router = useRouter();
  const {
    offerings,
    subscriptionInfo,
    isLoading,
    purchasePackage,
    restorePurchases,
  } = usePurchases();
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
        Alert.alert("Success", "Thank you for your purchase!");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      Alert.alert(
        "Purchase Failed",
        "There was an error processing your purchase."
      );
    }
  };

  const handleRestore = async () => {
    try {
      const customerInfo = await restorePurchases();
      if (
        customerInfo &&
        customerInfo.entitlements.active &&
        Object.keys(customerInfo.entitlements.active).length > 0
      ) {
        Alert.alert("Success", "Your purchases have been restored!");
      } else {
        Alert.alert(
          "No Purchases",
          "No previous purchases were found to restore."
        );
      }
    } catch (error) {
      console.error("Restore error:", error);
      Alert.alert(
        "Restore Failed",
        "There was an error restoring your purchases."
      );
    }
  };

  const formatPrice = (price: string, period: string): string => {
    return `${price}/${period}`;
  };

  return (
    <ThemedView className="flex-1 bg-huntly-cream">
      <Stack.Screen
        options={{ title: "Premium Adventure", headerShown: true }}
      />

      {subscriptionInfo.isSubscribed ? (
        <View className="flex-1 justify-center items-center p-8">
          <View className="bg-white rounded-2xl p-8 shadow-soft items-center">
            <View className="w-20 h-20 bg-huntly-leaf rounded-full items-center justify-center mb-6">
              <ThemedText className="text-4xl">🎉</ThemedText>
            </View>
            <ThemedText
              type="title"
              className="text-huntly-forest text-center mb-4"
            >
              You're a Premium Explorer!
            </ThemedText>
            <ThemedText
              type="body"
              className="text-huntly-charcoal text-center mb-6 leading-6"
            >
              Your premium adventure is active until{" "}
              {subscriptionInfo.expirationDate
                ? subscriptionInfo.expirationDate.toLocaleDateString()
                : "unknown date"}
            </ThemedText>
            <Pressable
              className="bg-huntly-amber px-6 py-3 rounded-xl shadow-soft"
              onPress={() => router.back()}
            >
              <ThemedText className="text-huntly-forest font-bold text-lg">
                Continue Exploring
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 bg-huntly-sage rounded-full items-center justify-center mb-4">
              <ThemedText className="text-4xl">⭐</ThemedText>
            </View>
            <ThemedText
              type="title"
              className="text-huntly-forest text-center mb-2"
            >
              Unlock Premium Adventures
            </ThemedText>
            <ThemedText
              type="body"
              className="text-huntly-charcoal text-center leading-6"
            >
              Get unlimited access to all adventure packs and exclusive
              features!
            </ThemedText>
          </View>

          {/* Loading State */}
          {isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#4A7C59" />
              <ThemedText type="body" className="text-huntly-charcoal mt-4">
                Loading adventure options...
              </ThemedText>
            </View>
          ) : !offerings ? (
            <View className="bg-white rounded-2xl p-6 shadow-soft items-center">
              <ThemedText
                type="body"
                className="text-huntly-charcoal text-center"
              >
                No premium adventures available at this time.
              </ThemedText>
            </View>
          ) : (
            <View className="space-y-4 mb-8">
              {packages.map((item) => (
                <View
                  key={item.identifier}
                  className="bg-white rounded-2xl p-6 shadow-soft"
                >
                  <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-1 mr-4">
                      <ThemedText
                        type="defaultSemiBold"
                        className="text-huntly-forest mb-2"
                      >
                        {item.product.title}
                      </ThemedText>
                      <ThemedText
                        type="body"
                        className="text-huntly-charcoal mb-3 leading-5"
                      >
                        {item.product.description}
                      </ThemedText>
                      <ThemedText
                        type="defaultSemiBold"
                        className="text-huntly-leaf"
                      >
                        {formatPrice(
                          item.product.priceString,
                          item.packageType
                        )}
                      </ThemedText>
                    </View>
                    <Pressable
                      className="bg-huntly-amber px-6 py-3 rounded-xl shadow-soft"
                      onPress={() => handlePurchase(item)}
                    >
                      <ThemedText className="text-huntly-forest font-bold">
                        Subscribe
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Restore Purchases */}
          <Pressable
            className="bg-huntly-mint py-4 rounded-xl items-center shadow-soft"
            onPress={handleRestore}
          >
            <ThemedText type="defaultSemiBold" className="text-huntly-forest">
              Restore Previous Adventures
            </ThemedText>
          </Pressable>
        </ScrollView>
      )}
    </ThemedView>
  );
}
