import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AdminShell } from "../../../lib/AdminScreen";
import { useColors } from "../../../lib/ThemeContext";
import { fonts, radius } from "../../../lib/theme";
import { marketing as mktApi } from "../../../lib/api";

const ACTION_CARDS = [
  {
    label: "Social Accounts",
    icon: "logo-instagram",
    color: "#E1306C",
    route: "/admin/marketing/social-accounts",
  },
  {
    label: "AI Ad Generator",
    icon: "sparkles",
    color: "#8B5CF6",
    route: "/admin/marketing/ai-generator",
  },
  {
    label: "AI Poster",
    icon: "image",
    color: "#0891B2",
    route: "/admin/marketing/ai-generator?tab=image",
  },
  {
    label: "Campaign Manager",
    icon: "megaphone",
    color: "#D95D39",
    route: "/admin/marketing/campaigns",
  },
  {
    label: "Scheduled Posts",
    icon: "time",
    color: "#D97706",
    route: "/admin/marketing/scheduler",
  },
  {
    label: "Analytics",
    icon: "bar-chart",
    color: "#16A34A",
    route: "/admin/marketing/analytics",
  },
  {
    label: "Auto Rules",
    icon: "flash",
    color: "#DC2626",
    route: "/admin/marketing/auto-rules",
  },
  {
    label: "Templates",
    icon: "document-text",
    color: "#7C3AED",
    route: "/admin/marketing/templates",
  },
  {
    label: "Help",
    icon: "help-circle",
    color: "#6B7280",
    route: null,
  },
];

const PLATFORM_META = {
  instagram: { color: "#E1306C", icon: "logo-instagram" },
  facebook: { color: "#1877F2", icon: "logo-facebook" },
  whatsapp: { color: "#25D366", icon: "logo-whatsapp" },
  telegram: { color: "#0088CC", icon: "paper-plane-outline" },
  twitter: { color: "#1DA1F2", icon: "logo-twitter" },
  linkedin: { color: "#0A66C2", icon: "logo-linkedin" },
  google_business: { color: "#4285F4", icon: "logo-google" },
  youtube: { color: "#FF0000", icon: "logo-youtube" },
};

