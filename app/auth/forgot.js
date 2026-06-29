import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import { auth as authApi } from "../../lib/api";

// ─── Input with focus border ──────────────────────────────────────────────────
function InputField({
  icon,
  label,
  placeholder,
  value,
  onChange,
  kbType,
  secure,
  max,
  testID,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View style={[f.row, focused && f.rowFocused]}>
        <Ionicons
          name={icon}
          size={18}
          color={focused ? colors.primary : colors.textDisabled}
        />
        <TextInput
          testID={testID}
          style={f.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          value={value}
          onChangeText={onChange}
          keyboardType={kbType || "default"}
          secureTextEntry={!!secure}
          autoCapitalize="none"
          maxLength={max}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

const f = StyleSheet.create({
  wrap: { marginTop: 16 },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },
  rowFocused: { borderColor: colors.primary, backgroundColor: "#FFFAF7" },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
    height: 56,
  },
});

// ─── Action button ────────────────────────────────────────────────────────────
function ActionBtn({ label, loading, onPress, testID }) {
  return (
    <TouchableOpacity
      style={s.ctaBtn}
      onPress={onPress}
      disabled={loading}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Text style={s.ctaTxt}>{label}</Text>
          <View style={s.ctaChevron}>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const STEP_LABELS = ["Email", "OTP", "Password"];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Forgot() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const sendOtp = async () => {
    if (!email.includes("@")) {
      showToast("Please enter a valid email");
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      showToast(`OTP sent to ${email}. Check your inbox.`, "info");
      setStep(2);
    } catch (e) {
      showToast(e.message || "Could not send OTP. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 4) {
      showToast("Please enter the 4–6 digit OTP");
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyOtp(email.trim(), otp.trim());
      setStep(3);
    } catch (e) {
      showToast(e.message || "Invalid OTP. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(email.trim(), otp.trim(), newPassword);
      showToast("Password reset successfully!", "success");
      setTimeout(() => router.replace("/auth/login"), 1800);
    } catch (e) {
      showToast(e.message || "Reset failed. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Hero ───────────────────────────────────── */}
          <LinearGradient colors={[colors.secondary, "#1E0504"]} style={s.hero}>
            <View
              style={[s.dec, { width: 200, height: 200, top: -70, right: -60 }]}
            />
            <View
              style={[
                s.dec,
                { width: 120, height: 120, bottom: 10, left: -40 },
              ]}
            />

            <TouchableOpacity
              onPress={() => router.back()}
              style={s.backBtn}
              testID="forgot-back"
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color="rgba(255,255,255,0.85)"
              />
            </TouchableOpacity>

            <View style={s.logoBox}>
              <Ionicons name="key" size={30} color={colors.primary} />
            </View>
            <Text style={s.appLabel}>TRIP KART</Text>
            <Text style={s.heroTitle}>Reset Password</Text>
            <Text style={s.heroSub}>
              {step === 1
                ? "Enter your email to get started"
                : step === 2
                  ? "Check your inbox for the OTP"
                  : "Set a new secure password"}
            </Text>
          </LinearGradient>

          {/* ── Card ───────────────────────────────────── */}
          <View style={s.card}>
            {/* Step indicator */}
            <View style={s.stepperOuter}>
              <View style={s.dotsRow}>
                {[1, 2, 3].map((n, i) => (
                  <View
                    key={n}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: i < 2 ? 1 : 0,
                    }}
                  >
                    <View
                      style={[
                        s.dot,
                        step >= n && s.dotActive,
                        step > n && s.dotDone,
                      ]}
                    >
                      {step > n ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : (
                        <Text
                          style={[s.dotNum, step >= n && { color: "#fff" }]}
                        >
                          {n}
                        </Text>
                      )}
                    </View>
                    {i < 2 && (
                      <View
                        style={[s.connector, step > n && s.connectorDone]}
                      />
                    )}
                  </View>
                ))}
              </View>
              <View style={s.labelsRow}>
                {STEP_LABELS.map((lbl, i) => (
                  <Text
                    key={lbl}
                    style={[s.stepLbl, step >= i + 1 && s.stepLblActive]}
                  >
                    {lbl}
                  </Text>
                ))}
              </View>
            </View>

            {/* ── Step 1: Email ── */}
            {step === 1 && (
              <View>
                <Text style={s.stepHeading}>Enter your email</Text>
                <Text style={s.stepHint}>
                  We'll send a one-time password to verify your identity.
                </Text>
                <InputField
                  icon="mail-outline"
                  label="Email Address"
                  placeholder="you@example.com"
                  value={email}
                  onChange={setEmail}
                  kbType="email-address"
                  testID="forgot-email"
                />
                <ActionBtn
                  label="Send OTP"
                  loading={loading}
                  onPress={sendOtp}
                  testID="send-otp-btn"
                />
              </View>
            )}

            {/* ── Step 2: OTP ── */}
            {step === 2 && (
              <View>
                <Text style={s.stepHeading}>Enter the OTP</Text>
                <Text style={s.stepHint}>
                  Code sent to{" "}
                  <Text
                    style={{
                      color: colors.primary,
                      fontFamily: fonts.bodyBold,
                    }}
                  >
                    {email}
                  </Text>
                </Text>
                <InputField
                  icon="key-outline"
                  label="OTP Code"
                  placeholder="4–6 digit code"
                  value={otp}
                  onChange={setOtp}
                  kbType="number-pad"
                  max={6}
                  testID="forgot-otp"
                />
                <ActionBtn
                  label="Verify OTP"
                  loading={loading}
                  onPress={verifyOtp}
                  testID="verify-otp-btn"
                />
                <TouchableOpacity
                  onPress={sendOtp}
                  style={s.resendRow}
                  testID="resend-otp"
                >
                  <Text style={s.resendTxt}>Didn't receive it? </Text>
                  <Text style={s.resendLink}>Resend OTP</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Step 3: New Password ── */}
            {step === 3 && (
              <View>
                <Text style={s.stepHeading}>Set new password</Text>
                <Text style={s.stepHint}>
                  Choose a strong password for your account.
                </Text>
                <InputField
                  icon="lock-closed-outline"
                  label="New Password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={setNewPassword}
                  secure
                  testID="forgot-new-pwd"
                />
                <InputField
                  icon="lock-closed-outline"
                  label="Confirm Password"
                  placeholder="Repeat your new password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  secure
                  testID="forgot-confirm-pwd"
                />
                <ActionBtn
                  label="Reset Password"
                  loading={loading}
                  onPress={resetPassword}
                  testID="reset-pwd-btn"
                />
              </View>
            )}

            <TouchableOpacity
              onPress={() => router.replace("/auth/login")}
              style={s.backToLogin}
              testID="back-to-login"
            >
              <Ionicons name="arrow-back" size={14} color={colors.primary} />
              <Text style={s.backToLoginTxt}>Back to login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  // ── Hero ──────────────────────────────────
  hero: {
    paddingTop: 28,
    paddingBottom: 56,
    paddingHorizontal: 28,
    alignItems: "center",
    overflow: "hidden",
    minHeight: 240,
  },
  dec: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  backBtn: {
    position: "absolute",
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  appLabel: {
    color: colors.primary,
    fontFamily: fonts.accent,
    fontSize: 10,
    letterSpacing: 5,
    marginBottom: 8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontFamily: fonts.heading,
    fontSize: 28,
    textAlign: "center",
  },
  heroSub: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },

  // ── Card ──────────────────────────────────
  card: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
  },

  // ── Stepper ───────────────────────────────
  stepperOuter: { marginBottom: 28 },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotDone: { backgroundColor: colors.success, borderColor: colors.success },
  dotNum: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: 4,
  },
  connectorDone: { backgroundColor: colors.success },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  stepLbl: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    width: 70,
    textAlign: "center",
  },
  stepLblActive: { color: colors.primary, fontFamily: fonts.bodyBold },

  stepHeading: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  stepHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // ── CTA ───────────────────────────────────
  ctaBtn: {
    marginTop: 24,
    height: 58,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...shadow.card,
  },
  ctaTxt: {
    color: "#fff",
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  ctaChevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    alignItems: "center",
  },
  resendTxt: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  resendLink: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },

  backToLogin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 28,
  },
  backToLoginTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
});
