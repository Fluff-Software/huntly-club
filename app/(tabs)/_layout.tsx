import { Tabs } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colorScheme === "dark" ? "#7FB069" : "#4A7C59", // huntly-sage : huntly-leaf
        tabBarInactiveTintColor: colorScheme === "dark" ? "#A8D5BA" : "#8B4513", // huntly-mint : huntly-brown
        tabBarStyle: {
          backgroundColor: colorScheme === "dark" ? "#2D5A27" : "#FFF8DC", // huntly-forest : huntly-cream
          borderTopColor: colorScheme === "dark" ? "#4A7C59" : "#A8D5BA", // huntly-leaf : huntly-mint
          borderTopWidth: 1,
          height: 90,
          paddingBottom: 16,
          paddingTop: 8,
          paddingHorizontal: 16,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: "My Team",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="users" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="user" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pack"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