function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function MarketingHub() {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  const [analytics, setAnalytics] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [analyticsData, accountsData, postsData] = await Promise.allSettled(
        [mktApi.getAnalytics(), mktApi.getSocialAccounts(), mktApi.getPosts()],
      );
      if (analyticsData.status === "fulfilled")
        setAnalytics(analyticsData.value);
      if (accountsData.status === "fulfilled") {
        const av = accountsData.value;
        setAccounts(Array.isArray(av) ? av : av?.data || av?.accounts || []);
      }
      if (postsData.status === "fulfilled") {
        const pv = postsData.value;
        const allPosts = Array.isArray(pv) ? pv : pv?.data || pv?.posts || [];
        setPosts(allPosts.slice(0, 3));
      }
    } catch (e) {
      // silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll();
  }, [fetchAll]);

  const handleActionPress = (card) => {
    if (!card.route) {
      Alert.alert(
        "Marketing Hub Setup",
        'Welcome to the Marketing Hub!\n\n1. Connect your social media accounts\n2. Use AI to generate posts and ads\n3. Schedule content for automatic publishing\n4. Track performance in Analytics\n\nStart by tapping "Social Accounts" to connect your platforms.',
      );
      return;
    }
    router.push(card.route);
  };

  const connectedAccounts = accounts.filter((a) => a.connected);

  const statsData = [
    {
      label: "Total Posts",
      value: analytics?.totalPosts ?? "--",
    },
    {
      label: "Published",
      value: analytics?.published ?? "--",
    },
    {
      label: "Scheduled",
      value: analytics?.scheduled ?? "--",
    },
  ];

  return (
    <AdminShell title="Marketing Hub" subtitle="Grow your business">
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
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
        {loading ? (
          <View style={s.loaderWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Quick Stats Row */}
            <Text style={s.sectionTitle}>Overview</Text>
            <View style={s.statsRow}>
              {statsData.map((stat) => (
                <View key={stat.label} style={s.statCard}>
                  <Text style={s.statValue}>{stat.value}</Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Connected Platforms */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Connected Platforms</Text>
              <TouchableOpacity
                onPress={() => router.push("/admin/marketing/social-accounts")}
              >
                <Text style={s.seeAll}>Manage</Text>
              </TouchableOpacity>
            </View>
            <View style={s.platformsRow}>
              {connectedAccounts.map((acct) => {
                const meta = PLATFORM_META[acct.platform] || {
                  color: colors.primary,
                  icon: "globe-outline",
                };
                return (
                  <View
                    key={acct.id || acct.platform}
                    style={[
                      s.platformDot,
                      {
                        backgroundColor: meta.color + "22",
                        borderColor: meta.color,
                      },
                    ]}
                  >
                    <Ionicons name={meta.icon} size={20} color={meta.color} />
                  </View>
                );
              })}
              {connectedAccounts.length < 3 && (
                <TouchableOpacity
                  style={s.connectDot}
                  onPress={() =>
                    router.push("/admin/marketing/social-accounts")
                  }
                >
                  <Ionicons name="add" size={22} color={colors.primary} />
                </TouchableOpacity>
              )}
              {connectedAccounts.length === 0 && (
                <Text style={s.noAccountsHint}>No platforms connected yet</Text>
              )}
            </View>

            {/* Action Grid */}
            <Text style={s.sectionTitle}>Quick Actions</Text>
            <View style={s.actionGrid}>
              {ACTION_CARDS.map((card) => (
                <TouchableOpacity
                  key={card.label}
                  style={s.actionCard}
                  onPress={() => handleActionPress(card)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      s.actionIconWrap,
                      { backgroundColor: card.color + "22" },
                    ]}
                  >
                    <Ionicons name={card.icon} size={24} color={card.color} />
                  </View>
                  <Text style={s.actionLabel} numberOfLines={2}>
                    {card.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recent Posts */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Recent Posts</Text>
              <TouchableOpacity
                onPress={() => router.push("/admin/marketing/scheduler")}
              >
                <Text style={s.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {posts.length === 0 ? (
              <View style={s.emptyCard}>
                <Ionicons
                  name="newspaper-outline"
                  size={32}
                  color={colors.textSecondary}
                />
                <Text style={s.emptyText}>No posts yet</Text>
                <Text style={s.emptyHint}>
                  Create your first post using AI Ad Generator
                </Text>
              </View>
            ) : (
              posts.map((post, idx) => {
                const platforms = Array.isArray(post.platforms)
                  ? post.platforms
                  : [post.platform].filter(Boolean);
                return (
                  <View key={post.id || idx} style={s.postCard}>
                    <View style={s.postTop}>
                      <Text style={s.postTitle} numberOfLines={2}>
                        {post.title || post.content || "Untitled Post"}
                      </Text>
                      <View
                        style={[
                          s.statusBadge,
                          {
                            backgroundColor:
                              post.status === "published"
                                ? "#16A34A22"
                                : post.status === "scheduled"
                                  ? "#D9770622"
                                  : "#6B728022",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.statusText,
                            {
                              color:
                                post.status === "published"
                                  ? "#16A34A"
                                  : post.status === "scheduled"
                                    ? "#D97706"
                                    : "#6B7280",
                            },
                          ]}
                        >
                          {post.status || "draft"}
                        </Text>
                      </View>
                    </View>
                    <View style={s.postBottom}>
                      <View style={s.platformBadges}>
                        {platforms.map((p) => {
                          const meta = PLATFORM_META[p] || {
                            color: colors.primary,
                            icon: "globe-outline",
                          };
                          return (
                            <View
                              key={p}
                              style={[
                                s.platformBadge,
                                { backgroundColor: meta.color + "22" },
                              ]}
                            >
                              <Ionicons
                                name={meta.icon}
                                size={12}
                                color={meta.color}
                              />
                              <Text
                                style={[
                                  s.platformBadgeText,
                                  { color: meta.color },
                                ]}
                              >
                                {p}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                      <Text style={s.postTime}>
                        {formatTimeAgo(post.createdAt || post.scheduledAt)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
            <View style={s.bottomSpacer} />
          </>
        )}
      </ScrollView>
    </AdminShell>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    loaderWrap: {
      paddingTop: 80,
      alignItems: "center",
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 20,
      marginBottom: 10,
    },
    sectionTitle: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
      color: colors.textPrimary,
      marginTop: 20,
      marginBottom: 10,
    },
    seeAll: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.primary,
    },
    // Stats
    statsRow: {
      flexDirection: "row",
      gap: 10,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.elevated,
      borderRadius: radius.md,
      paddingVertical: 14,
      paddingHorizontal: 10,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    statValue: {
      fontFamily: fonts.bold,
      fontSize: 22,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    statLabel: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: "center",
    },
    // Platforms
    platformsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      alignItems: "center",
    },
    platformDot: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    connectDot: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary + "11",
    },
    noAccountsHint: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.textSecondary,
      marginLeft: 4,
    },
    // Action Grid
    actionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    actionCard: {
      width: "30.5%",
      backgroundColor: colors.elevated,
      borderRadius: radius.md,
      padding: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    actionIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    actionLabel: {
      fontFamily: fonts.medium,
      fontSize: 11,
      color: colors.textPrimary,
      textAlign: "center",
      lineHeight: 15,
    },
    // Posts
    postCard: {
      backgroundColor: colors.elevated,
      borderRadius: radius.md,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    postTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
      gap: 8,
    },
    postTitle: {
      flex: 1,
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 18,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.sm,
    },
    statusText: {
      fontFamily: fonts.semiBold,
      fontSize: 11,
      textTransform: "capitalize",
    },
    postBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    platformBadges: {
      flexDirection: "row",
      gap: 6,
      flexWrap: "wrap",
    },
    platformBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: radius.sm,
    },
    platformBadgeText: {
      fontFamily: fonts.medium,
      fontSize: 10,
      textTransform: "capitalize",
    },
    postTime: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: colors.textSecondary,
    },
    // Empty
    emptyCard: {
      backgroundColor: colors.elevated,
      borderRadius: radius.md,
      padding: 32,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      gap: 8,
    },
    emptyText: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    emptyHint: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: "center",
    },
    bottomSpacer: {
      height: 32,
    },
  });
}
