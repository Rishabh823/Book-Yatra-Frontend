import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { colors, fonts } from "../../../lib/theme";
import { settlementApi } from "../../../lib/api";

const fmtCurrency = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function MetricCard({ label, value, icon, color, sub }) {
  return (
    <View style={s.metricCard}>
      <View style={[s.metricIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={s.metricValue}>{fmtCurrency(value)}</Text>
      <Text style={s.metricLabel}>{label}</Text>
      {sub !== undefined && <Text style={s.metricSub}>{sub}</Text>}
    </View>
  );
}

function OperatorRow({ item }) {
  return (
    <View style={s.opRow}>
      <View style={s.opAvatar}>
        <Text style={s.opAvatarTxt}>{(item.operatorName || "O").charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.opName} numberOfLines={1}>{item.operatorName || "Operator"}</Text>
        <Text style={s.opSub}>{item.settlementsCount || 0} settlements · {item.commissionRate || 10}% comm.</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={s.opEarnings}>{fmtCurrency(item.totalEarnings)}</Text>
        <Text style={s.opComm}>+{fmtCurrency(item.totalCommission)} platform</Text>
      </View>
    </View>
  );
}

export default function SuperFinanceScreen() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await settlementApi.dashboard();
      setData(res?.data || res);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const stats = data?.stats || {};
  const operators = data?.operators || [];
  const recentSettlements = data?.recentSettlements || [];
  const pendingCount = data?.pendingWithdrawals || 0;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={s.title}>Finance Dashboard</Text>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.push("/admin/super/withdrawals")}>
          <Ionicons name="notifications" size={18} color={pendingCount > 0 ? colors.primary : colors.textSecondary} />
          {pendingCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{pendingCount > 9 ? "9+" : pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Revenue hero */}
        <View style={s.hero}>
          <Text style={s.heroLabel}>Total Platform Revenue</Text>
          <Text style={s.heroAmt}>{fmtCurrency(stats.totalRevenue)}</Text>
          <View style={s.heroRow}>
            <View style={s.heroStat}>
              <Text style={s.heroStatVal}>{fmtCurrency(stats.totalCommission)}</Text>
              <Text style={s.heroStatLabel}>Commission Earned</Text>
            </View>
            <View style={s.heroDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatVal}>{stats.totalSettlements || 0}</Text>
              <Text style={s.heroStatLabel}>Settlements</Text>
            </View>
            <View style={s.heroDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatVal}>{stats.totalBookings || 0}</Text>
              <Text style={s.heroStatLabel}>Paid Bookings</Text>
            </View>
          </View>
        </View>

        {/* Metrics grid */}
        <View style={s.metricsGrid}>
          <MetricCard
            label="User Wallet Balances"
            value={stats.totalUserWalletBalance}
            icon="wallet"
            color="#7C3AED"
            sub={`${stats.totalUsers || 0} users`}
          />
          <MetricCard
            label="Operator Wallet Balances"
            value={stats.totalOperatorWalletBalance}
            icon="business"
            color="#2563EB"
            sub={`${stats.totalOperators || 0} operators`}
          />
          <MetricCard
            label="Pending Withdrawals"
            value={stats.totalPendingWithdrawals}
            icon="time"
            color="#D97706"
            sub={`${pendingCount} requests`}
          />
          <MetricCard
            label="Total Withdrawn"
            value={stats.totalWithdrawn}
            icon="arrow-up-circle"
            color="#16A34A"
          />
        </View>

        {/* Withdrawal queue shortcut */}
        {pendingCount > 0 && (
          <TouchableOpacity style={s.pendingBanner} onPress={() => router.push("/admin/super/withdrawals")}>
            <View style={[s.pendingIcon, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="time" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.pendingTitle}>{pendingCount} withdrawal{pendingCount > 1 ? "s" : ""} pending approval</Text>
              <Text style={s.pendingSub}>Review and approve operator withdrawal requests</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Top operators */}
        {operators.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Top Operators by Earnings</Text>
            <View style={s.card}>
              {operators.slice(0, 8).map((op) => (
                <OperatorRow key={op._id} item={op} />
              ))}
            </View>
          </>
        )}

        {/* Recent settlements */}
        {recentSettlements.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Recent Settlements</Text>
            <View style={s.card}>
              {recentSettlements.map((s2) => (
                <View key={s2._id} style={s.settlRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.settlTour} numberOfLines={1}>{s2.tourId?.title || "Tour"}</Text>
                    <Text style={s.settlOp}>{s2.operatorId?.name || "Operator"} · {fmtDate(s2.createdAt)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.settlAmt}>{fmtCurrency(s2.bookingAmount)}</Text>
                    <Text style={s.settlComm}>+{fmtCurrency(s2.commissionAmount)} comm.</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.secondary },
  badge: { position: "absolute", top: 4, right: 4, backgroundColor: colors.error, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  badgeTxt: { color: "#fff", fontSize: 9, fontFamily: fonts.bodyBold },
  hero: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  heroLabel: {
    color: "#9CA3AF",
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  heroAmt: { color: colors.textPrimary, fontFamily: fonts.heading, fontSize: 36 },
  heroRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  heroStat: { flex: 1, alignItems: "center", gap: 2 },
  heroStatVal: { color: colors.textPrimary, fontFamily: fonts.bodyBold, fontSize: 14 },
  heroStatLabel: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 10 },
  heroDivider: { width: 1, height: 30, backgroundColor: "#E5E7EB" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: {
    flex: 1,
    minWidth: "44%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  metricIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  metricValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary },
  metricLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  metricSub: { fontFamily: fonts.body, fontSize: 10, color: colors.textDisabled },
  pendingBanner: { backgroundColor: "#FFFBEB", borderRadius: 20, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#FDE68A" },
  pendingIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  pendingTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#92400E" },
  pendingSub: { fontFamily: fonts.body, fontSize: 12, color: "#78350F", marginTop: 2 },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  opRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  opAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  opAvatarTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primary },
  opName: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  opSub: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  opEarnings: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  opComm: { fontFamily: fonts.body, fontSize: 10, color: "#16A34A" },
  settlRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  settlTour: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  settlOp: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  settlAmt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  settlComm: { fontFamily: fonts.body, fontSize: 10, color: "#16A34A" },
});
