import { Stack } from "expo-router";

export default function PackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="activity" />
    </Stack>
  );
}
