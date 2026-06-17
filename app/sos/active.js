import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../../lib/api";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import ConfirmModal from "../../components/ConfirmModal";

const STATUS_STEPS = [
  { key: "active", label: "SOS Sent", icon: "alert-circle", color: "#DC2626" },
  {
    key: "acknowledged",
    label: "Acknowledged",
    icon: "checkmark-circle",
    color: "#D97706",
  },
  {
    key: "resolved",
    label: "Resolved",
    icon: "shield-checkmark",
    color: "#16A34A",
  },
];

const fmtTime = (d) => {
  if (!d) return "";
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60) return diff + "s ago";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  return Math.floor(diff / 3600) + "h ago";
};

export default function SOSActiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sosId } = useLocalSearchParams();
  const [sos, setSos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelSOSConfirm, setShowCancelSOSConfirm] = useState(false);

  const loadSOS = useCallback(async () => {
    try {
      const res = await api.get("/sos/" + sosId);
      setSos(res.data);
    } catch {}
    setLoading(false);
  }, [sosId]);

  useEffect(() => {
    loadSOS();
    const interval = setInterval(loadSOS, 10000);
    return () => clearInterval(interval);
  }, [loadSOS]);

  const currentStepIdx =
    STATUS_STEPS.findIndex((s) => s.key === sos?.status) || 0;
  const isResolved =
    sos?.status === "resolved" || sos?.status === "false_alarm";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isResolved ? ["#064E3B", "#065F46"] : ["#7F1D1D", "#991B1B"]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <Ionicons
            name={isResolved ? "shield-checkmark" : "alert-circle"}
            size={28}
            color="white"
          />
          <Text style={styles.headerTitle}>
            {isResolved ? "Help is on the way" : "SOS ACTIVE"}
          </Text>
        </View>
        {sos && (
          <Text style={styles.headerSub}>Sent {fmtTime(sos.createdAt)}</Text>
        )}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          gap: 16,
          paddingBottom: insets.bottom + 20,
        }}
      >
        {/* Status steps */}
        <View style={[styles.stepsCard, shadow.card]}>
          <Text style={styles.sectionTitle}>Status</Text>
          {STATUS_STEPS.map((step, idx) => {
            const isDone = idx <= currentStepIdx;
            return (
              <View key={step.key} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepIcon,
                    { backgroundColor: isDone ? step.color : "#F3F4F6" },
                  ]}
                >
                  <Ionicons
                    name={step.icon}
                    size={16}
                    color={isDone ? "white" : "#9CA3AF"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.stepLabel, isDone && { color: step.color }]}
                  >
                    {step.label}
                  </Text>
                  {isDone && sos && idx === currentStepIdx && (
                    <Text style={styles.stepTime}>
                      {fmtTime(sos.createdAt)}
                    </Text>
                  )}
                </View>
                {idx < STATUS_STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      isDone && { backgroundColor: step.color },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* SOS details */}
        {sos && (
          <View style={[styles.detailsCard, shadow.soft]}>
            <Text style={styles.sectionTitle}>Emergency Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type:</Text>
              <Text style={styles.detailValue}>{sos.type}</Text>
            </View>
            {sos.message && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Message:</Text>
                <Text style={styles.detailValue}>{sos.message}</Text>
              </View>
            )}
            {sos.acknowledgedBy && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Acknowledged by:</Text>
                <Text style={styles.detailValue}>
                  {sos.acknowledgedBy.name || "Admin"}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Updates */}
        {sos?.updates?.length > 0 && (
          <View style={[styles.updatesCard, shadow.soft]}>
            <Text style={styles.sectionTitle}>Updates</Text>
            {sos.updates.map((u, i) => (
              <View key={i} style={styles.updateRow}>
                <View style={styles.updateDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.updateMsg}>{u.message}</Text>
                  <Text style={styles.updateTime}>{fmtTime(u.timestamp)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {!isResolved && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setShowCancelSOSConfirm(true)}
          >
            <Text style={styles.cancelText}>This was a false alarm</Text>
          </TouchableOpacity>
        )}

        {isResolved && (
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <ConfirmModal
        visible={showCancelSOSConfirm}
        title="Cancel SOS"
        message="Mark this SOS as false alarm?"
        confirmText="Yes, Cancel"
        cancelText="No"
        onConfirm={() => { setShowCancelSOSConfirm(false); router.back(); }}
        onCancel={() => setShowCancelSOSConfirm(false)}
        onDismiss={() => setShowCancelSOSConfirm(false)}
        destructive={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 20, paddingBottom: 24 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { fontFamily: fonts.bodyBold, fontSize: 22, color: "white" },
  headerSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 6,
  },
  stepsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  stepTime: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stepLine: {
    position: "absolute",
    left: 15,
    top: 32,
    width: 2,
    height: 14,
    backgroundColor: "#E5E7EB",
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    gap: 10,
  },
  detailRow: { flexDirection: "row", gap: 8 },
  detailLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
    width: 100,
  },
  detailValue: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textPrimary,
  },
  updatesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    gap: 10,
  },
  updateRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  updateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  updateMsg: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textPrimary,
  },
  updateTime: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cancelBtn: { padding: 14, alignItems: "center" },
  cancelText: { fontFamily: fonts.body, fontSize: 14, color: colors.error },
  doneBtn: {
    backgroundColor: "#16A34A",
    borderRadius: radius.lg,
    padding: 14,
    alignItems: "center",
  },
  doneBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "white" },
});
