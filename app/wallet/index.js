import { useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { fonts, radius, shadow } from "../../lib/theme";
import { useColors } from "../../lib/ThemeContext";
import { walletApi } from "../../lib/api";

const fmtCurrency = (n) =>
  `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const CATEGORY_META = {
  topup:      { icon: "add-circle",         color: "#16A34A", label: "Recharge" },
  payment:    { icon: "cart",               color: "#DC2626", label: "Payment" },
  refund:     { icon: "return-down-back",   color: "#2563EB", label: "Refund" },
  cashback:   { icon: "gift",               color: "#D97706", label: "Cashback" },
  referral:   { icon: "people",             color: "#7C3AED", label: "Referral" },
  reversal:   { icon: "refresh",            color: "#6B7280", label: "Reversal" },
  adjustment: { icon: "build",              color: "#6B7280", label: "Adjustment" },
};

const STAT_ITEMS = [
  { key: "totalAdded",    label: "Total Added",  icon: "arrow-down-circle",  color: "#16A34A" },
  { key: "totalSpent",    label: "Total Spent",  icon: "cart",               color: "#DC2626" },
  { key: "totalRefunds",  label: "Refunds",      icon: "return-down-back",   color: "#2563EB" },
  { key: "cashbackEarned",label: "Cashback",     icon: "gift",               color: "#D97706" },
];

function TxnRow({ txn, colors, s }) {
  const meta = CATEGORY_META[txn.category] || CATEGORY_META.adjustment;
  const isCredit = txn.type === "credit";
  return (
    <View style={s.txnRow}>
      <View style={[s.txnIcon, { backgroundColor: meta.color + "20" }]}>
        <Ionicons name={meta.icon} size={18} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.txnDesc} numberOfLines={1}>{txn.description}</Text>
        <Text style={s.txnDate}>{fmtDate(txn.createdAt)}</Text>
      </View>
      <Text style={[s.txnAmt, { color: isCredit ? "#22C55E" : "#F87171" }]}>
        {isCredit ? "+" : "−"}{fmtCurrency(txn.amount)}
      </Text>
    </View>
  );
}

export default function WalletScreen() {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [wRes, txRes] = await Promise.all([
        walletApi.get(),
        walletApi.transactions(1),
      ]);
      setWallet(wRes?.data || wRes);
      setTransactions((txRes?.data || []).slice(0, 10));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Header */}
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>My Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Balance card */}
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.balanceCard}
        >
          <Text style={s.balanceLabel}>Available Balance</Text>
          <Text style={s.balanceAmt}>{fmtCurrency(wallet?.balance)}</Text>
          <TouchableOpacity
            style={s.addMoneyBtn}
            onPress={() => router.push("/wallet/add-money")}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[s.addMoneyTxt, { color: colors.primary }]}>Add Money</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats grid */}
        <View style={s.statsGrid}>
          {STAT_ITEMS.map(({ key, label, icon, color }) => (
            <View key={key} style={s.statCard}>
              <View style={[s.statIcon, { backgroundColor: color + "20" }]}>
                <Ionicons name={icon} size={18} color={color} />
              </View>
              <Text style={s.statValue}>{fmtCurrency(wallet?.[key])}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <View style={s.actionsRow}>
          <TouchableOpacity
            style={s.actionCard}
            onPress={() => router.push("/wallet/add-money")}
          >
            <View style={[s.actionIcon, { backgroundColor: colors.primary + "20" }]}>
              <Ionicons name="add-circle" size={26} color={colors.primary} />
            </View>
            <Text style={s.actionLabel}>Add Money</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.actionCard}
            onPress={() => router.push("/wallet/transactions")}
          >
            <View style={[s.actionIcon, { backgroundColor: "#2563EB20" }]}>
              <Ionicons name="receipt" size={26} color="#2563EB" />
            </View>
            <Text style={s.actionLabel}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Recent transactions */}
        {transactions.length > 0 && (
          <>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => router.push("/wallet/transactions")}>
                <Text style={s.sectionLink}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={s.card}>
              {transactions.map((t, i) => (
                <View key={t._id}>
                  <TxnRow txn={t} colors={colors} s={s} />
                  {i < transactions.length - 1 && <View style={s.divider} />}
                </View>
              ))}
            </View>
          </>
        )}

        {transactions.length === 0 && (
          <View style={s.emptyWrap}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="wallet-outline" size={40} color={colors.textDisabled} />
            </View>
            <Text style={s.emptyTitle}>No transactions yet</Text>
            <Text style={s.emptyText}>Add money to get started</Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => router.push("/wallet/add-money")}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.emptyBtnTxt}>Add Money</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    head: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 12,
      paddingTop: 4,
      backgroundColor: colors.bg,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
      marginBottom: 4,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 20,
      color: colors.textPrimary,
    },

    // Balance card
    balanceCard: {
      borderRadius: radius.xxl,
      padding: 28,
      alignItems: "center",
      gap: 8,
    },
    balanceLabel: {
      color: "rgba(255,255,255,0.75)",
      fontFamily: fonts.accent,
      fontSize: 11,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    balanceAmt: {
      color: "#fff",
      fontFamily: fonts.heading,
      fontSize: 44,
      letterSpacing: -1,
    },
    addMoneyBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#fff",
      paddingHorizontal: 22,
      paddingVertical: 9,
      borderRadius: radius.pill,
      marginTop: 6,
    },
    addMoneyTxt: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
    },

    // Stats
    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    statCard: {
      flex: 1,
      minWidth: "44%",
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: 14,
      gap: 6,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    statIcon: {
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

    // Actions
    actionsRow: { flexDirection: "row", gap: 10 },
    actionCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: 16,
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    actionIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
    },
    actionLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textPrimary,
    },

    // Section header
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

    // Transaction card
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      overflow: "hidden",
    },
    txnRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    txnIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },
    txnDesc: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textPrimary,
    },
    txnDate: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    txnAmt: { fontFamily: fonts.bodyBold, fontSize: 14 },
    divider: {
      height: 1,
      backgroundColor: colors.borderSubtle,
      marginLeft: 64,
    },

    // Empty
    emptyWrap: { alignItems: "center", gap: 10, paddingVertical: 48 },
    emptyIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.elevated,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    emptyTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: colors.textPrimary,
    },
    emptyText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
    },
    emptyBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: radius.pill,
      marginTop: 6,
    },
    emptyBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
  });
