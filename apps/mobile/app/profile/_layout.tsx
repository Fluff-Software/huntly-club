import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="create"
        options={{
          title: 'Create Profile',
          headerShown: false,
        }}
      />
    </Stack>
  );
} 