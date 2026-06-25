import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="country" />
      <Stack.Screen name="language" />
      <Stack.Screen name="carousel" />
      <Stack.Screen name="location" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="onboard-auth" />
      <Stack.Screen name="security" />
      <Stack.Screen name="personalization" />
      <Stack.Screen name="emergency" />
      <Stack.Screen name="wallet" />
    </Stack>
  );
}
