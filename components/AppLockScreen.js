import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  StatusBar,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pinStorage } from "../lib/security/secureStorage";
import { useBiometric } from "../lib/hooks/useBiometric";
import { useAppLock } from "../lib/security/appLockContext";
import { colors, fonts, radius } from "../lib/theme";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export default function AppLockScreen() {
  const insets = useSafeAreaInsets();
  const { unlock, lockReason } = useAppLock();
  const { checkSupport, authenticate } = useBiometric();

  const [pin, setPin] = useState("");
  const [pinLen, setPinLen] = useState(6);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [bioAvail, setBioAvail] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(null);

  useEffect(() => {
    checkSupport()
      .then((s) => setBioAvail(s.available))
      .catch(() => {});
  }, []);

  const triggerError = (msg) => {
    setPin("");
    setError(msg);
    setShake(true);
    Vibration.vibrate(400);
    setTimeout(() => setShake(false), 600);
  };

  const tryBiometric = useCallback(async () => {
    const result = await authenticate("Unlock Book Yatra");
    if (result.success) {
      setError("");
      unlock();
    }
  }, [authenticate, unlock]);

  useEffect(() => {
    if (bioAvail) tryBiometric();
  }, [bioAvail]);

  const handleKey = useCallback(
    async (key) => {
      if (lockedUntil && new Date(lockedUntil) > new Date()) {
        const secs = Math.ceil((new Date(lockedUntil) - Date.now()) / 1000);
        setError(`Locked. Try again in ${secs}s`);
        return;
      }

      if (key === "⌫") {
        setPin((p) => p.slice(0, -1));
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
        } else if (result.reason === "locked") {
          setLockedUntil(result.lockedUntil);
          triggerError("Too many attempts. App locked for 15 min.");
        } else {
          const left = result.attemptsLeft ?? 0;
          triggerError(
            `Wrong PIN. ${left} attempt${left === 1 ? "" : "s"} left.`,
          );
        }
      }
    },
    [pin, pinLen, lockedUntil, unlock],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#1E0A0A", "#5C1615", "#8B1F1E"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.top}>
        <Ionicons name="lock-closed" size={42} color="rgba(255,255,255,0.9)" />
        <Text style={styles.title}>App Locked</Text>
        <Text style={styles.sub}>Enter your PIN to continue</Text>
      </View>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: pinLen }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              shake && styles.dotShake,
              i < pin.length && styles.dotFilled,
            ]}
          />
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {/* Keypad */}
      <View style={styles.keypad}>
        {KEYS.map((key, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.key, key === "" && styles.keyEmpty]}
            onPress={() => key !== "" && handleKey(key)}
            activeOpacity={0.7}
            disabled={key === ""}
          >
            {key === "⌫" ? (
              <Ionicons name="backspace-outline" size={24} color="white" />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {bioAvail && (
        <TouchableOpacity style={styles.bioBtn} onPress={tryBiometric}>
          <Ionicons
            name={Platform.OS === "ios" ? "scan-circle" : "finger-print"}
            size={32}
            color="rgba(255,255,255,0.85)"
          />
          <Text style={styles.bioText}>
            {Platform.OS === "ios" ? "Face ID / Touch ID" : "Fingerprint"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  top: { alignItems: "center", gap: 8 },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: "white",
    letterSpacing: 0.5,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
  },

  dotsRow: { flexDirection: "row", gap: 14 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "transparent",
  },
  dotFilled: { backgroundColor: "white", borderColor: "white" },
  dotShake: { borderColor: "#FF6B6B" },

  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#FF6B6B",
    textAlign: "center",
  },

  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 264,
    gap: 12,
    justifyContent: "center",
  },
  key: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  keyEmpty: { backgroundColor: "transparent", borderColor: "transparent" },
  keyText: {
    fontFamily: fonts.body,
    fontSize: 24,
    color: "white",
    fontWeight: "300",
  },

  bioBtn: { alignItems: "center", gap: 6, paddingBottom: 16 },
  bioText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
  },
});
