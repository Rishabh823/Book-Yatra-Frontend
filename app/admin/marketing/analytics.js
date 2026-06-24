import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminShell } from "../../../lib/AdminScreen";
import { useColors } from "../../../lib/ThemeContext";
import { fonts, radius } from "../../../lib/theme";
import { marketing as mktApi } from "../../../lib/api";
import { useFocusEffect } from "expo-router";

const PLATFORM_META = {
  telegram: { icon: "paper-plane", color: "#0088CC" },
  whatsapp: { icon: "logo-whatsapp", color: "#25D366" },
  facebook: { icon: "logo-facebook", color: "#1877F2" },
  instagram: { icon: "logo-instagram", color: "#E1306C" },
};

const STATUS_COLORS = {
  published: { bg: "#F0FDF4", text: "#15803D" },
  scheduled: { bg: "#EFF6FF", text: "#1D4ED8" },
  failed: { bg: "#FEF2F2", text: "#DC2626" },
  draft: { bg: "#F9FAFB", text: "#6B7280" },
};

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 16, paddingBottom: 40 },
    overviewGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 16,
    },
    statCard: {
      width: "47.5%",
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    statNum: {
      fontFamily: fonts.heading,
      fontSize: 28,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    statLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
    },
    sectionTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
      marginTop: 24,
      marginBottom: 12,
    },
    platformRow: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    platformTop: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    platformIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    platformName: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
      textTransform: "capitalize",
      flex: 1,
    },
    platformMeta: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
    },
    barTrack: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
    },
    barFill: {
      height: 6,
      borderRadius: 3,
    },
    barLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: "right",
    },
    activityItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    activityTitle: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textPrimary,
      flex: 1,
    },
    platformBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 50,
    },
    platformBadgeTxt: {
      fontFamily: fonts.bodyMedium,
      fontSize: 10,
      textTransform: "capitalize",
    },
    statusBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 50,
    },
    statusTxt: { fontFamily: fonts.bodyMedium, fontSize: 10 },
    emptyBox: {
      alignItems: "center",
      paddingVertical: 48,
    },
    emptyTxt: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 10,
    },
  });
}

const OVERVIEW_CONFIG = [
  { key: "totalPosts", label: "Total Posts", icon: "documents-outline", iconBg: "#EFF6FF", iconColor: "#1D4ED8" },
  { key: "published", label: "Published", icon: "checkmark-circle-outline", iconBg: "#F0FDF4", iconColor: "#15803D" },
  { key: "scheduled", label: "Scheduled", icon: "time-outline", iconBg: "#FFFBEB", iconColor: "#D97706" },
  { key: "failed", label: "Failed", icon: "alert-circle-outline", iconBg: "#FEF2F2", iconColor: "#DC2626" },
];

export default function AnalyticsScreen() {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await mktApi.getAnalytics();
      setData(res?.data || res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const overview = data?.overview || {};
  const platforms = data?.platforms || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <AdminShell title="Marketing Analytics" subtitle="Performance overview">
      <View style={s.container}>
        {loading ? (
          <ActivityIndicator
            color={colors.primary}
            size="large"
            style={{ marginTop: 60 }}
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load(true);
                }}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          >
            {/* Overview 2x2 grid */}
            <Text style={s.sectionTitle}>Overview</Text>
            <View style={s.overviewGrid}>
              {OVERVIEW_CONFIG.map((cfg) => (
                <View key={cfg.key} style={s.statCard}>
                  <View
                    style={[
                      s.statIcon,
                      { backgroundColor: cfg.iconBg },
                    ]}
                  >
                    <Ionicons name={cfg.icon} size={18} color={cfg.iconColor} />
                  </View>
                  <Text style={s.statNum}>
                    {overview[cfg.key] ?? 0}
                  </Text>
                  <Text style={s.statLabel}>{cfg.label}</Text>
                </View>
              ))}
            </View>

            {/* Platform Performance */}
            <Text style={s.sectionTitle}>Platform Performance</Text>
            {platforms.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="bar-chart-outline" size={40} color={colors.border} />
                <Text style={s.emptyTxt}>No platform data yet</Text>
              </View>
            ) : (
              platforms.map((p) => {
                const meta = PLATFORM_META[p.platform] || {
                  icon: "share-social",
                  color: "#6B7280",
                };
                const rate =
                  p.total > 0 ? Math.round((p.success / p.total) * 100) : 0;
                return (
                  <View key={p.platform} style={s.platformRow}>
                    <View style={s.platformTop}>
                      <View
                        style={[
                          s.platformIcon,
                          { backgroundColor: meta.color + "22" },
                        ]}
                      >
                        <Ionicons
                          name={meta.icon}
                          size={18}
                          color={meta.color}
                        />
                      </View>
                      <Text style={s.platformName}>{p.platform}</Text>
                      <Text style={s.platformMeta}>
                        {p.success}/{p.total} posts
                      </Text>
                    </View>
                    <View style={s.barTrack}>
                      <View
                        style={[
                          s.barFill,
                          {
                            width: `${rate}%`,
                            backgroundColor: meta.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={s.barLabel}>{rate}% success</Text>
                  </View>
                );
              })
            )}

            {/* Recent Activity */}
            <Text style={s.sectionTitle}>Recent Activity</Text>
            {recentActivity.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="time-outline" size={40} color={colors.border} />
                <Text style={s.emptyTxt}>No recent activity</Text>
              </View>
            ) : (
              recentActivity.slice(0, 10).map((item, i) => {
                const meta = PLATFORM_META[item.platform] || {
                  icon: "share-social",
                  color: "#6B7280",
                };
                const sc = STATUS_COLORS[item.status] || STATUS_COLORS.draft;
                return (
                  <View key={i} style={s.activityItem}>
                    <View
                      style={[
                        s.platformBadge,
                        { backgroundColor: meta.color + "22" },
                      ]}
                    >
                      <Ionicons name={meta.icon} size={14} color={meta.color} />
                    </View>
                    <Text style={s.activityTitle} numberOfLines={1}>
                      {item.title || item.caption || "Post"}
                    </Text>
                    <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.statusTxt, { color: sc.text }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </AdminShell>
  );
}
