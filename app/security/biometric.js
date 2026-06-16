import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBiometric } from "../../lib/hooks/useBiometric";
import { securityApi } from "../../lib/api";
import { secureStorage } from "../../lib/security/secureStorage";
import { useAppLock } from "../../lib/security/appLockContext";
import { colors, fonts, radius, shadow } from "../../lib/theme";

export default function BiometricScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { checkSupport, authenticate } = useBiometric();
  const { loadSettings } = useAppLock();

  const [support, setSupport] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, settings] = await Promise.all([
          checkSupport(),
          securityApi.getSettings(),
        ]);
        setSupport(s);
        setEnabled(settings.biometricEnabled);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handleToggle = useCallback(
    async (val) => {
      if (!support?.available) {
        Alert.alert(
          "Not Available",
          "Biometric authentication is not enrolled on this device. Please set up Face ID or fingerprint in device Settings first.",
        );
        return;
      }
      setToggling(true);
      try {
        // Always authenticate first before enabling/disabling
        const auth = await authenticate(
          val ? "Enable biometric login" : "Disable biometric login",
        );
        if (!auth.success) {
          setToggling(false);
          return;
        }

        if (val) {
          await securityApi.enableBiometric({
            biometricType: support.biometricType,
          });
          // Save locally so the app lock context can detect biometric mode
          await secureStorage.set('biometric_enabled', { enabled: true, type: support.biometricType });
          await loadSettings();
          setEnabled(true);
          Alert.alert(
            "Enabled",
            "Biometric login is now active. The app will lock when you switch away and unlock with your biometrics.",
          );
        } else {
          Alert.alert(
            "Disable Biometric",
            "Are you sure you want to disable biometric login?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Disable",
                style: "destructive",
                onPress: async () => {
                  await securityApi.disableBiometric();
                  await secureStorage.remove('biometric_enabled');
                  await loadSettings();
                  setEnabled(false);
                },
              },
            ],
          );
        }
      } catch (e) {
        Alert.alert("Error", e.message);
      }
      setToggling(false);
    },
    [support, authenticate],
  );

  const ICON = support?.hasFaceId ? "scan-circle" : "finger-print";
  const LABEL = support?.hasFaceId
    ? support?.hasFingerprint
      ? "Face ID & Touch ID"
      : "Face ID"
    : "Fingerprint";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={["#1E0A0A", "#5C1615"]}
        style={[styles.hero, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={styles.heroIcon}>
          <Ionicons name={ICON} size={36} color={colors.primary} />
        </View>
        <Text style={styles.heroTitle}>Biometric Login</Text>
        <Text style={styles.heroSub}>Use {LABEL} to unlock the app</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 32,
          gap: 12,
          maxWidth: 520, width: '100%', alignSelf: 'center',
        }}
      >
        {/* Toggle card */}
        <View style={[styles.card, shadow.card]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Enable {LABEL}</Text>
            <Text style={styles.cardSub}>
              {support?.available
                ? "Your device supports biometric authentication."
                : "Biometric not enrolled on this device. Set it up in device Settings."}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            disabled={toggling || loading}
            trackColor={{ false: colors.borderSubtle, true: colors.primary }}
            thumbColor="white"
          />
        </View>

        {/* How it works */}
        <Text style={styles.sectionTitle}>How it works</Text>
        {[
          {
            icon: "lock-closed",
            text: "Locks the app when you switch away or after your auto-lock timeout.",
          },
          {
            icon: "scan-circle",
            text: "Biometric scan instantly unlocks without needing your PIN.",
          },
          {
            icon: "shield-checkmark",
            text: "Your biometric data never leaves your device — only a local result is used.",
          },
          {
            icon: "phone-portrait",
            text: "Falls back to PIN if biometric fails or is unavailable.",
          },
        ].map((item, i) => (
          <View key={i} style={[styles.tipRow, shadow.soft]}>
            <View style={styles.tipIcon}>
              <Ionicons name={item.icon} size={18} color={colors.primary} />
            </View>
            <Text style={styles.tipText}>{item.text}</Text>
          </View>
        ))}

        {enabled && (
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text style={styles.statusText}>Biometric login is active</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 28 },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: { fontFamily: fonts.heading, fontSize: 24, color: "white" },
  heroSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  cardSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 8,
  },

  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
  },
  tipIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  tipText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    borderRadius: radius.md,
    padding: 14,
  },
  statusText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: "#16A34A" },
});
