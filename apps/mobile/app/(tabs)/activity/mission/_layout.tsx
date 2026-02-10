import { Stack } from "expo-router";

export default function MissionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="completion" />
      <Stack.Screen
        name="reward"
        options={{
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
