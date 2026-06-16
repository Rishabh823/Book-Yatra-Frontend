import { Stack } from "expo-router";
import { useEffect, useRef, Fragment } from "react";
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
import { ThemeProvider, useTheme } from "../lib/ThemeContext";
import { registerPushToken, addNotificationListener, addResponseListener } from "../lib/notifications";
import { useRouter } from "expo-router";

function AppNavigator() {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  useEffect(() => {
    registerPushToken().catch(() => {});

    const notifSub = addNotificationListener(() => {});
    const responseSub = addResponseListener((response) => {
      const data = response.notification.request.content.data || {};
      if (data.route) {
        try { router.push(data.route); } catch {}
      }
    });

    return () => {
      notifSub.remove();
      responseSub.remove();
    };
  }, []);


  const { isLocked } = useAppLock();

  if (isLocked) return <AppLockScreen />;

  return (
    <Fragment>
      <StatusBar style={isDark ? "light" : "dark"} />
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
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
      <Stack.Screen name="admin/tour/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="admin/tour/create"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
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
      <Stack.Screen
        name="sos/index"
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="sos/active" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="coupons" />

      {/* Chat */}
      <Stack.Screen name="chat/index" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen
        name="chat/new"
        options={{ animation: "slide_from_bottom" }}
      />

      {/* Community */}
      <Stack.Screen name="community/index" />
      <Stack.Screen name="community/[id]" />
      <Stack.Screen
        name="community/create"
        options={{ animation: "slide_from_bottom" }}
      />

      {/* Volunteer */}
      <Stack.Screen name="volunteer/index" />
      <Stack.Screen name="volunteer/checkin" />
      <Stack.Screen name="volunteer/passengers" />
      <Stack.Screen
        name="volunteer/report-incident"
        options={{ animation: "slide_from_bottom" }}
      />

      {/* Admin */}
      <Stack.Screen name="admin/live-dashboard" />
      <Stack.Screen name="admin/analytics" />
      <Stack.Screen name="admin/community" />
      <Stack.Screen name="admin/vehicles" />
      <Stack.Screen name="admin/drivers" />
      <Stack.Screen name="admin/volunteer-management" />
      <Stack.Screen
        name="admin/coupons"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="admin/reviews"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="admin/drafts"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="admin/volunteer/[id]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />

      {/* Volunteer onboarding */}
      <Stack.Screen
        name="volunteer/onboarding"
        options={{
          headerShown: false,
          animation: "slide_from_bottom",
          gestureEnabled: false,
        }}
      />

      {/* Super Admin */}
      <Stack.Screen name="admin/super/dashboard" />
      <Stack.Screen name="admin/super/users" />
      <Stack.Screen name="admin/super/roles" />
      <Stack.Screen name="admin/super/tours" />
      <Stack.Screen name="admin/super/bookings" />
      <Stack.Screen name="admin/super/operators" />
      <Stack.Screen name="admin/super/operator/[id]" />

      {/* Rewards */}
      <Stack.Screen name="rewards/index" />
      <Stack.Screen name="rewards/badges" />
      <Stack.Screen name="rewards/leaderboard" />

      {/* Document Vault */}
      <Stack.Screen name="document-vault/index" />
      <Stack.Screen
        name="document-vault/add"
        options={{ animation: "slide_from_bottom" }}
      />

      {/* Booking extensions */}
      <Stack.Screen name="booking/qr-ticket" />
      <Stack.Screen name="verify/[id]" options={{ headerShown: false }} />

      {/* Group Booking */}
      <Stack.Screen name="group-booking/index" />

      {/* User Wallet */}
      <Stack.Screen name="wallet/index" />
      <Stack.Screen name="wallet/add-money" />
      <Stack.Screen name="wallet/transactions" />

      {/* Operator Wallet */}
      <Stack.Screen name="admin/wallet/index" />
      <Stack.Screen name="admin/wallet/withdraw" />
      <Stack.Screen name="admin/wallet/history" />

      {/* Super Admin Finance */}
      <Stack.Screen name="admin/super/finance" />
      <Stack.Screen name="admin/super/withdrawals" />
    </Stack>
    </Fragment>
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
            <AppNavigator />
          </AppLockProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
