import { Stack } from "expo-router";

export default function ActivityLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          title: "Activity Details",
          headerShown: false }}
      />
      <Stack.Screen
        name="pick-activity"
        options={{
          title: "Go on an Adventure",
          headerShown: false }}
      />
      <Stack.Screen
        name="walk-prep"
        options={{
          title: "Walk",
          headerShown: false,
          gestureEnabled: false }}
      />
      <Stack.Screen
        name="cycle-prep"
        options={{
          title: "Cycle",
          headerShown: false,
          gestureEnabled: false }}
      />
      <Stack.Screen
        name="walk-map"
        options={{
          title: "Walk map",
          headerShown: false }}
      />
      <Stack.Screen
        name="cycle-map"
        options={{
          title: "Cycle map",
          headerShown: false }}
      />
      <Stack.Screen
        name="walk-finish"
        options={{
          title: "Finish walk",
          headerShown: false,
          gestureEnabled: false }}
      />
      <Stack.Screen
        name="cycle-finish"
        options={{
          title: "Finish cycle",
          headerShown: false,
          gestureEnabled: false }}
      />
      <Stack.Screen
        name="walk-summary"
        options={{
          title: "Walk summary",
          headerShown: false,
          gestureEnabled: false }}
      />
      <Stack.Screen
        name="cycle-summary"
        options={{
          title: "Cycle summary",
          headerShown: false,
          gestureEnabled: false }}
      />
      <Stack.Screen
        name="mission"
        options={{
          title: "Activity",
          headerShown: false }}
      />
    </Stack>
  );
}
