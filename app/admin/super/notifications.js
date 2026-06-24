import { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AdminShell } from "../../../lib/AdminScreen";
import { fonts, radius } from "../../../lib/theme";
import { useColors, useTheme } from "../../../lib/ThemeContext";
import { superAdmin as superApi } from "../../../lib/api";

const CAMPAIGN_TYPES = [
  { key: "general", label: "General", icon: "notifications-outline", color: "#6B7280" },
  { key: "coupon", label: "Coupon", icon: "pricetag-outline", color: "#D97706" },
  { key: "flash_sale", label: "Flash Sale", icon: "flash-outline", color: "#DC2626" },
  { key: "wallet_cashback", label: "Wallet", icon: "wallet-outline", color: "#16A34A" },
  { key: "tour_promotion", label: "Tour Promo", icon: "bus-outline", color: null }, // uses colors.primary
  { key: "emergency", label: "Emergency", icon: "warning-outline", color: "#9333EA" },
];

const STATUS_COLORS = {
  draft: "#6B7280",
  scheduled: "#D97706",
  sending: "#3B82F6",
  sent: "#16A34A",
  failed: "#DC2626",
  active: "#8B5CF6",
};

function SkeletonBox({ width, height, style, colors }) {
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: 8,
          backgroundColor: colors.elevated,
        },
        style,
      ]}
    />
  );
}

function AnalyticsCard({ label, value, loading, colors, s }) {
  return (
    <View style={s.analyticsCard}>
      {loading ? (
        <>
          <SkeletonBox width={40} height={24} colors={colors} style={{ marginBottom: 6 }} />
          <SkeletonBox width={70} height={11} colors={colors} />
        </>
      ) : (
        <>
          <Text style={s.analyticsValue}>{value ?? "—"}</Text>
          <Text style={s.analyticsLabel}>{label}</Text>
        </>
      )}
    </View>
  );
}

