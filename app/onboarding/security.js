import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import { markSecurityDone } from "../../lib/onboarding";
import { pinStorage } from "../../lib/security/secureStorage";

const STEP = 7;
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

export default function SecurityScreen() {
  const router = useRouter();
  const [biometricType, setBiometricType] = useState(null); // 'face', 'fingerprint', null
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (compatible && enrolled) {
        const types =
          await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (
          types.includes(
            LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
          )
        ) {
          setBiometricType("face");
        } else if (
          types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ) {
          setBiometricType("fingerprint");
        }
      }
    })();
  }, []);

  const handleBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Set up biometric login for TripKart",
        disableDeviceFallback: false,
      });
      if (result.success) {
        await pinStorage.setBiometricEnabled(true, biometricType);
        setBiometricEnabled(true);
      }
    } catch {}
  };

  const handleNext = async () => {
    await markSecurityDone();
    router.push("/onboarding/personalization");
  };
  const handleSkip = () => router.push("/onboarding/personalization");

  const biometricIcon =
    biometricType === "face" ? "scan-outline" : "finger-print-outline";
  const biometricLabel = biometricType === "face" ? "Face ID" : "Fingerprint";

  const OPTIONS = [
    ...(biometricType
      ? [
          {
            icon: biometricIcon,
            label: `Enable ${biometricLabel}`,
            sub: `Use ${biometricLabel} to unlock the app quickly`,
            color: "#2563EB",
            action: handleBiometric,
            done: biometricEnabled,
          },
        ]
      : []),
    {
      icon: "keypad-outline",
      label: "Create PIN",
      sub: "Set a 4-6 digit PIN as backup access",
      color: colors.primary,
      action: () => router.push("/security/pin"),
      done: false,
    },
  ];

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <StepBar step={STEP} total={TOTAL} />

      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={s.skipTxt}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={s.center}>
        <View style={s.iconCircle}>
          <Ionicons name="shield-checkmark" size={52} color={colors.primary} />
        </View>
        <Text style={s.title}>Secure Your Account</Text>
        <Text style={s.sub}>
          Add an extra layer of security to protect your account and bookings
        </Text>

        <View style={s.options}>
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={[s.option, opt.done && s.optionDone]}
              onPress={opt.action}
              activeOpacity={0.8}
            >
              <View style={[s.optIcon, { backgroundColor: opt.color + "15" }]}>
                <Ionicons
                  name={opt.done ? "checkmark-circle" : opt.icon}
                  size={24}
                  color={opt.done ? colors.success : opt.color}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[s.optLabel, opt.done && { color: colors.success }]}
                >
                  {opt.label}
                </Text>
                <Text style={s.optSub}>{opt.done ? "Enabled ✓" : opt.sub}</Text>
              </View>
              {!opt.done && (
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textDisabled}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.noteWrap}>
          <Ionicons
            name="lock-closed-outline"
            size={14}
            color={colors.textDisabled}
          />
          <Text style={s.note}>
            Security settings can be changed anytime from Profile → Security
          </Text>
        </View>
      </View>

      <View style={s.bottom}>
        <TouchableOpacity
          style={s.btn}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={s.btnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  skipTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
  center: { flex: 1, alignItems: "center", paddingHorizontal: 24 },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
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
    marginBottom: 28,
  },
  options: { width: "100%", gap: 12 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    padding: 14,
    ...shadow.soft,
  },
  optionDone: {
    borderColor: colors.success + "60",
    backgroundColor: "#F0FDF4",
  },
  optIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  optLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  optSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  noteWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 8,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textDisabled,
    flex: 1,
    lineHeight: 16,
  },
  bottom: { padding: 20, paddingBottom: 8 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 16,
    ...shadow.card,
  },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" },
});
