import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBiometric } from "../../lib/hooks/useBiometric";
import { securityApi } from "../../lib/api";
import { pinStorage } from "../../lib/security/secureStorage";
import { useAppLock } from "../../lib/security/appLockContext";
import { fonts, radius, shadow } from "../../lib/theme";
import { useColors } from "../../lib/ThemeContext";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";

export default function BiometricScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { checkSupport, authenticate } = useBiometric();
  const { loadSettings } = useAppLock();
  const { toast, showToast, hideToast } = useToast();
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [support, setSupport] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, localEnabled] = await Promise.all([
          checkSupport(),
          pinStorage.getBiometricEnabled(),
        ]);
        setSupport(s);
        setEnabled(localEnabled);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handleDisableBiometricConfirmed = useCallback(async () => {
    setShowDisableConfirm(false);
    try {
      await securityApi.disableBiometric();
      // Explicitly set to false (not just remove) for reliability
      await pinStorage.setBiometricEnabled(false);
      await loadSettings();
      setEnabled(false);
    } catch (e) {
      showToast(e.message, "error");
    }
    setToggling(false);
  }, [loadSettings, showToast]);

  const handleToggle = useCallback(
    async (val) => {
      if (!support?.available) {
        showToast(
          "Biometric authentication is not enrolled on this device. Please set up Face ID or fingerprint in device Settings first.",
          "error",
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
          await pinStorage.setBiometricEnabled(true, support.biometricType);
          await loadSettings();
          setEnabled(true);
          showToast(
            "Biometric login is now active. The app will lock when you switch away and unlock with your biometrics.",
            "success",
          );
          setToggling(false);
        } else {
          setShowDisableConfirm(true);
        }
      } catch (e) {
        showToast(e.message, "error");
        setToggling(false);
      }
    },
    [support, authenticate, showToast],
  );

  const ICON = support?.hasFaceId ? "scan-circle" : "finger-print";
  const LABEL = support?.hasFaceId
    ? support?.hasFingerprint
      ? "Face ID & Touch ID"
      : "Face ID"
    : "Fingerprint";

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.headerTitle}>Biometric Login</Text>
          <Text style={s.headerSub}>Use {LABEL} to unlock the app</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 32,
          gap: 12,
          maxWidth: 520, width: '100%', alignSelf: 'center',
        }}
      >
        {/* Toggle card */}
        <View style={[s.card, shadow.card]}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Enable {LABEL}</Text>
            <Text style={s.cardSub}>
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
        <Text style={s.sectionTitle}>How it works</Text>
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
          <View key={i} style={[s.tipRow, shadow.soft]}>
            <View style={s.tipIcon}>
              <Ionicons name={item.icon} size={18} color={colors.primary} />
            </View>
            <Text style={s.tipText}>{item.text}</Text>
          </View>
        ))}

        {enabled && (
          <View style={s.statusBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text style={s.statusText}>Biometric login is active</Text>
          </View>
        )}
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmModal
        visible={showDisableConfirm}
        title="Disable Biometric"
        message="Are you sure you want to disable biometric login?"
        confirmText="Disable"
        onConfirm={handleDisableBiometricConfirmed}
        onCancel={() => { setShowDisableConfirm(false); setToggling(false); }}
        onDismiss={() => { setShowDisableConfirm(false); setToggling(false); }}
        destructive={true}
      />
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Philosopher_700Bold', fontSize: 18, color: colors.textPrimary },
  headerSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 1 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