export default function SuperNotifications() {
  const colors = useColors();
  const { isDark } = useTheme();
  const router = useRouter();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [analyticsRes, campaignsRes] = await Promise.allSettled([
        superApi.getCampaignAnalytics(),
        superApi.getCampaigns(),
      ]);

      if (analyticsRes.status === "fulfilled") {
        setAnalytics(analyticsRes.value);
      }
      setAnalyticsLoading(false);

      if (campaignsRes.status === "fulfilled") {
        const list = Array.isArray(campaignsRes.value)
          ? campaignsRes.value
          : campaignsRes.value?.campaigns || campaignsRes.value?.data || [];
        setCampaigns(list.slice(0, 5));
      }
      setCampaignsLoading(false);
    } catch (e) {
      setError(e.message || "Failed to load data");
      setAnalyticsLoading(false);
      setCampaignsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setAnalyticsLoading(true);
    setCampaignsLoading(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const getTypeColor = (key) => {
    const t = CAMPAIGN_TYPES.find((c) => c.key === key);
    if (!t) return "#6B7280";
    return t.color || colors.primary;
  };

  const getTypeLabel = (key) => {
    const t = CAMPAIGN_TYPES.find((c) => c.key === key);
    return t ? t.label : key || "General";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <AdminShell title="Marketing Hub" subtitle="Campaigns & Notifications">
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Analytics Overview ───────────────────── */}
        <SectionLabel icon="bar-chart-outline" title="Overview" colors={colors} s={s} />

        <View style={s.analyticsGrid}>
          <AnalyticsCard
            label="Total Campaigns"
            value={analytics?.totalCampaigns}
            loading={analyticsLoading}
            colors={colors}
            s={s}
          />
          <AnalyticsCard
            label="Sent Today"
            value={analytics?.sentToday}
            loading={analyticsLoading}
            colors={colors}
            s={s}
          />
          <AnalyticsCard
            label="Scheduled"
            value={analytics?.scheduled}
            loading={analyticsLoading}
            colors={colors}
            s={s}
          />
          <AnalyticsCard
            label="Total Opened"
            value={analytics?.totalOpened}
            loading={analyticsLoading}
            colors={colors}
            s={s}
          />
        </View>

        {/* ── Quick Actions ────────────────────────── */}
        <SectionLabel icon="flash-outline" title="Quick Actions" colors={colors} s={s} />

        <View style={s.quickActionsRow}>
          <TouchableOpacity
            style={[s.quickActionBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/admin/super/campaign/create")}
            activeOpacity={0.85}
          >
            <Ionicons name="megaphone-outline" size={20} color="#fff" />
            <Text style={s.quickActionTxt}>Create Campaign</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.quickActionBtn, s.quickActionBtnSecondary]}
            onPress={() => router.push("/admin/super/campaigns")}
            activeOpacity={0.85}
          >
            <Ionicons name="list-outline" size={20} color={colors.textPrimary} />
            <Text style={[s.quickActionTxt, { color: colors.textPrimary }]}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* ── Campaign Type Quick Launch ───────────── */}
        <SectionLabel icon="apps-outline" title="Campaign Type" colors={colors} s={s} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.typeChipsRow}
        >
          {CAMPAIGN_TYPES.map((type) => {
            const chipColor = type.color || colors.primary;
            return (
              <TouchableOpacity
                key={type.key}
                style={[s.typeChip, { borderColor: chipColor + "40", backgroundColor: chipColor + "15" }]}
                onPress={() =>
                  router.push("/admin/super/campaign/create?type=" + type.key)
                }
                activeOpacity={0.8}
              >
                <Ionicons name={type.icon} size={16} color={chipColor} />
                <Text style={[s.typeChipLabel, { color: chipColor }]}>{type.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Recent Campaigns ─────────────────────── */}
        <SectionLabel icon="time-outline" title="Recent Campaigns" colors={colors} s={s} />

        {campaignsLoading ? (
          <ActivityIndicator
            color={colors.primary}
            size="large"
            style={{ marginTop: 24 }}
          />
        ) : error && campaigns.length === 0 ? (
          <View style={s.errorCard}>
            <Ionicons name="alert-circle-outline" size={28} color="#DC2626" />
            <Text style={s.errorTxt}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={loadData} activeOpacity={0.8}>
              <Text style={[s.retryTxt, { color: colors.primary }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : campaigns.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons
              name="megaphone-outline"
              size={36}
              color={colors.textSecondary}
            />
            <Text style={s.emptyTitle}>No campaigns yet</Text>
            <Text style={s.emptySubtitle}>
              Create your first campaign to get started
            </Text>
            <TouchableOpacity
              style={[s.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/admin/super/campaign/create")}
              activeOpacity={0.85}
            >
              <Text style={s.emptyBtnTxt}>Create Campaign</Text>
            </TouchableOpacity>
          </View>
        ) : (
          campaigns.map((item) => {
            const typeColor = getTypeColor(item.type);
            const statusColor = STATUS_COLORS[item.status] || "#6B7280";
            return (
              <TouchableOpacity
                key={item._id}
                style={s.campaignCard}
                onPress={() => router.push("/admin/super/campaign/" + item._id)}
                activeOpacity={0.8}
              >
                <View style={s.campaignTop}>
                  <Text style={s.campaignTitle} numberOfLines={1}>
                    {item.title || item.name || "Untitled Campaign"}
                  </Text>
                  <View style={[s.badge, { backgroundColor: statusColor + "20" }]}>
                    <Text style={[s.badgeTxt, { color: statusColor }]}>
                      {item.status
                        ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
                        : "Draft"}
                    </Text>
                  </View>
                </View>

                <View style={s.campaignMeta}>
                  <View style={[s.typeBadge, { backgroundColor: typeColor + "18", borderColor: typeColor + "30" }]}>
                    <Text style={[s.typeBadgeTxt, { color: typeColor }]}>
                      {getTypeLabel(item.type)}
                    </Text>
                  </View>

                  <View style={s.campaignStats}>
                    <Ionicons name="send-outline" size={12} color={colors.textSecondary} />
                    <Text style={s.campaignStatTxt}>
                      {item.sentCount ?? item.sent ?? 0} sent
                    </Text>
                    {item.createdAt && (
                      <>
                        <Text style={s.dot}>·</Text>
                        <Text style={s.campaignStatTxt}>
                          {formatDate(item.createdAt)}
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textSecondary}
                  style={s.campaignChevron}
                />
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </AdminShell>
  );
}

function SectionLabel({ icon, title, colors, s }) {
  return (
    <View style={s.sectionRow}>
      <Ionicons name={icon} size={13} color={colors.textSecondary} />
      <Text style={s.sectionLabel}>{title}</Text>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

    sectionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 20,
      marginBottom: 10,
    },
    sectionLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 10,
      color: colors.textSecondary,
      letterSpacing: 2,
      textTransform: "uppercase",
    },

    // Analytics
    analyticsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    analyticsCard: {
      flex: 1,
      minWidth: "45%",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: 14,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 70,
    },
    analyticsValue: {
      fontFamily: fonts.bodyBold,
      fontSize: 24,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    analyticsLabel: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: "center",
    },

    // Quick Actions
    quickActionsRow: {
      flexDirection: "row",
      gap: 10,
    },
    quickActionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 52,
      borderRadius: 14,
    },
    quickActionBtnSecondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    quickActionTxt: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: "#fff",
    },

    // Type chips
    typeChipsRow: {
      paddingRight: 16,
      gap: 8,
      flexDirection: "row",
    },
    typeChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: 1,
    },
    typeChipLabel: {
      fontFamily: fonts.bodyMedium || fonts.bodyBold,
      fontSize: 13,
    },

    // Campaign cards
    campaignCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: 14,
      marginBottom: 10,
      position: "relative",
    },
    campaignTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
      paddingRight: 20,
    },
    campaignTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
      flex: 1,
      marginRight: 8,
    },
    badge: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeTxt: {
      fontFamily: fonts.bodyBold,
      fontSize: 11,
    },
    campaignMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    typeBadge: {
      borderRadius: 6,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    typeBadgeTxt: {
      fontFamily: fonts.body,
      fontSize: 11,
    },
    campaignStats: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    campaignStatTxt: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textSecondary,
    },
    dot: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textSecondary,
    },
    campaignChevron: {
      position: "absolute",
      right: 14,
      top: "50%",
    },

    // Empty / Error
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: 32,
      alignItems: "center",
      gap: 8,
    },
    emptyTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: colors.textPrimary,
      marginTop: 4,
    },
    emptySubtitle: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
    },
    emptyBtn: {
      marginTop: 12,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 999,
    },
    emptyBtnTxt: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: "#fff",
    },
    errorCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: 24,
      alignItems: "center",
      gap: 8,
    },
    errorTxt: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
    },
    retryBtn: {
      marginTop: 4,
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    retryTxt: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
    },
  });
