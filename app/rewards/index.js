import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  TextInput,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { fonts } from "../../lib/theme";
import { useColors } from "../../lib/ThemeContext";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";

const TIERS = {
  bronze: {
    icon: "🥉",
    color: "#CD7F32",
    bg: "#FEF3C7",
    next: "silver",
    threshold: 1000,
  },
  silver: {
    icon: "🥈",
    color: "#9CA3AF",
    bg: "#F3F4F6",
    next: "gold",
    threshold: 5000,
  },
  gold: {
    icon: "🥇",
    color: "#D97706",
    bg: "#FFFBEB",
    next: "platinum",
    threshold: 10000,
  },
  platinum: {
    icon: "💎",
    color: "#6366F1",
    bg: "#EEF2FF",
    next: null,
    threshold: 10000,
  },
};
const TIER_MINS = { bronze: 0, silver: 1000, gold: 5000, platinum: 10000 };

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const { toast, showToast, hideToast } = useToast();
  const [loyalty, setLoyalty] = useState(null);
  const [badges, setBadges] = useState([]);
  const [redeemPoints, setRedeemPoints] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const load = useCallback(async () => {
    try {
      const [lvlRes, badgeRes] = await Promise.all([
        api.get("/gamification/level"),
        api.get("/gamification/badges"),
      ]);
      setLoyalty(lvlRes.data);
      setBadges((badgeRes.data || []).slice(0, 6));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const claimDaily = async () => {
    setClaimingDaily(true);
    try {
      const res = await api.post("/gamification/daily-reward", {});
      showToast("You earned " + res.data.pointsEarned + " points!", "success");
      load();
    } catch (err) {
      showToast("Come back tomorrow for your next reward!", "error");
    }
    setClaimingDaily(false);
  };

  const handleRedeem = async () => {
    const pts = parseInt(redeemPoints);
    if (!pts || pts < 100) {
      showToast("Minimum 100 points to redeem", "error");
      return;
    }
    if (pts > (loyalty?.points || 0)) {
      showToast("Insufficient points", "error");
      return;
    }
    setRedeeming(true);
    try {
      const res = await api.post("/gamification/redeem", { points: pts });
      showToast(
        "Discount of ₹" +
          res.data.discountAmount +
          " available on next booking.",
        "success",
      );
      setRedeemPoints("");
      load();
    } catch {
      showToast("Failed to redeem", "error");
    }
    setRedeeming(false);
  };

  const shareReferral = async () => {
    try {
      const res = await api.get("/gamification/referral");
      await Share.share({
        message:
          "Join Shyam Sawariya Parivar and earn rewards! Use my referral code: " +
          res.data.referralCode +
          " to get 100 bonus points on signup.",
      });
    } catch {}
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#D95D39" />
      </View>
    );

  const tier = loyalty?.tier || "bronze";
  const tierInfo = TIERS[tier];
  const tierMin = TIER_MINS[tier];
  const tierMax = tierInfo.next ? TIER_MINS[tierInfo.next] : TIER_MINS[tier];
  const earned = loyalty?.totalEarned || 0;
  const progress = tierInfo.next
    ? Math.min((earned - tierMin) / (tierMax - tierMin), 1)
    : 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const canClaimDaily =
    !loyalty?.lastDailyReward || new Date(loyalty.lastDailyReward) < today;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Flat header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Rewards & Points</Text>
        <TouchableOpacity
          onPress={() => router.push("/rewards/leaderboard")}
          style={styles.leaderBtn}
        >
          <Ionicons
            name="trophy-outline"
            size={20}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Gray band */}
      {/* <View style={styles.grayBand} /> */}

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#D95D39"
          />
        }
        contentContainerStyle={{
          padding: 16,
          gap: 14,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {/* Tier card */}
        <View style={styles.tierCard}>
          <View style={styles.tierRow}>
            <Text style={styles.tierIcon}>{tierInfo.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tierName}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)} Member
              </Text>
              {tierInfo.next && (
                <Text style={styles.tierProgress}>
                  {loyalty?.nextTierPoints || 0} pts to {tierInfo.next}
                </Text>
              )}
            </View>
            <View style={styles.pointsDisplay}>
              <Text style={styles.pointsValue}>
                {(loyalty?.points || 0).toLocaleString()}
              </Text>
              <Text style={styles.pointsLabel}>points</Text>
            </View>
          </View>
          <View style={styles.progressBg}>
            <View
              style={[styles.progressFill, { width: progress * 100 + "%" }]}
            />
          </View>
          <View style={styles.statsDividerRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>
                {(loyalty?.totalEarned || 0).toLocaleString()}
              </Text>
              <Text style={styles.statLbl}>Earned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statVal}>
                {(loyalty?.totalRedeemed || 0).toLocaleString()}
              </Text>
              <Text style={styles.statLbl}>Redeemed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statVal}>{loyalty?.referralCount || 0}</Text>
              <Text style={styles.statLbl}>Referrals</Text>
            </View>
          </View>
        </View>

        {/* Daily reward */}
        <TouchableOpacity
          style={[styles.dailyCard, !canClaimDaily && styles.dailyCardClaimed]}
          onPress={canClaimDaily ? claimDaily : undefined}
          disabled={!canClaimDaily || claimingDaily}
        >
          <View style={styles.dailyIcon}>
            <Text style={{ fontSize: 28 }}>{canClaimDaily ? "🎁" : "✅"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dailyTitle}>
              {canClaimDaily ? "Claim Daily Reward" : "Daily Reward Claimed"}
            </Text>
            <Text style={styles.dailySub}>
              {canClaimDaily ? "Earn 10 points today!" : "Come back tomorrow!"}
            </Text>
          </View>
          {claimingDaily ? (
            <ActivityIndicator color="#D95D39" />
          ) : (
            canClaimDaily && (
              <View style={styles.claimBtn}>
                <Text style={styles.claimBtnText}>Claim</Text>
              </View>
            )
          )}
        </TouchableOpacity>

        {/* Badges preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              My Badges ({loyalty?.badgeCount || 0})
            </Text>
            <TouchableOpacity onPress={() => router.push("/rewards/badges")}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.badgesRow}>
            {badges.slice(0, 6).map((b) => (
              <View
                key={b.key}
                style={[styles.badgeItem, !b.earned && styles.badgeItemLocked]}
              >
                <Text style={{ fontSize: 28, opacity: b.earned ? 1 : 0.3 }}>
                  {b.icon}
                </Text>
                <Text
                  style={[
                    styles.badgeName,
                    !b.earned && { color: colors.textDisabled },
                  ]}
                  numberOfLines={1}
                >
                  {b.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Redeem */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Redeem Points</Text>
          <Text style={styles.redeemInfo}>
            1 point = ₹0.50 discount • Min 100 points
          </Text>
          <View style={styles.redeemRow}>
            <TextInput
              style={styles.redeemInput}
              value={redeemPoints}
              onChangeText={setRedeemPoints}
              placeholder="Points to redeem"
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
            />
            {redeemPoints ? (
              <Text style={styles.redeemValue}>
                = ₹{parseInt(redeemPoints) * 0.5 || 0}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={[
              styles.redeemBtn,
              (!redeemPoints || parseInt(redeemPoints) < 100) &&
                styles.redeemBtnDisabled,
            ]}
            onPress={handleRedeem}
            disabled={
              !redeemPoints || parseInt(redeemPoints) < 100 || redeeming
            }
          >
            {redeeming ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.redeemBtnText}>Redeem Now</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Referral */}
        <View style={styles.referralCard}>
          <View style={styles.referralIcon}>
            <Ionicons name="gift-outline" size={24} color="#D95D39" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.referralTitle}>Refer & Earn</Text>
            <Text style={styles.referralSub}>
              Earn 200 pts for each friend who joins
            </Text>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={shareReferral}>
            <Ionicons name="share-outline" size={16} color="white" />
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg,
    },

    // Header
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
    title: {
      flex: 1,
      fontFamily: "Philosopher_700Bold",
      fontSize: 18,
      color: colors.textPrimary,
      marginLeft: 10,
    },
    leaderBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.elevated,
      alignItems: "center",
      justifyContent: "center",
    },

    // Gray band
    grayBand: { height: 10, backgroundColor: colors.elevated },

    // Tier card
    tierCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    tierRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    tierIcon: { fontSize: 36 },
    tierName: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    tierProgress: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    pointsDisplay: { alignItems: "flex-end" },
    pointsValue: { fontFamily: fonts.heading, fontSize: 28, color: "#D95D39" },
    pointsLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textDisabled,
    },
    progressBg: {
      height: 6,
      backgroundColor: colors.elevated,
      borderRadius: 4,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: "#D95D39",
      borderRadius: 4,
    },
    statsDividerRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
    },
    stat: { alignItems: "center", flex: 1 },
    statDivider: { width: 1, height: 32, backgroundColor: colors.borderSubtle },
    statVal: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    statLbl: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textDisabled,
      marginTop: 2,
    },

    // Daily reward
    dailyCard: {
      backgroundColor: colors.primary + "15",
      borderWidth: 1,
      borderColor: colors.primary + "40",
      borderRadius: 12,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    dailyCardClaimed: {
      backgroundColor: colors.surface,
      borderColor: colors.borderSubtle,
      opacity: 0.7,
    },
    dailyIcon: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    dailyTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    dailySub: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    claimBtn: {
      backgroundColor: "#D95D39",
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    claimBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },

    // Section cards
    section: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 12,
      padding: 16,
      gap: 12,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    seeAll: { fontFamily: fonts.bodyMedium, fontSize: 13, color: "#D95D39" },

    // Badges
    badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    badgeItem: {
      width: "30%",
      alignItems: "center",
      gap: 4,
      padding: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
    },
    badgeItemLocked: { opacity: 0.5 },
    badgeName: {
      fontFamily: fonts.bodyMedium,
      fontSize: 10,
      color: colors.textPrimary,
      textAlign: "center",
    },

    // Redeem
    redeemInfo: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
    },
    redeemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    redeemInput: {
      flex: 1,
      backgroundColor: colors.elevated,
      borderRadius: 12,
      height: 52,
      paddingHorizontal: 14,
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.textPrimary,
    },
    redeemValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#16A34A" },
    redeemBtn: {
      backgroundColor: "#D95D39",
      borderRadius: 12,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    redeemBtnDisabled: { backgroundColor: colors.borderSubtle },
    redeemBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "white" },

    // Referral
    referralCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 12,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    referralIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.primary + "18",
      alignItems: "center",
      justifyContent: "center",
    },
    referralTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    referralSub: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    shareBtn: {
      backgroundColor: "#D95D39",
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    shareBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
  });
