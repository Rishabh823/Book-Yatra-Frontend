import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { colors, fonts, radius, shadow } from "../../lib/theme";

const STEP = 6;
const TOTAL = 10;

function StepBar({ step, total }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 4,
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            backgroundColor: i < step ? "#D95D39" : "#E8E4DF",
          }}
        />
      ))}
    </View>
  );
}

export default function OnboardAuthScreen() {
  const router = useRouter();

  const AUTH_OPTIONS = [
    {
      icon: "logo-google",
      label: "Continue with Google",
      color: "#4285F4",
      bg: "#EBF3FE",
      onPress: () => router.push("/onboarding/security"),
    },
    {
      icon: "call-outline",
      label: "Continue with Mobile OTP",
      color: colors.primary,
      bg: colors.primaryLight,
      onPress: () =>
        router.push("/auth/login?returnTo=/onboarding/security"),
    },
    {
      icon: "mail-outline",
      label: "Continue with Email",
      color: "#374151",
      bg: "#F3F4F6",
      onPress: () =>
        router.push("/auth/login?returnTo=/onboarding/security"),
    },
    {
      icon: "person-add-outline",
      label: "Create Account",
      color: "#16A34A",
      bg: "#F0FDF4",
      onPress: () => router.push("/auth/register?returnTo=/onboarding/security"),
    },
  ];

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <StepBar step={STEP} total={TOTAL} />

      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      {/* Hero */}
      <View style={s.hero}>
        <LinearGradient colors={["#D95D39", "#B94929"]} style={s.heroCircle}>
          <Ionicons name="person" size={48} color="#fff" />
        </LinearGradient>
        <Text style={s.title}>Create Your Account</Text>
        <Text style={s.sub}>
          Sign in to unlock bookings, track your trips, earn rewards and more
        </Text>
      </View>

      {/* Auth options */}
      <View style={s.options}>
        {AUTH_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.label}
            style={[s.option, { borderColor: opt.color + "40" }]}
            onPress={opt.onPress}
            activeOpacity={0.8}
          >
            <View style={[s.optIcon, { backgroundColor: opt.bg }]}>
              <Ionicons name={opt.icon} size={22} color={opt.color} />
            </View>
            <Text style={s.optLabel}>{opt.label}</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textDisabled}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Divider */}
      <View style={s.divider}>
        <View style={s.divLine} />
        <Text style={s.divTxt}>OR</Text>
        <View style={s.divLine} />
      </View>

      {/* Sign up link */}
      <TouchableOpacity
        style={s.signupRow}
        onPress={() =>
          router.push("/auth/register?returnTo=/onboarding/security")
        }
      >
        <Text style={s.signupTxt}>
          New here? <Text style={s.signupLink}>Create Account</Text>
        </Text>
      </TouchableOpacity>

      {/* Guest */}
      <View style={s.bottom}>
        <TouchableOpacity
          style={s.guestBtn}
          onPress={() => router.replace("/(tabs)")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="person-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={s.guestTxt}>Continue as Guest</Text>
        </TouchableOpacity>
        <Text style={s.note}>
          Guest users can browse and book tours without signing in
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  backBtn: {
    marginLeft: 20,
    marginBottom: 4,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: { alignItems: "center", paddingHorizontal: 24, marginBottom: 28 },
  heroCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  options: { paddingHorizontal: 20, gap: 10 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: 14,
    ...shadow.soft,
  },
  optIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  optLabel: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  divLine: { flex: 1, height: 1, backgroundColor: colors.borderSubtle },
  divTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textDisabled },
  signupRow: { alignItems: "center", marginBottom: 8 },
  signupTxt: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  signupLink: { fontFamily: fonts.bodySemiBold, color: colors.primary },
  bottom: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 20,
    paddingBottom: 8,
    alignItems: "center",
    gap: 6,
  },
  guestBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  guestTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textDisabled,
    textAlign: "center",
  },
});
