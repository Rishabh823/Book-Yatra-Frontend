import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pinStorage } from "../lib/security/secureStorage";
import { useBiometric } from "../lib/hooks/useBiometric";
import { useAppLock } from "../lib/security/appLockContext";
import { colors, fonts } from "../lib/theme";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
const { width: SCREEN_W } = Dimensions.get("window");
const KEY_SIZE = Math.min(Math.floor((SCREEN_W - 96) / 3), 88);

export default function AppLockScreen() {
  const insets = useSafeAreaInsets();
  const { unlock } = useAppLock();
  const { checkSupport, authenticate } = useBiometric();
  const { pinEnabled } = useAppLock();

  const [pin, setPin] = useState("");
  const [pinLen, setPinLen] = useState(6);
  const [hasPinSet, setHasPinSet] = useState(false);
  const [pinMissing, setPinMissing] = useState(false);
  const [error, setError] = useState("");
  const [bioAvail, setBioAvail] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [loading, setLoading] = useState(true);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    Promise.all([
      checkSupport().catch(() => ({ available: false })),
      pinStorage.hasPin(),
      pinStorage.getPinLength(),
    ]).then(([support, hasPin, len]) => {
      setBioAvail(support.available);
      setHasPinSet(hasPin);
      setPinLen(len);
      setLoading(false);
    });
  }, []);

  const triggerShake = useCallback(() => {
    Vibration.vibrate(350);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]);

  const triggerError = useCallback(
    (msg) => {
      setPin("");
      setError(msg);
      triggerShake();
    },
    [triggerShake],
  );

  const tryBiometric = useCallback(async () => {
    try {
      const result = await authenticate("Unlock Book Yatra");
      if (result.success) {
        setError("");
        unlock();
      }
    } catch {}
  }, [authenticate, unlock]);

  useEffect(() => {
    if (bioAvail && !loading) tryBiometric();
  }, [bioAvail, loading]);

  const handleKey = useCallback(
    async (key) => {
      if (lockedUntil && new Date(lockedUntil) > new Date()) {
        const secs = Math.ceil((new Date(lockedUntil) - Date.now()) / 1000);
        setError(`Locked. Try again in ${secs}s`);
        return;
      }
      if (key === "⌫") {
        setPin((p) => p.slice(0, -1));
        setError("");
        return;
      }
      if (key === "") return;

      const next = pin + key;
      setPin(next);

      if (next.length === pinLen) {
        const result = await pinStorage.verifyPin(next);
        setPin("");
        if (result.valid) {
          setError("");
          unlock();
        } else if (result.reason === "no_pin") {
          setPinMissing(true);
          setError("PIN data not found. Please reset in Settings.");
        } else if (result.reason === "locked") {
          setLockedUntil(result.lockedUntil);
          triggerError("Too many attempts. Locked for 15 min.");
        } else {
          const left = result.attemptsLeft ?? 0;
          triggerError(
            left > 0
              ? `Wrong PIN — ${left} attempt${left === 1 ? "" : "s"} left`
              : "Wrong PIN. Too many attempts.",
          );
        }
      }
    },
    [pin, pinLen, lockedUntil, unlock, triggerError],
  );

  const bioOnly = bioAvail && !hasPinSet && !pinEnabled;

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <LinearGradient
          colors={["#0D0507", "#2D1010"]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          opacity: fadeAnim,
        },
      ]}
    >
      <LinearGradient
        colors={["#0D0507", "#3B0A0A", "#5C1615"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons
            name={
              bioOnly
                ? Platform.OS === "ios"
                  ? "scan-circle"
                  : "finger-print"
                : "lock-closed"
            }
            size={34}
            color={colors.primary}
          />
        </View>
        <Text style={styles.appName}>Book Yatra</Text>
        <Text style={styles.sub}>
          {bioOnly
            ? Platform.OS === "ios"
              ? "Use Face ID / Touch ID to unlock"
              : "Use fingerprint to unlock"
            : `Enter your ${pinLen}-digit PIN`}
        </Text>
      </View>

      {/* Biometric-only */}
      {bioOnly ? (
        <View style={styles.bioOnlyWrap}>
          <TouchableOpacity
            style={styles.bioBigBtn}
            onPress={tryBiometric}
            activeOpacity={0.8}
          >
            <Ionicons
              name={Platform.OS === "ios" ? "scan-circle" : "finger-print"}
              size={72}
              color="rgba(255,255,255,0.9)"
            />
            <Text style={styles.bioBigText}>
              {Platform.OS === "ios" ? "Face ID / Touch ID" : "Touch to Unlock"}
            </Text>
          </TouchableOpacity>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
      ) : (
        <View style={styles.pinWrap}>
          {/* Dots */}
          <Animated.View
            style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
          >
            {Array.from({ length: pinLen }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < pin.length && styles.dotFilled,
                  !!error && i < pin.length && styles.dotError,
                ]}
              />
            ))}
          </Animated.View>

          {!!error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <Text style={styles.pinHint}>Enter PIN to continue</Text>
          )}

          {/* Keypad */}
          <View style={styles.keypad}>
            {KEYS.map((key, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.key, key === "" && styles.keyEmpty]}
                onPress={() => key !== "" && handleKey(key)}
                activeOpacity={0.55}
                disabled={key === ""}
              >
                {key === "⌫" ? (
                  <Ionicons
                    name="backspace-outline"
                    size={26}
                    color="rgba(255,255,255,0.85)"
                  />
                ) : (
                  <Text style={styles.keyText}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Biometric unlock option */}
          {bioAvail && (
            <TouchableOpacity
              style={styles.bioBtn}
              onPress={tryBiometric}
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  Platform.OS === "ios" ? "scan-circle-outline" : "finger-print"
                }
                size={22}
                color="rgba(255,255,255,0.65)"
              />
              <Text style={styles.bioText}>
                {Platform.OS === "ios" ? "Use Face ID" : "Use Fingerprint"}
              </Text>
            </TouchableOpacity>
          )}

          {/* PIN missing — show reset hint */}
          {pinMissing && (
            <Text style={styles.resetHint}>
              Go to Profile → Settings → Security to reset your PIN.
            </Text>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1 },
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },

  header: { alignItems: "center", gap: 10 },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(217,93,57,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(217,93,57,0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  appName: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: "white",
    letterSpacing: 1,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },

  pinWrap: { alignItems: "center", width: "100%", gap: 14 },
  dotsRow: { flexDirection: "row", gap: 16 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dotError: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
  },
  pinHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#FF8B8B",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  resetHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 18,
    marginTop: 4,
  },

  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: KEY_SIZE * 3 + 32,
    gap: 10,
    justifyContent: "center",
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  keyEmpty: { backgroundColor: "transparent", borderColor: "transparent" },
  keyText: {
    fontFamily: fonts.body,
    fontSize: 26,
    color: "white",
    fontWeight: "300",
  },

  bioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  bioText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },

  bioOnlyWrap: { alignItems: "center", gap: 20 },
  bioBigBtn: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 32,
    paddingHorizontal: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  bioBigText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
});
