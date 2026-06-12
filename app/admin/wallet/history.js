import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { colors, fonts, radius, shadow } from "../../../lib/theme";
import { operatorWalletApi } from "../../../lib/api";

const fmtCurrency = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS_META = {
  pending:    { color: "#D97706", bg: "#FFFBEB", label: "Pending" },
  processing: { color: "#2563EB", bg: "#EFF6FF", label: "Processing" },
  completed:  { color: "#16A34A", bg: "#F0FDF4", label: "Completed" },
  rejected:   { color: "#DC2626", bg: "#FEF2F2", label: "Rejected" },
};

const TABS = [
  { key: "withdrawals", label: "Withdrawals" },
  { key: "settlements", label: "Settlements" },
];

function WithdrawalRow({ item }) {
  const meta = STATUS_META[item.status] || STATUS_META.pending;
  return (
    <View style={s.row}>
      <View style={[s.rowIcon, { backgroundColor: meta.bg }]}>
        <Ionicons name="arrow-up-circle" size={20} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{fmtCurrency(item.amount)}</Text>
        <Text style={s.rowSub}>
          {item.bankAccountId?.bankName || "Bank"} · ****{item.bankAccountId?.accountNumber?.slice(-4) || "----"}
        </Text>
        <Text style={s.rowDate}>{fmtDate(item.createdAt)}</Text>
        {item.utrNumber && (
          <Text style={s.rowUtr}>UTR: {item.utrNumber}</Text>
        )}
        {item.rejectionReason && (
          <Text style={s.rowReject}>Reason: {item.rejectionReason}</Text>
        )}
      </View>
      <View style={[s.badge, { backgroundColor: meta.bg }]}>
        <Text style={[s.badgeTxt, { color: meta.color }]}>{meta.label}</Text>
      </View>
    </View>
  );
}

function SettlementRow({ item }) {
  return (
    <View style={s.row}>
      <View style={[s.rowIcon, { backgroundColor: "#F0FDF4" }]}>
        <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{item.tourId?.title || "Tour Booking"}</Text>
        <Text style={s.rowSub}>
          Booking: {fmtCurrency(item.bookingAmount)} · Commission: {fmtCurrency(item.commissionAmount)}
        </Text>
        <Text style={s.rowDate}>{fmtDate(item.createdAt)}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[s.rowAmt, { color: "#16A34A" }]}>+{fmtCurrency(item.operatorAmount)}</Text>
        <Text style={s.rowComm}>{item.commissionRate || 10}% comm.</Text>
      </View>
    </View>
  );
}

export default function WalletHistoryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("withdrawals");
  const [withdrawals, setWithdrawals] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (p = 1, tab = activeTab, reset = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      if (tab === "withdrawals") {
        const res = await operatorWalletApi.withdrawals(p);
        const data = res?.data || [];
        const total = res?.total || 0;
        if (reset || p === 1) setWithdrawals(data); else setWithdrawals((prev) => [...prev, ...data]);
        setHasMore(p * 20 < total);
      } else {
        const res = await operatorWalletApi.settlements(p);
        const data = res?.data || [];
        const total = res?.total || 0;
        if (reset || p === 1) setSettlements(data); else setSettlements((prev) => [...prev, ...data]);
        setHasMore(p * 20 < total);
      }
      setPage(p);
    } catch {}
    setLoading(false);
    setLoadingMore(false);
  }, [activeTab]);

  useFocusEffect(useCallback(() => { load(1, activeTab, true); }, [activeTab]));

  const onTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    load(1, tab, true);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) load(page + 1, activeTab, false);
  };

  const data = activeTab === "withdrawals" ? withdrawals : settlements;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={s.title}>History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => onTabChange(tab.key)}
          >
            <Text style={[s.tabTxt, activeTab === tab.key && s.tabTxtActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) =>
            activeTab === "withdrawals"
              ? <WithdrawalRow item={item} />
              : <SettlementRow item={item} />
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30, gap: 2 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} /> : null}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="receipt-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyTxt}>
                {activeTab === "withdrawals" ? "No withdrawal requests yet" : "No settlements yet"}
              </Text>
              {activeTab === "withdrawals" && (
                <TouchableOpacity style={s.withdrawBtn} onPress={() => router.push("/admin/wallet/withdraw")}>
                  <Text style={s.withdrawBtnTxt}>Request Withdrawal</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, ...shadow.soft },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.secondary },
  tabsRow: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: "center", borderWidth: 1.5, borderColor: "transparent" },
  tabActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  tabTxt: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
  tabTxtActive: { color: colors.primary, fontFamily: fonts.bodyBold },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: colors.surface, padding: 14, borderRadius: radius.xl, marginVertical: 4, ...shadow.soft },
  rowIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  rowSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowDate: { fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled, marginTop: 2 },
  rowUtr: { fontFamily: fonts.bodyMedium, fontSize: 11, color: "#16A34A", marginTop: 4 },
  rowReject: { fontFamily: fonts.body, fontSize: 11, color: colors.error, marginTop: 4 },
  rowAmt: { fontFamily: fonts.bodyBold, fontSize: 14 },
  rowComm: { fontFamily: fonts.body, fontSize: 10, color: colors.textDisabled },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeTxt: { fontFamily: fonts.bodyBold, fontSize: 11 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTxt: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  withdrawBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.pill },
  withdrawBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
});
