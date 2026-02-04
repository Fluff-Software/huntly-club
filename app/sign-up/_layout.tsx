import { Stack } from "expo-router";

export default function SignUpLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="players" />
      <Stack.Screen name="team" />
    </Stack>
  );
}
