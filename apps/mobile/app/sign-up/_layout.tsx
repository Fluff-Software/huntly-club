import { Stack } from "expo-router";

export default function SignUpLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: "slide_from_right" }}
    >
      <Stack.Screen name="players" />
      <Stack.Screen name="team" />
      <Stack.Screen name="guide" options={{ animation: "fade" }} />
      <Stack.Screen name="plan" />
      <Stack.Screen name="index" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="finish" options={{ gestureEnabled: false, animation: "fade" }} />
    </Stack>
  );
}
