import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import { auth as authApi } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";

const { width: W } = Dimensions.get("window");

// ─── Reusable Input ───────────────────────────────────────────────────────────
function InputField({ icon, label, placeholder, value, onChange, secure, kbType, rightIcon, onRightPress, testID, rightTestID }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View style={[f.row, focused && f.rowFocused]}>
        <Ionicons name={icon} size={17} color={focused ? colors.primary : colors.textDisabled} />
        <TextInput
          testID={testID}
          style={f.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!!secure}
          autoCapitalize="none"
          keyboardType={kbType || "default"}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightPress} hitSlop={10} testID={rightTestID}>
            <Ionicons name={rightIcon} size={17} color={colors.textDisabled} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const f = StyleSheet.create({
  wrap: { marginTop: 16 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    height: 54,
    backgroundColor: "#FAFAF9",
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },
  rowFocused: { borderColor: colors.primary, backgroundColor: "#FFFAF7" },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary, height: 54 },
});

// ─── Tab bar pills ────────────────────────────────────────────────────────────
const TABS = [
  { label: "User", icon: "person-outline" },
  { label: "Volunteer", icon: "shield-checkmark-outline" },
  { label: "Manager", icon: "briefcase-outline" },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Login() {
  const router = useRouter();
  const { t } = useLang();
  const [tab, setTab] = useState(0);
  const [emailOrMobile, setEmailOrMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const onGuestLogin = async () => {
    setGuestLoading(true);
    try {
      await authApi.guestLogin();
      router.replace("/(tabs)");
    } catch (e) {
      showToast(e.message || "Could not sign in as guest. Please try again.", "error");
    } finally {
      setGuestLoading(false);
    }
  };

  const onLogin = async () => {
    if (!emailOrMobile || !password) {
      showToast("Please enter your email/mobile and password", "error");
      return;
    }
    setLoading(true);
    try {
      let res;
      if (tab === 2) {
        res = await authApi.loginManager(emailOrMobile.trim(), password);
      } else {
        res = await authApi.login(emailOrMobile.trim(), password);
      }
      if (res?.user?.role === "volunteer" && res?.user?.isFirstLogin !== false) {
        router.replace("/volunteer/onboarding");
      } else if (res?.user?.role === "volunteer") {
        router.replace("/volunteer");
      } else if (res?.user?.role === "user" && !(res?.user?.joinedOperators?.length > 0)) {
        router.replace("/select-operators");
      } else {
        router.replace("/(tabs)");
      }
    } catch (e) {
      showToast(e.message || "Login failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (i) => {
    setTab(i);
    setEmailOrMobile("");
    setPassword("");
    setShowPwd(false);
  };

  const heroTitle = tab === 0 ? "Welcome Back" : tab === 1 ? "Volunteer Portal" : "Manager Portal";
  const heroSub = tab === 0
    ? "Sign in to continue your journey"
    : tab === 1
    ? "Access your volunteer dashboard"
    : "Manage your tours & operators";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0D0D0D" }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Hero ──────────────────────────────────────────── */}
          <LinearGradient colors={["#0D0D0D", "#1A0A08", colors.secondary]} style={s.hero}>
            {/* Decorative circles */}
            <View style={[s.dec, { width: 280, height: 280, top: -120, right: -100, backgroundColor: "rgba(217,93,57,0.07)" }]} />
            <View style={[s.dec, { width: 180, height: 180, bottom: -20, left: -80, backgroundColor: "rgba(217,93,57,0.05)" }]} />
            <View style={[s.dec, { width: 100, height: 100, top: 60, right: 20, backgroundColor: "rgba(255,255,255,0.03)" }]} />

            {/* Back button */}
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn} testID="back-btn">
              <Ionicons name="arrow-back" size={19} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            {/* Logo */}
            <View style={s.logoSection}>
              <View style={s.logoMark}>
                <View style={s.logoInner}>
                  <Ionicons name="map" size={20} color="#fff" />
                </View>
                <View style={s.logoAccent}>
                  <Ionicons name="ticket" size={10} color={colors.primary} />
                </View>
              </View>
              <View style={s.logoTextBlock}>
                <Text style={s.logoName}>TripKart</Text>
                <Text style={s.logoTagline}>Sacred Journeys · Sacred Destinations</Text>
              </View>
            </View>

            {/* Hero Text */}
            <View style={s.heroTextBlock}>
              <Text style={s.heroTitle}>{heroTitle}</Text>
              <Text style={s.heroSub}>{heroSub}</Text>
            </View>

            {/* Floating stats row */}
            <View style={s.statsRow}>
              {[
                { num: "50K+", label: "Pilgrims" },
                { num: "200+", label: "Tours" },
                { num: "4.8★", label: "Rated" },
              ].map((item) => (
                <View key={item.label} style={s.statItem}>
                  <Text style={s.statNum}>{item.num}</Text>
                  <Text style={s.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          {/* ── Form Card ─────────────────────────────────────── */}
          <View style={s.card}>
            {/* Tab Switcher */}
            <View style={s.tabBar}>
              {TABS.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.tabItem, tab === i && s.tabItemActive]}
                  onPress={() => switchTab(i)}
                  testID={`tab-${i}`}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={item.icon}
                    size={13}
                    color={tab === i ? "#fff" : colors.textSecondary}
                  />
                  <Text style={[s.tabText, tab === i && s.tabTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Volunteer info hint */}
            {tab === 1 && (
              <View style={s.hintBox}>
                <Ionicons name="information-circle-outline" size={15} color="#1D4ED8" />
                <Text style={s.hintTxt}>
                  Volunteer accounts are created by your operator admin. Contact them for credentials.
                </Text>
              </View>
            )}

            {/* Input Fields */}
            <InputField
              icon="mail-outline"
              label="Email or Mobile Number"
              placeholder={
                tab === 2 ? "operator@example.com" : tab === 1 ? "volunteer@example.com" : "you@example.com or 98xxxxxxxx"
              }
              value={emailOrMobile}
              onChange={setEmailOrMobile}
              kbType={tab === 2 ? "email-address" : "default"}
              testID="login-email-input"
            />
            <InputField
              icon="lock-closed-outline"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={setPassword}
              secure={!showPwd}
              rightIcon={showPwd ? "eye-off-outline" : "eye-outline"}
              onRightPress={() => setShowPwd((v) => !v)}
              testID="login-password-input"
              rightTestID="toggle-pwd"
            />

            <TouchableOpacity
              onPress={() => router.push("/auth/forgot")}
              style={s.forgotRow}
              testID="forgot-link"
            >
              <Text style={s.forgotTxt}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Primary CTA */}
            <TouchableOpacity
              style={[s.ctaBtn, loading && s.ctaBtnLoading]}
              onPress={onLogin}
              disabled={loading}
              testID="login-submit-btn"
              activeOpacity={0.87}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={s.ctaTxt}>
                    {tab === 2 ? "Login as Manager" : tab === 1 ? "Volunteer Sign In" : "Sign In"}
                  </Text>
                  <View style={s.ctaArrow}>
                    <Ionicons name="arrow-forward" size={15} color={colors.secondary} />
                  </View>
                </>
              )}
            </TouchableOpacity>

            {/* Guest & Social — Yatra Users only */}
            {tab === 0 && (
              <>
                <View style={s.divRow}>
                  <View style={s.divLine} />
                  <Text style={s.divTxt}>or continue with</Text>
                  <View style={s.divLine} />
                </View>

                <TouchableOpacity
                  style={s.guestBtn}
                  onPress={onGuestLogin}
                  disabled={guestLoading}
                  testID="continue-guest-btn"
                  activeOpacity={0.8}
                >
                  {guestLoading ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <>
                      <View style={s.guestIconWrap}>
                        <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                      </View>
                      <Text style={s.guestTxt}>Continue as Guest</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Register link */}
            {tab !== 1 && (
              <View style={s.regRow}>
                <Text style={s.regTxt}>
                  {tab === 2 ? "New operator? " : "Don't have an account? "}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push(`/auth/register?type=${tab === 2 ? "manager" : "user"}`)}
                  testID="goto-register"
                >
                  <Text style={s.regLink}>
                    {tab === 2 ? "Register here" : "Create account"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Admin portal — discreet */}
            <TouchableOpacity
              style={s.adminBtn}
              onPress={() => router.push("/auth/admin-portal")}
              testID="goto-admin-portal"
            >
              <Ionicons name="shield-outline" size={10} color={colors.textDisabled} />
              <Text style={s.adminTxt}>Admin Portal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  // ── Hero ──────────────────────────────────────
  hero: {
    paddingTop: 20,
    paddingBottom: 48,
    paddingHorizontal: 24,
    overflow: "hidden",
    minHeight: 260,
  },
  dec: {
    position: "absolute",
    borderRadius: 999,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(217,93,57,0.85)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  logoInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoAccent: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#F8F7F4",
  },
  logoTextBlock: { gap: 2 },
  logoName: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: "#fff",
    letterSpacing: 0.5,
  },
  logoTagline: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.3,
  },
  heroTextBlock: { gap: 6, marginBottom: 24 },
  heroTitle: {
    fontFamily: fonts.heading,
    fontSize: 30,
    color: "#fff",
    lineHeight: 36,
  },
  heroSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingVertical: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.08)",
  },
  statNum: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.primary,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    marginTop: 2,
  },

  // ── Card ──────────────────────────────────────
  card: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 44,
    minHeight: 480,
  },

  // ── Tab Bar ───────────────────────────────────
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 4,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    marginBottom: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  tabItemActive: { backgroundColor: colors.primary },
  tabText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textSecondary },
  tabTextActive: { color: "#fff" },

  // ── Hint ──────────────────────────────────────
  hintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: radius.md,
    padding: 12,
    marginTop: 12,
  },
  hintTxt: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: "#1D4ED8",
    lineHeight: 18,
  },

  // ── Forgot ────────────────────────────────────
  forgotRow: { alignSelf: "flex-end", marginTop: 10 },
  forgotTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },

  // ── CTA ───────────────────────────────────────
  ctaBtn: {
    marginTop: 22,
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...shadow.card,
  },
  ctaBtnLoading: { opacity: 0.75 },
  ctaTxt: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 16, letterSpacing: 0.3 },
  ctaArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Divider ───────────────────────────────────
  divRow: { flexDirection: "row", alignItems: "center", marginVertical: 18, gap: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: colors.borderSubtle },
  divTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },

  // ── Guest ─────────────────────────────────────
  guestBtn: {
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  guestIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  guestTxt: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary },

  // ── Register row ──────────────────────────────
  regRow: { flexDirection: "row", justifyContent: "center", marginTop: 22, alignItems: "center" },
  regTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  regLink: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },

  // ── Admin ─────────────────────────────────────
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 20,
    opacity: 0.28,
  },
  adminTxt: { fontFamily: fonts.accent, fontSize: 10, color: colors.textDisabled, letterSpacing: 1.5 },
});
