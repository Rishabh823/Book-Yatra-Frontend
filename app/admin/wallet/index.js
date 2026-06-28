import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { colors, fonts } from "../../../lib/theme";
import { operatorWalletApi } from "../../../lib/api";
import { useColors } from "../../../lib/ThemeContext";

const fmtCurrency = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

function StatCard({ label, value, icon, color, sub }) {
  const themeColors = useColors();
  const s = useMemo(() => makeStyles(themeColors), [themeColors]);
  return (
    <View style={s.statCard}>
      <View style={[s.statIconWrap, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={s.statValue}>{fmtCurrency(value)}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {sub && <Text style={s.statSub}>{sub}</Text>}
    </View>
  );
}

function MonthBar({ item, maxRevenue }) {
  const themeColors = useColors();
  const s = useMemo(() => makeStyles(themeColors), [themeColors]);
  const ratio = maxRevenue > 0 ? item.earnings / maxRevenue : 0;
  return (
    <View style={s.monthBarWrap}>
      <View style={s.monthBarTrack}>
        <View style={[s.monthBarFill, { flex: ratio }]} />
        <View style={{ flex: 1 - ratio }} />
      </View>
      <Text style={s.monthLabel}>{item.month?.slice(5)}</Text>
      <Text style={s.monthAmt}>{fmtCurrency(item.earnings)}</Text>
    </View>
  );
}

export default function OperatorWalletScreen() {
  const router = useRouter();
  const themeColors = useColors();
  const s = useMemo(() => makeStyles(themeColors), [themeColors]);
  const [wallet, setWallet] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [wRes, aRes, sRes] = await Promise.all([
        operatorWalletApi.get(),
        operatorWalletApi.analytics(6),
        operatorWalletApi.settlements(1),
      ]);
      setWallet(wRes?.data || wRes);
      setAnalytics(aRes?.data || []);
      setSettlements((sRes?.data || []).slice(0, 5));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );

  const maxRevenue = Math.max(...analytics.map((a) => a.earnings), 1);
  const commRate = wallet?.commissionRate || 10;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons
            name="arrow-back"
            size={20}
            color={themeColors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={s.title}>Earnings Wallet</Text>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={() => router.push("/admin/wallet/withdraw")}
        >
          <Ionicons
            name="arrow-up-circle"
            size={20}
            color={themeColors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
          gap: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={themeColors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Balance hero */}
        <View style={s.hero}>
          <Text style={s.heroLabel}>Available Balance</Text>
          <Text style={s.heroBalance}>{fmtCurrency(wallet?.balance)}</Text>
          <View style={s.heroPendingRow}>
            <Ionicons name="time" size={14} color={themeColors.textSecondary} />
            <Text style={s.heroPending}>
              Pending Settlement: {fmtCurrency(wallet?.pendingBalance)}
            </Text>
          </View>
          <View style={s.heroActions}>
            <TouchableOpacity
              style={s.heroBtn}
              onPress={() => router.push("/admin/wallet/withdraw")}
            >
              <Ionicons
                name="arrow-up-circle"
                size={16}
                color={themeColors.primary}
              />
              <Text style={s.heroBtnTxt}>Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.heroBtn, s.heroBtnOutline]}
              onPress={() => router.push("/admin/wallet/history")}
            >
              <Ionicons
                name="receipt"
                size={16}
                color={themeColors.textPrimary}
              />
              <Text style={[s.heroBtnTxt, { color: themeColors.textPrimary }]}>
                History
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsGrid}>
          <StatCard
            label="Total Earnings"
            value={wallet?.totalEarnings}
            icon="trending-up"
            color="#16A34A"
          />
          <StatCard
            label="Total Withdrawn"
            value={wallet?.totalWithdrawn}
            icon="arrow-up-circle"
            color="#2563EB"
          />
          <StatCard
            label="Booking Revenue"
            value={wallet?.totalBookingRevenue}
            icon="cart"
            color="#D97706"
            sub={`After ${commRate}% commission`}
          />
          <StatCard
            label="Commission Paid"
            value={wallet?.totalCommissionPaid}
            icon="business"
            color="#DC2626"
          />
        </View>

        {/* Monthly chart */}
        {analytics.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Monthly Earnings</Text>
            <View style={s.chartCard}>
              {analytics.map((item) => (
                <MonthBar
                  key={item.month}
                  item={item}
                  maxRevenue={maxRevenue}
                />
              ))}
            </View>
          </>
        )}

        {/* Recent settlements */}
        {settlements.length > 0 && (
          <>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Recent Settlements</Text>
              <TouchableOpacity
                onPress={() => router.push("/admin/wallet/history")}
              >
                <Text style={s.sectionLink}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={s.card}>
              {settlements.map((s2) => (
                <View key={s2._id} style={s.settlRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.settlTour} numberOfLines={1}>
                      {s2.tourId?.title || "Tour"}
                    </Text>
                    <Text style={s.settlDate}>
                      {fmtDate(s2.createdAt)} · {s2.bookings || 1} booking
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.settlAmt}>
                      {fmtCurrency(s2.operatorAmount)}
                    </Text>
                    <Text style={s.settlComm}>
                      -{fmtCurrency(s2.commissionAmount)} comm.
                    </Text>
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

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    head: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 20,
      color: colors.textPrimary,
    },
    hero: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 24,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    heroLabel: {
      color: colors.textDisabled,
      fontFamily: fonts.bodyBold,
      fontSize: 10,
      letterSpacing: 1.5,
      textTransform: "uppercase",
    },
    heroBalance: {
      color: colors.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 38,
    },
    heroPendingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    heroPending: {
      color: colors.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
    },
    heroActions: { flexDirection: "row", gap: 10, marginTop: 8 },
    heroBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.elevated,
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    heroBtnOutline: {
      backgroundColor: colors.surface,
    },
    heroBtnTxt: {
      fontFamily: fonts.bodyBold,
      fontSize: 13,
      color: colors.primary,
    },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    statCard: {
      flex: 1,
      minWidth: "44%",
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 14,
      gap: 5,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    statIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    statValue: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: colors.textPrimary,
    },
    statLabel: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textSecondary,
    },
    statSub: {
      fontFamily: fonts.body,
      fontSize: 10,
      color: colors.textDisabled,
    },
    sectionHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    sectionLink: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.primary,
    },
    chartCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    monthBarWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
    monthBarTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.bg,
      flexDirection: "row",
      overflow: "hidden",
    },
    monthBarFill: { backgroundColor: colors.primary, borderRadius: 4 },
    monthLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      color: colors.textSecondary,
      width: 28,
    },
    monthAmt: {
      fontFamily: fonts.bodyBold,
      fontSize: 11,
      color: colors.textPrimary,
      width: 64,
      textAlign: "right",
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    settlRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      gap: 12,
    },
    settlTour: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textPrimary,
    },
    settlDate: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    settlAmt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#16A34A" },
    settlComm: {
      fontFamily: fonts.body,
      fontSize: 10,
      color: colors.textDisabled,
    },
  });
