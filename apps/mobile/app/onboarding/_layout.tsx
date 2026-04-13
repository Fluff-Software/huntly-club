import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: "none",
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="teaser" />
      <Stack.Screen name="mission-intro" />
    </Stack>
  );
}
