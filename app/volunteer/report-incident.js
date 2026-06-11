import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../../lib/api";
import { colors, fonts, radius, shadow } from "../../lib/theme";

const TYPES = [
  "medical",
  "accident",
  "theft",
  "harassment",
  "vehicle_breakdown",
  "missing_person",
  "other",
];
const SEVERITIES = ["low", "medium", "high", "critical"];

const SEV_COLORS = {
  low: "#16A34A",
  medium: "#D97706",
  high: "#DC2626",
  critical: "#7C3AED",
};

export default function ReportIncidentScreen() {
  const { tourId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [type, setType] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!type) return Alert.alert("Error", "Please select incident type");
    if (!title.trim()) return Alert.alert("Error", "Please enter a title");
    if (!description.trim())
      return Alert.alert("Error", "Please describe the incident");
    Alert.alert("Report Incident", "Submit this incident report?", [
      { text: "Cancel" },
      {
        text: "Submit",
        onPress: async () => {
          setSubmitting(true);
          try {
            await api.post("/incidents", {
              type,
              severity,
              title: title.trim(),
              description: description.trim(),
              location: location.trim() || undefined,
              tourId: tourId || undefined,
            });
            Alert.alert(
              "Reported!",
              "Incident has been reported and relevant personnel notified.",
              [{ text: "OK", onPress: () => router.back() }],
            );
          } catch {
            Alert.alert("Error", "Failed to submit report");
          }
          setSubmitting(false);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={["#1E0A0A", "#5C1615"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Report Incident</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          gap: 16,
          paddingBottom: insets.bottom + 20,
        }}
      >
        {/* Type */}
        <View>
          <Text style={styles.label}>Incident Type *</Text>
          <View style={styles.typesGrid}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeChip,
                  type === t && styles.typeChipActive,
                  shadow.soft,
                ]}
                onPress={() => setType(t)}
              >
                <Text
                  style={[styles.typeText, type === t && styles.typeTextActive]}
                >
                  {t.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Severity */}
        <View>
          <Text style={styles.label}>Severity *</Text>
          <View style={styles.severityRow}>
            {SEVERITIES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.sevChip,
                  severity === s && {
                    backgroundColor: SEV_COLORS[s],
                    borderColor: SEV_COLORS[s],
                  },
                ]}
                onPress={() => setSeverity(s)}
              >
                <Text
                  style={[styles.sevText, severity === s && { color: "white" }]}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Fields */}
        <View>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Brief description"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View>
          <Text style={styles.label}>Details *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what happened in detail..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={5}
          />
        </View>
        <View>
          <Text style={styles.label}>Location (optional)</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Where did this happen?"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Critical warning */}
        {severity === "critical" && (
          <View style={styles.warningCard}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.warningText}>
              Critical severity will immediately alert all supervisors and
              coordinators.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: SEV_COLORS[severity] }]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="warning" size={18} color="white" />
              <Text style={styles.submitText}>Submit Report</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontFamily: "Philosopher_700Bold",
    fontSize: 22,
    color: "white",
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  typesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  typeTextActive: { color: "white" },
  severityRow: { flexDirection: "row", gap: 8 },
  sevChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  sevText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  textArea: { height: 120, textAlignVertical: "top" },
  warningCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#FEE2E2",
    borderRadius: radius.lg,
    padding: 12,
  },
  warningText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#DC2626",
    lineHeight: 18,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.lg,
    padding: 16,
  },
  submitText: { fontFamily: fonts.bodyBold, fontSize: 16, color: "white" },
});
