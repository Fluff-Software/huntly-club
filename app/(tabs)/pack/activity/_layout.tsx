import { Stack } from "expo-router";

export default function ActivityLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          title: "Activity Details",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
