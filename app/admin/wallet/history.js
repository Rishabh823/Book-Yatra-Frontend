import { useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { fonts, radius } from "../../../lib/theme";
import { useColors } from "../../../lib/ThemeContext";
import { operatorWalletApi } from "../../../lib/api";

const fmtCurrency = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS_META = {
  pending:    { color: "#D97706", label: "Pending" },
  processing: { color: "#2563EB", label: "Processing" },
  completed:  { color: "#16A34A", label: "Completed" },
  rejected:   { color: "#DC2626", label: "Rejected" },
};

const TABS = [
  { key: "withdrawals", label: "Withdrawals" },
  { key: "settlements", label: "Settlements" },
];

function WithdrawalRow({ item }) {
  const colors = useColors();
  const meta = STATUS_META[item.status] || STATUS_META.pending;
  return (
    <View style={{
      flexDirection: "row", alignItems: "flex-start", gap: 12,
      backgroundColor: colors.surface, padding: 14, borderRadius: 20,
      marginVertical: 4, borderWidth: 1, borderColor: colors.borderSubtle,
    }}>
      <View style={{
        width: 42, height: 42, borderRadius: 21,
        alignItems: "center", justifyContent: "center",
        backgroundColor: meta.color + "18",
      }}>
        <Ionicons name="arrow-up-circle" size={20} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary }}>{fmtCurrency(item.amount)}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
          {item.bankAccountId?.bankName || "Bank"} · ****{item.bankAccountId?.accountNumber?.slice(-4) || "----"}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled, marginTop: 2 }}>{fmtDate(item.createdAt)}</Text>
        {item.utrNumber && (
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: "#16A34A", marginTop: 4 }}>UTR: {item.utrNumber}</Text>
        )}
        {item.rejectionReason && (
          <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.error, marginTop: 4 }}>Reason: {item.rejectionReason}</Text>
        )}
      </View>
      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: meta.color + "18" }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: meta.color }}>{meta.label}</Text>
      </View>
    </View>
  );
}

function SettlementRow({ item }) {
  const colors = useColors();
  return (
    <View style={{
      flexDirection: "row", alignItems: "flex-start", gap: 12,
      backgroundColor: colors.surface, padding: 14, borderRadius: 20,
      marginVertical: 4, borderWidth: 1, borderColor: colors.borderSubtle,
    }}>
      <View style={{
        width: 42, height: 42, borderRadius: 21,
        alignItems: "center", justifyContent: "center",
        backgroundColor: "#16A34A18",
      }}>
        <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary }} numberOfLines={1}>{item.tourId?.title || "Tour Booking"}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
          Booking: {fmtCurrency(item.bookingAmount)} · Commission: {fmtCurrency(item.commissionAmount)}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled, marginTop: 2 }}>{fmtDate(item.createdAt)}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: "#16A34A" }}>+{fmtCurrency(item.operatorAmount)}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textDisabled }}>{item.commissionRate || 10}% comm.</Text>
      </View>
    </View>
  );
}

export default function WalletHistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
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
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
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
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                <Ionicons name="receipt-outline" size={36} color={colors.textDisabled} />
              </View>
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

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  head: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4,
    backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
    marginBottom: 4,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary },
  tabsRow: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 999,
    backgroundColor: colors.surface, alignItems: "center",
    borderWidth: 1.5, borderColor: colors.borderSubtle,
  },
  tabActive: { backgroundColor: colors.primary + "18", borderColor: colors.primary },
  tabTxt: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
  tabTxtActive: { color: colors.primary, fontFamily: fonts.bodyBold },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTxt: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  withdrawBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  withdrawBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
});
