import { useState } from "react";
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

// ─── Reusable input with focus border ────────────────────────────────────────
function InputField({
  icon,
  label,
  placeholder,
  value,
  onChange,
  secure,
  kbType,
  rightIcon,
  onRightPress,
  testID,
  rightTestID,
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
          secureTextEntry={!!secure}
          autoCapitalize="none"
          keyboardType={kbType || "default"}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightPress}
            hitSlop={8}
            testID={rightTestID}
          >
            <Ionicons name={rightIcon} size={18} color={colors.textDisabled} />
          </TouchableOpacity>
        )}
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Login() {
  const router = useRouter();
  const { t } = useLang();
  const [tab, setTab] = useState(0); // 0 = Yatra Users, 1 = Yatra Manager
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
      showToast(e.message || "Could not sign in as guest. Please try again.");
    } finally {
      setGuestLoading(false);
    }
  };

  const onLogin = async () => {
    if (!emailOrMobile || !password) {
      showToast("Please enter your email/mobile and password");
      return;
    }
    setLoading(true);
    try {
      let res;
      if (tab === 1) {
        res = await authApi.loginManager(emailOrMobile.trim(), password);
      } else {
        res = await authApi.login(emailOrMobile.trim(), password);
      }
      if (
        res?.user?.role === "user" &&
        !(res?.user?.joinedOperators?.length > 0)
      ) {
        router.replace("/select-operators");
      } else {
        router.replace("/(tabs)");
      }
    } catch (e) {
      showToast(e.message || "Login failed. Please try again.");
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Hero ─────────────────────────────────────────── */}
          <LinearGradient colors={[colors.secondary, "#1E0504"]} style={s.hero}>
            <View
              style={[s.dec, { width: 220, height: 220, top: -80, right: -70 }]}
            />
            <View
              style={[
                s.dec,
                { width: 140, height: 140, bottom: 10, left: -55 },
              ]}
            />
            <View
              style={[
                s.dec,
                { width: 80, height: 80, top: 40, right: 30, opacity: 0.04 },
              ]}
            />

            <TouchableOpacity
              onPress={() => router.back()}
              style={s.backBtn}
              testID="back-btn"
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color="rgba(255,255,255,0.85)"
              />
            </TouchableOpacity>

            <View style={s.logoBox}>
              <Ionicons name="bus" size={32} color={colors.primary} />
            </View>
            <Text style={s.appLabel}>BOOK YATRA</Text>
            <Text style={s.heroTitle}>
              {tab === 0 ? "Welcome Back" : "Manager Login"}
            </Text>
            <Text style={s.heroSub}>
              {tab === 0
                ? "Sign in to continue your sacred journey"
                : "Access your tour operator dashboard"}
            </Text>
          </LinearGradient>

          {/* ── Form Card ─────────────────────────────────────── */}
          <View style={s.card}>
            {/* Tab Switcher */}
            <View style={s.tabBar}>
              {[
                { label: "Yatra Users", icon: "people-outline" },
                { label: "Yatra Manager", icon: "bus-outline" },
              ].map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.tabItem, tab === i && s.tabItemActive]}
                  onPress={() => switchTab(i)}
                  testID={i === 0 ? "tab-users" : "tab-manager"}
                >
                  <Ionicons
                    name={item.icon}
                    size={15}
                    color={tab === i ? "#fff" : colors.textSecondary}
                  />
                  <Text style={[s.tabText, tab === i && s.tabTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Fields */}
            <InputField
              icon="mail-outline"
              label="Email or Mobile Number"
              placeholder={
                tab === 1
                  ? "operator@example.com"
                  : "you@example.com or 98xxxxxxxx"
              }
              value={emailOrMobile}
              onChange={setEmailOrMobile}
              kbType={tab === 1 ? "email-address" : "default"}
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
              style={s.ctaBtn}
              onPress={onLogin}
              disabled={loading}
              testID="login-submit-btn"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={s.ctaTxt}>
                    {tab === 1 ? "Login as Manager" : "Sign In"}
                  </Text>
                  <View style={s.ctaChevron}>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                </>
              )}
            </TouchableOpacity>

            {/* Guest option — Yatra Users only */}
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
                >
                  {guestLoading ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <>
                      <View style={s.guestAvatar}>
                        <Ionicons
                          name="person-outline"
                          size={16}
                          color={colors.textSecondary}
                        />
                      </View>
                      <Text style={s.guestTxt}>Continue as Guest</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Register link */}
            <View style={s.regRow}>
              <Text style={s.regTxt}>
                {tab === 1 ? "New operator? " : "Don't have an account? "}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  router.push(
                    `/auth/register?type=${tab === 1 ? "manager" : "user"}`,
                  )
                }
                testID="goto-register"
              >
                <Text style={s.regLink}>
                  {tab === 1 ? "Register here" : "Create account"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Admin entry — discreet */}
            <TouchableOpacity
              style={s.adminBtn}
              onPress={() => router.push("/auth/admin-portal")}
              testID="goto-admin-portal"
            >
              <Ionicons
                name="shield-outline"
                size={11}
                color={colors.textDisabled}
              />
              <Text style={s.adminTxt}>Admin Portal</Text>
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
    lineHeight: 20,
  },

  // ── Form Card ──────────────────────────────
  card: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 44,
    minHeight: 500,
  },

  // ── Tab Switcher ───────────────────────────
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 4,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.lg,
  },
  tabItemActive: { backgroundColor: colors.primary },
  tabText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  tabTextActive: { color: "#fff" },

  forgotRow: { alignSelf: "flex-end", marginTop: 10 },
  forgotTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },

  // ── CTA Button ─────────────────────────────
  ctaBtn: {
    marginTop: 22,
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

  // ── Divider ────────────────────────────────
  divRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
    gap: 10,
  },
  divLine: { flex: 1, height: 1, backgroundColor: colors.borderSubtle },
  divTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },

  // ── Guest Button ───────────────────────────
  guestBtn: {
    height: 54,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  guestAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  guestTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textPrimary,
  },

  // ── Footer ─────────────────────────────────
  regRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    alignItems: "center",
  },
  regTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  regLink: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },

  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 22,
    opacity: 0.3,
  },
  adminTxt: {
    fontFamily: fonts.accent,
    fontSize: 10,
    color: colors.textDisabled,
    letterSpacing: 1.5,
  },
});
