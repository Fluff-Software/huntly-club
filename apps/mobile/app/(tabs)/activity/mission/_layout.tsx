import { Stack } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { isStartMissionOnboardingActive } from "@/constants/startMissionOnboarding";

export default function MissionLayout() {
  const { userData } = useUser();
  const onboardingActive = isStartMissionOnboardingActive(userData?.start_mission_step);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: !onboardingActive }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="intro" />
      <Stack.Screen name="prep" />
      <Stack.Screen name="steps" />
      <Stack.Screen name="completion" />
      <Stack.Screen
        name="reward"
        options={{
          gestureEnabled: false }}
      />
    </Stack>
  );
}
