import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import { saveEmergencyContact } from "../../lib/onboarding";

const STEP = 9;
const TOTAL = 10;

const RELATIONSHIPS = ["Spouse", "Parent", "Sibling", "Child", "Friend", "Other"];

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

export default function EmergencyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);
    await saveEmergencyContact({
      name: name.trim(),
      phone: phone.trim(),
      relationship,
    });
    setSaving(false);
    router.push("/onboarding/wallet");
  };

  const handleSkip = () => router.push("/onboarding/wallet");

  return (
    // Only top edge — bottom is handled by the ScrollView's paddingBottom
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <StepBar step={STEP} total={TOTAL} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={[
            s.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar */}
          <View style={s.topBar}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkip}>
              <Text style={s.skipTxt}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={s.header}>
            <View style={s.iconCircle}>
              <Ionicons name="heart" size={40} color="#DC2626" />
            </View>
            <Text style={s.title}>Emergency Contact</Text>
            <Text style={s.sub}>
              Add someone we can contact in case of an emergency during your
              travel
            </Text>
          </View>

          {/* Form */}
          <View style={s.form}>
            <View style={s.field}>
              <Text style={s.label}>Full Name *</Text>
              <View style={s.inputWrap}>
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={s.input}
                  placeholder="Enter full name"
                  placeholderTextColor={colors.textDisabled}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Phone Number *</Text>
              <View style={s.inputWrap}>
                <Ionicons
                  name="call-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={s.input}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={colors.textDisabled}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Relationship</Text>
              <View style={s.relWrap}>
                {RELATIONSHIPS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[s.relChip, relationship === r && s.relChipActive]}
                    onPress={() => setRelationship(r)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        s.relLabel,
                        relationship === r && s.relLabelActive,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Spacer pushes button to bottom when content is shorter than screen */}
          <View style={{ flex: 1, minHeight: 24 }} />

          {/* Button — always scrollable into view when keyboard opens */}
          <View style={s.bottom}>
            <TouchableOpacity
              style={[s.btn, (!name.trim() || !phone.trim()) && s.btnDisabled]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={!name.trim() || !phone.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={s.btnText}>Save & Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.skipFull} onPress={handleSkip}>
              <Text style={s.skipTxt}>Skip for Now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  skipTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
  header: { alignItems: "center", paddingHorizontal: 24, marginBottom: 20 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
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
  },
  form: { paddingHorizontal: 20, gap: 16 },
  field: { gap: 6 },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  relWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  relChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },
  relChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  relLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  relLabelActive: { color: colors.primary, fontFamily: fonts.bodySemiBold },
  bottom: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
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
  btnDisabled: { backgroundColor: colors.textDisabled },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" },
  skipFull: { alignItems: "center", paddingVertical: 10 },
});
