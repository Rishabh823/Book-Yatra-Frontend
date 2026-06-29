import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fonts } from "../../lib/theme";
import { useColors } from "../../lib/ThemeContext";
import { auth as authApi } from "../../lib/api";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";

const FIELDS = [
  {
    key: "current",
    label: "Current Password",
    placeholder: "Enter current password",
  },
  { key: "newPw", label: "New Password", placeholder: "At least 6 characters" },
  {
    key: "confirm",
    label: "Confirm Password",
    placeholder: "Re-enter new password",
  },
];

const TIPS = [
  "At least 8 characters long",
  "Mix uppercase & lowercase letters",
  "Include numbers & symbols",
  "Never reuse old passwords",
];

export default function ChangePassword() {
  const router = useRouter();
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { toast, showToast, hideToast } = useToast();

  const [form, setForm] = useState({ current: "", newPw: "", confirm: "" });
  const [show, setShow] = useState({
    current: false,
    newPw: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  const toggleShow = (k) => setShow((prev) => ({ ...prev, [k]: !prev[k] }));

  const submit = async () => {
    if (!form.current || !form.newPw) {
      showToast("Current and new password are required.");
      return;
    }
    if (form.newPw !== form.confirm) {
      showToast("New passwords do not match.");
      return;
    }
    if (form.newPw.length < 6) {
      showToast("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(form.current, form.newPw);
      showToast("Password updated successfully.", "success");
      setForm({ current: "", newPw: "", confirm: "" });
    } catch (e) {
      showToast(e.message || "Could not change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Change Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon card */}
          <View style={s.heroCard}>
            <View style={s.iconCircle}>
              <Ionicons name="key" size={32} color="#F97316" />
            </View>
            <Text style={s.heroTitle}>Update Your Password</Text>
            <Text style={s.heroSub}>
              Choose a strong password to keep your account safe.
            </Text>
          </View>

          {/* Fields */}
          <View style={s.card}>
            {FIELDS.map((f, i) => (
              <View
                key={f.key}
                style={[s.fieldWrap, i < FIELDS.length - 1 && s.fieldBorder]}
              >
                <Text style={s.fieldLabel}>{f.label}</Text>
                <View style={s.inputRow}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={colors.textDisabled}
                  />
                  <TextInput
                    style={s.input}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.textDisabled}
                    secureTextEntry={!show[f.key]}
                    value={form[f.key]}
                    onChangeText={(v) => setField(f.key, v)}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => toggleShow(f.key)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={show[f.key] ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.textDisabled}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.submitBtn, loading && s.submitBtnDisabled]}
            onPress={submit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={s.submitTxt}>Update Password</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Tips */}
          <View style={s.tipsCard}>
            <View style={s.tipsHeader}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color="#16A34A"
              />
              <Text style={s.tipsTitle}>Tips for a strong password</Text>
            </View>
            {TIPS.map((tip) => (
              <View key={tip} style={s.tipRow}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={14}
                  color="#16A34A"
                />
                <Text style={s.tipTxt}>{tip}</Text>
              </View>
            ))}
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

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderSubtle,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.elevated,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      fontFamily: "Philosopher_700Bold",
      fontSize: 18,
      color: colors.textPrimary,
      marginLeft: 10,
    },

    scroll: { padding: 16, paddingBottom: 48, gap: 16 },

    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 28,
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    iconCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: "#FFF7ED",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    heroTitle: {
      fontFamily: "Philosopher_700Bold",
      fontSize: 20,
      color: colors.textPrimary,
    },
    heroSub: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      overflow: "hidden",
    },
    fieldWrap: { padding: 16 },
    fieldBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderSubtle,
    },
    fieldLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.elevated,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    input: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.textPrimary,
    },

    submitBtn: {
      backgroundColor: "#D95D39",
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" },

    tipsCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    tipsHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 4,
    },
    tipsTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    tipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    tipTxt: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
    },
  });
