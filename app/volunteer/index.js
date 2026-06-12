import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../../lib/api";
import { colors, fonts, radius, shadow } from "../../lib/theme";

const QUICK_ACTIONS = [
  {
    label: "Check In",
    icon: "location",
    color: "#16A34A",
    bg: "#DCFCE7",
    route: "/volunteer/checkin",
  },
  {
    label: "Scan QR",
    icon: "qr-code",
    color: "#7C3AED",
    bg: "#EDE9FE",
    route: "/volunteer/checkin",
  },
  {
    label: "Passengers",
    icon: "people",
    color: "#2563EB",
    bg: "#DBEAFE",
    route: "/volunteer/passengers",
  },
  {
    label: "Report Incident",
    icon: "warning",
    color: "#DC2626",
    bg: "#FEE2E2",
    route: "/volunteer/report-incident",
  },
];

export default function VolunteerDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect to onboarding if first login docs not yet submitted
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
          const userStr = await AsyncStorage.getItem("user");
          if (userStr) {
            const user = JSON.parse(userStr);
            if (user.role === "volunteer" && user.isFirstLogin !== false) {
              router.replace("/volunteer/onboarding");
              return;
            }
          }
        } catch {}
      })();
    }, [])
  );

  const load = useCallback(async () => {
    try {
      const res = await api.get("/volunteer/dashboard");
      setData(res.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "N/A";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={["#1E0A0A", "#5C1615"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Volunteer Hub</Text>
          <Text style={styles.subtitle}>Your dashboard</Text>
        </View>
        <View style={[styles.roleBadge]}>
          <Ionicons name="shield-checkmark" size={14} color="white" />
          <Text style={styles.roleText}>Volunteer</Text>
        </View>
      </LinearGradient>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{
            padding: 16,
            gap: 16,
            paddingBottom: insets.bottom + 20,
          }}
        >
          {data?.todayTour && (
            <View style={[styles.todayCard, shadow.card]}>
              <View style={styles.todayHeader}>
                <Ionicons name="today" size={18} color={colors.primary} />
                <Text style={styles.todayLabel}>Today's Tour</Text>
              </View>
              <Text style={styles.tourName} numberOfLines={1}>
                {data.todayTour.title}
              </Text>
              <Text style={styles.tourMeta}>
                {data.todayTour.source} → {data.todayTour.destination}
              </Text>
              <Text style={styles.tourDate}>
                {fmtDate(data.todayTour.startDate)}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              {QUICK_ACTIONS.map((a) => (
                <TouchableOpacity
                  key={a.label}
                  style={[
                    styles.actionCard,
                    { backgroundColor: a.bg },
                    shadow.soft,
                  ]}
                  onPress={() =>
                    router.push(
                      a.route +
                        (data?.todayTour
                          ? "?tourId=" + data.todayTour._id
                          : ""),
                    )
                  }
                >
                  <View
                    style={[styles.actionIcon, { backgroundColor: a.color }]}
                  >
                    <Ionicons name={a.icon} size={22} color="white" />
                  </View>
                  <Text style={[styles.actionLabel, { color: a.color }]}>
                    {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {data?.assignedTours?.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>
                Assigned Tours ({data.assignedTours.length})
              </Text>
              {data.assignedTours.map((t) => (
                <View key={t._id} style={[styles.tourCard, shadow.soft]}>
                  <Text style={styles.tourCardName} numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text style={styles.tourCardMeta}>
                    {t.source} → {t.destination} • {fmtDate(t.startDate)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  title: { fontFamily: "Philosopher_700Bold", fontSize: 20, color: "white" },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  roleText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: "white" },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  todayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    gap: 6,
  },
  todayHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  todayLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  tourName: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  tourMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  tourDate: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.primary,
  },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionCard: {
    width: "46%",
    borderRadius: radius.xl,
    padding: 16,
    alignItems: "center",
    gap: 10,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontFamily: fonts.bodyBold, fontSize: 13 },
  tourCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 8,
    gap: 4,
  },
  tourCardName: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  tourCardMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
