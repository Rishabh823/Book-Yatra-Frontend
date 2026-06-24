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

const fmtCurrency = (n) => `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const CATEGORY_META = {
  topup:    { icon: "add-circle", color: "#16A34A", label: "Recharge" },
  payment:  { icon: "cart",       color: "#DC2626", label: "Payment" },
  refund:   { icon: "return-down-back", color: "#2563EB", label: "Refund" },
  cashback: { icon: "gift",       color: "#D97706", label: "Cashback" },
  referral: { icon: "people",     color: "#7C3AED", label: "Referral" },
  reversal: { icon: "refresh",    color: "#6B7280", label: "Reversal" },
  adjustment: { icon: "build",   color: "#6B7280", label: "Adjustment" },
};

function TxnRow({ txn }) {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const meta = CATEGORY_META[txn.category] || CATEGORY_META.adjustment;
  const isCredit = txn.type === "credit";
  return (
    <View style={s.txnRow}>
      <View style={[s.txnIcon, { backgroundColor: meta.color + "18" }]}>
        <Ionicons name={meta.icon} size={18} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.txnDesc} numberOfLines={1}>{txn.description}</Text>
        <Text style={s.txnDate}>{fmtDate(txn.createdAt)}</Text>
      </View>
      <Text style={[s.txnAmt, { color: isCredit ? "#16A34A" : "#DC2626" }]}>
        {isCredit ? "+" : "−"}{fmtCurrency(txn.amount)}
      </Text>
    </View>
  );
}

function StatCard({ label, value, icon, color }) {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={s.statCard}>
      <View style={[s.statIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.statValue}>{fmtCurrency(value)}</Text>
      <Text style={s.statLabel}>{label}</Text>
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
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={s.title}>My Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Balance card */}
        <LinearGradient colors={[colors.secondary, "#3D0D0C"]} style={s.balanceCard}>
          <Text style={s.balanceLabel}>Available Balance</Text>
          <Text style={s.balanceAmt}>{fmtCurrency(wallet?.balance)}</Text>
          <TouchableOpacity
            style={s.addMoneyBtn}
            onPress={() => router.push("/wallet/add-money")}
          >
            <Ionicons name="add" size={18} color={colors.secondary} />
            <Text style={s.addMoneyTxt}>Add Money</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats grid */}
        <View style={s.statsGrid}>
          <StatCard label="Total Added" value={wallet?.totalAdded} icon="arrow-down-circle" color="#16A34A" />
          <StatCard label="Total Spent" value={wallet?.totalSpent} icon="cart" color="#DC2626" />
          <StatCard label="Refunds" value={wallet?.totalRefunds} icon="return-down-back" color="#2563EB" />
          <StatCard label="Cashback" value={wallet?.cashbackEarned} icon="gift" color="#D97706" />
        </View>

        {/* Quick actions */}
        <View style={s.actionsRow}>
          <TouchableOpacity style={s.actionCard} onPress={() => router.push("/wallet/add-money")}>
            <View style={[s.actionIcon, { backgroundColor: "#F0FDF4" }]}>
              <Ionicons name="add-circle" size={24} color="#16A34A" />
            </View>
            <Text style={s.actionLabel}>Add Money</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionCard} onPress={() => router.push("/wallet/transactions")}>
            <View style={[s.actionIcon, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="receipt" size={24} color="#2563EB" />
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
              {transactions.map((t) => <TxnRow key={t._id} txn={t} />)}
            </View>
          </>
        )}

        {transactions.length === 0 && (
          <View style={s.emptyWrap}>
            <Ionicons name="wallet-outline" size={48} color={colors.textDisabled} />
            <Text style={s.emptyText}>No transactions yet</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push("/wallet/add-money")}>
              <Text style={s.emptyBtnTxt}>Add Money to Get Started</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, ...shadow.soft },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.secondary },
  balanceCard: { borderRadius: radius.xxl, padding: 28, alignItems: "center", gap: 8 },
  balanceLabel: { color: "rgba(255,233,192,0.7)", fontFamily: fonts.accent, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  balanceAmt: { color: "#fff", fontFamily: fonts.heading, fontSize: 42 },
  addMoneyBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surface, paddingHorizontal: 24, paddingVertical: 10, borderRadius: radius.pill, marginTop: 8 },
  addMoneyTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.secondary },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { flex: 1, minWidth: "44%", backgroundColor: colors.surface, borderRadius: radius.xl, padding: 14, gap: 6, ...shadow.soft, alignItems: "flex-start" },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  actionsRow: { flexDirection: "row", gap: 12 },
  actionCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16, alignItems: "center", gap: 8, ...shadow.soft },
  actionIcon: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  sectionLink: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 4, ...shadow.soft },
  txnRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  txnIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  txnDesc: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  txnDate: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  txnAmt: { fontFamily: fonts.bodyBold, fontSize: 14 },
  emptyWrap: { alignItems: "center", gap: 12, paddingVertical: 40 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.pill },
  emptyBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
});
