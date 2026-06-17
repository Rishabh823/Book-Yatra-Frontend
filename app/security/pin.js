import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Vibration,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pinStorage } from "../../lib/security/secureStorage";
import { securityApi } from "../../lib/api";
import { useAppLock } from "../../lib/security/appLockContext";
import { fonts } from "../../lib/theme";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

// ── Dot indicator ────────────────────────────────────────────────────────────
function PinDots({ length, filled, error }) {
  return (
    <View style={dots.row}>
      {Array.from({ length }).map((_, i) => {
        const active = i < filled;
        return (
          <View
            key={i}
            style={[
              dots.dot,
              active && dots.active,
              error && dots.err,
            ]}
          >
            {active && !error && <View style={dots.inner} />}
          </View>
        );
      })}
    </View>
  );
}

// ── Keypad ───────────────────────────────────────────────────────────────────
function PinPad({ onKey }) {
  return (
    <View style={pad.grid}>
      {KEYS.map((key, i) => {
        if (key === "") return <View key={i} style={pad.empty} />;
        return (
          <Pressable
            key={i}
            style={({ pressed }) => [pad.key, pressed && pad.keyPressed]}
            onPress={() => onKey(key)}
            android_ripple={{ color: "rgba(255,255,255,0.15)", radius: 38, borderless: true }}
          >
            {key === "⌫" ? (
              <Ionicons name="backspace" size={24} color="rgba(255,255,255,0.85)" />
            ) : (
              <Text style={pad.digit}>{key}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function PinScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loadSettings } = useAppLock();
  const { toast, showToast, hideToast } = useToast();

  const [hasPin, setHasPin] = useState(false);
  const [localPinHash, setLocalPinHash] = useState(false);
  const [pinLen, setPinLen] = useState(6);
  const [step, setStep] = useState("menu");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showRemovePinConfirm, setShowRemovePinConfirm] = useState(false);

  useEffect(() => {
    Promise.all([
      pinStorage.hasPin(),
      securityApi.getSettings().catch(() => null),
    ]).then(([local, settings]) => {
      setLocalPinHash(local);
      setHasPin(settings?.pinEnabled ?? local);
      setLoading(false);
    });
  }, []);

  const handleKey = useCallback(
    async (key) => {
      if (key === "⌫") {
        setError("");
        setPin((p) => p.slice(0, -1));
        return;
      }
      const next = pin + key;
      setPin(next);
      if (next.length < pinLen) return;

      setPin("");

      if (step === "enter_new") {
        setFirstPin(next);
        setStep("confirm_new");
        setError("");
        return;
      }

      if (step === "confirm_new") {
        if (next !== firstPin) {
          setError("PINs don't match — try again");
          setFirstPin("");
          setStep("enter_new");
          Vibration.vibrate([0, 80, 60, 80]);
          return;
        }
        try {
          await pinStorage.savePin(next);
          await securityApi.enablePin();
          setHasPin(true);
          setLocalPinHash(true);
          loadSettings();
          setStep("menu");
          setError("");
          showToast("PIN enabled - app will lock when you leave", "success");
        } catch {
          setError("Failed to save PIN.");
        }
        return;
      }

      if (step === "enter_current") {
        const result = await pinStorage.verifyPin(next);
        if (!result.valid) {
          if (result.reason === "no_pin") {
            setError("PIN not found on device — use Remove PIN below.");
          } else {
            setError("Incorrect PIN — try again");
            Vibration.vibrate([0, 80, 60, 80]);
          }
          return;
        }
        try {
          await pinStorage.clearPin();
          await securityApi.disablePin();
          setHasPin(false);
          setLocalPinHash(false);
          loadSettings();
          setStep("menu");
          setError("");
          showToast("PIN removed - app lock has been disabled", "success");
        } catch {
          setError("Failed to remove PIN.");
        }
      }
    },
    [pin, pinLen, step, firstPin, loadSettings, showToast],
  );

  const handleRemovePinConfirmed = useCallback(async () => {
    setShowRemovePinConfirm(false);
    try {
      await securityApi.disablePin();
      setHasPin(false);
      loadSettings();
      showToast("PIN removed - app lock has been disabled", "success");
    } catch {
      showToast("Could not remove PIN.", "error");
    }
  }, [loadSettings, showToast]);

  const STEP_LABEL = {
    enter_new: `Set a ${pinLen}-digit PIN`,
    confirm_new: `Confirm your PIN`,
    enter_current: "Enter current PIN to disable",
  };

  // ── PIN entry view ──────────────────────────────────────────────────────────
  if (step !== "menu") {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={["#0D0820", "#1B1040", "#0D0820"]}
          style={StyleSheet.absoluteFill}
        />

        {/* Header */}
        <View style={[entry.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={entry.cancelBtn}
            onPress={() => { setStep("menu"); setPin(""); setError(""); }}
          >
            <Text style={entry.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Icon + title */}
        <View style={entry.titleArea}>
          <View style={entry.iconWrap}>
            <Ionicons name="shield-checkmark" size={28} color="#A78BFA" />
          </View>
          <Text style={entry.title}>{STEP_LABEL[step]}</Text>
          {step === "confirm_new" && !error && (
            <Text style={entry.sub}>Re-enter your PIN to confirm</Text>
          )}
          {!!error && <Text style={entry.errTxt}>{error}</Text>}
        </View>

        {/* Dots */}
        <View style={entry.dotsWrap}>
          <PinDots length={pinLen} filled={pin.length} error={!!error} />
        </View>

        {/* Keypad */}
        <View style={[entry.padWrap, { paddingBottom: insets.bottom + 24 }]}>
          <PinPad onKey={handleKey} />
        </View>
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      </View>
    );
  }

  // ── Menu view ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#1E0A0A", "#3D1010", "#1E0A0A"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header bar */}
      <View style={[menu.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={menu.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </TouchableOpacity>
        <Text style={menu.topTitle}>App Lock PIN</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Hero section */}
      <View style={menu.hero}>
        <LinearGradient
          colors={["rgba(217,93,57,0.2)", "transparent"]}
          style={menu.heroBg}
        />
        <View style={menu.heroIconRing}>
          <View style={menu.heroIconInner}>
            <Ionicons
              name={hasPin ? "lock-closed" : "lock-open-outline"}
              size={34}
              color={hasPin ? "#D95D39" : "rgba(255,255,255,0.5)"}
            />
          </View>
        </View>
        <Text style={menu.heroStatus}>
          {hasPin ? "PIN Protection Active" : "PIN Not Set"}
        </Text>
        <Text style={menu.heroDesc}>
          {hasPin
            ? "Your app is protected. It will lock when you leave."
            : "Add a PIN to secure your app against unauthorized access."}
        </Text>
      </View>

      <View style={[menu.body, { paddingBottom: insets.bottom + 32 }]}>

        {/* PIN length selector */}
        <View style={menu.section}>
          <Text style={menu.sectionLabel}>PIN LENGTH</Text>
          <View style={menu.lenRow}>
            {[4, 6].map((n) => (
              <TouchableOpacity
                key={n}
                style={[menu.lenChip, pinLen === n && menu.lenChipActive]}
                onPress={() => setPinLen(n)}
              >
                <Ionicons
                  name={pinLen === n ? "radio-button-on" : "radio-button-off"}
                  size={16}
                  color={pinLen === n ? "#D95D39" : "rgba(255,255,255,0.35)"}
                />
                <Text style={[menu.lenChipTxt, pinLen === n && menu.lenChipTxtActive]}>
                  {n}-digit
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Divider */}
        <View style={menu.divider} />

        {/* Actions */}
        <View style={menu.section}>
          <Text style={menu.sectionLabel}>ACTIONS</Text>
          {!hasPin ? (
            <TouchableOpacity
              style={menu.primaryBtn}
              onPress={() => { setPin(""); setStep("enter_new"); }}
            >
              <LinearGradient
                colors={["#D95D39", "#B94929"]}
                style={menu.primaryBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color="white" />
                <Text style={menu.primaryBtnTxt}>Set Up PIN</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={menu.ghostBtn}
                onPress={() => { setPin(""); setStep("enter_new"); }}
              >
                <Ionicons name="refresh-outline" size={18} color="#D95D39" />
                <Text style={menu.ghostBtnTxt}>Change PIN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={menu.dangerBtn}
                onPress={() => {
                  if (!localPinHash) {
                    setShowRemovePinConfirm(true);
                  } else {
                    setPin("");
                    setStep("enter_current");
                  }
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#F87171" />
                <Text style={menu.dangerBtnTxt}>Remove PIN</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Note */}
        <Text style={menu.note}>
          Your PIN is stored securely on this device only and is never sent to our servers.
        </Text>
      </View>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmModal
        visible={showRemovePinConfirm}
        title="Remove PIN"
        message="PIN data not found on this device. Remove it anyway?"
        confirmText="Remove"
        onConfirm={handleRemovePinConfirmed}
        onCancel={() => setShowRemovePinConfirm(false)}
        onDismiss={() => setShowRemovePinConfirm(false)}
        destructive={true}
      />
    </View>
  );
}

// ── Styles: PIN entry ─────────────────────────────────────────────────────────
const dots = StyleSheet.create({
  row: { flexDirection: "row", gap: 16, alignItems: "center" },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  active: { borderColor: "#A78BFA", backgroundColor: "rgba(167,139,250,0.15)" },
  err: { borderColor: "#F87171", backgroundColor: "rgba(248,113,113,0.15)" },
  inner: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#A78BFA" },
});

const pad = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 288,
    gap: 16,
    justifyContent: "center",
    alignSelf: "center",
  },
  empty: { width: 80, height: 80 },
  key: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  keyPressed: { backgroundColor: "rgba(167,139,250,0.2)", borderColor: "#A78BFA" },
  digit: {
    fontSize: 26,
    color: "white",
    fontWeight: "300",
    letterSpacing: 1,
  },
});

const entry = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  cancelTxt: { fontSize: 15, color: "rgba(255,255,255,0.6)", fontFamily: fonts.body },
  titleArea: { alignItems: "center", paddingTop: 32, paddingHorizontal: 32 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(167,139,250,0.12)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: "white",
    textAlign: "center",
    marginBottom: 6,
  },
  sub: { fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: fonts.body, textAlign: "center" },
  errTxt: { fontSize: 13, color: "#F87171", fontFamily: fonts.body, textAlign: "center", marginTop: 4 },
  dotsWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  padWrap: { paddingTop: 8 },
});

// ── Styles: Menu ──────────────────────────────────────────────────────────────
const menu = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { fontSize: 17, fontFamily: fonts.bodyMedium, color: "white" },

  hero: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 24,
    position: "relative",
    overflow: "hidden",
  },
  heroBg: { ...StyleSheet.absoluteFillObject },
  heroIconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: "rgba(217,93,57,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heroIconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(217,93,57,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroStatus: { fontSize: 20, fontFamily: fonts.heading, color: "white", marginBottom: 8 },
  heroDesc: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 20,
  },

  body: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bodyMedium,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  lenRow: { flexDirection: "row", gap: 10 },
  lenChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  lenChipActive: {
    borderColor: "#D95D39",
    backgroundColor: "rgba(217,93,57,0.1)",
  },
  lenChipTxt: { fontSize: 14, fontFamily: fonts.bodyMedium, color: "rgba(255,255,255,0.45)" },
  lenChipTxtActive: { color: "#D95D39" },

  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginBottom: 20 },

  primaryBtn: { borderRadius: 14, overflow: "hidden" },
  primaryBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
  },
  primaryBtnTxt: { fontSize: 16, fontFamily: fonts.bodyBold, color: "white" },

  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(217,93,57,0.4)",
    backgroundColor: "rgba(217,93,57,0.06)",
    marginBottom: 10,
  },
  ghostBtnTxt: { fontSize: 15, fontFamily: fonts.bodyMedium, color: "#D95D39" },

  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(248,113,113,0.3)",
    backgroundColor: "rgba(248,113,113,0.06)",
  },
  dangerBtnTxt: { fontSize: 15, fontFamily: fonts.bodyMedium, color: "#F87171" },

  note: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 16,
  },
});
