import { Stack } from "expo-router";
import {
  useFonts,
  Philosopher_400Regular,
  Philosopher_700Bold,
} from "@expo-google-fonts/philosopher";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import { Cinzel_600SemiBold } from "@expo-google-fonts/cinzel";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { colors } from "../lib/theme";
import { LanguageProvider } from "../lib/LanguageContext";
import { AppLockProvider, useAppLock } from "../lib/security/appLockContext";
import AppLockScreen from "../components/AppLockScreen";
import { ThemeProvider } from "../lib/ThemeContext";

function AppNavigator() {
  const { isLocked } = useAppLock();

  if (isLocked) return <AppLockScreen />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "fade",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="auth/login"
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="auth/register"
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="auth/forgot"
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="tour/[id]" />
      <Stack.Screen name="booking/index" />
      <Stack.Screen name="donate" />
      <Stack.Screen name="gallery" />
      <Stack.Screen name="aarti" />
      <Stack.Screen name="chalisa" />
      <Stack.Screen name="contact" />
      <Stack.Screen name="feedback" />
      <Stack.Screen name="about" />
      <Stack.Screen name="membership" />
      <Stack.Screen name="members" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="booking/[id]" />
      <Stack.Screen name="admin/dashboard" />
      <Stack.Screen name="admin/bookings" />
      <Stack.Screen name="admin/tours" />
      <Stack.Screen name="admin/members" />
      <Stack.Screen name="admin/users" />
      <Stack.Screen name="admin/user/[id]" />
      <Stack.Screen name="admin/gallery" />
      <Stack.Screen name="admin/enquiries" />
      <Stack.Screen name="admin/feedback" />
      <Stack.Screen name="admin/donations" />
      <Stack.Screen name="admin/settings" />
      <Stack.Screen name="security/index" />
      <Stack.Screen name="security/biometric" />
      <Stack.Screen name="security/pin" />
      <Stack.Screen name="security/mfa" />
      <Stack.Screen name="security/devices" />
      <Stack.Screen name="security/sessions" />
      <Stack.Screen name="security/activity" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="theme-settings" />

      {/* ── Enterprise Tour Platform Screens ─────────────────────── */}
      <Stack.Screen name="live-tracking" />
      <Stack.Screen name="sos/index" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="sos/active" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="coupons" />

      {/* Chat */}
      <Stack.Screen name="chat/index" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="chat/new" options={{ animation: 'slide_from_bottom' }} />

      {/* Community */}
      <Stack.Screen name="community/index" />
      <Stack.Screen name="community/[id]" />
      <Stack.Screen name="community/create" options={{ animation: 'slide_from_bottom' }} />

      {/* Volunteer */}
      <Stack.Screen name="volunteer/index" />
      <Stack.Screen name="volunteer/checkin" />
      <Stack.Screen name="volunteer/passengers" />
      <Stack.Screen name="volunteer/report-incident" options={{ animation: 'slide_from_bottom' }} />

      {/* Admin */}
      <Stack.Screen name="admin/live-dashboard" />
      <Stack.Screen name="admin/analytics" />
      <Stack.Screen name="admin/vehicles" />
      <Stack.Screen name="admin/drivers" />
      <Stack.Screen name="admin/volunteer-management" />

      {/* Rewards */}
      <Stack.Screen name="rewards/index" />
      <Stack.Screen name="rewards/badges" />
      <Stack.Screen name="rewards/leaderboard" />

      {/* Document Vault */}
      <Stack.Screen name="document-vault/index" />
      <Stack.Screen name="document-vault/add" options={{ animation: 'slide_from_bottom' }} />

      {/* Booking extensions */}
      <Stack.Screen name="booking/qr-ticket" />

      {/* Group Booking */}
      <Stack.Screen name="group-booking/index" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Philosopher_400Regular,
    Philosopher_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_700Bold,
    Cinzel_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <LanguageProvider>
      <ThemeProvider>
        <SafeAreaProvider>
          <AppLockProvider>
            <StatusBar style="dark" />
            <AppNavigator />
          </AppLockProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
