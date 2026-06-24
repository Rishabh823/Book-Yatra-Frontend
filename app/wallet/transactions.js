import { useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fonts, radius, shadow } from "../../lib/theme";
import { useColors } from "../../lib/ThemeContext";
import { walletApi } from "../../lib/api";
import { useFocusEffect } from "expo-router";

const fmtCurrency = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const CATEGORY_META = {
  topup:    { icon: "add-circle", color: "#16A34A", label: "Recharge" },
  payment:  { icon: "cart",       color: "#DC2626", label: "Booking Payment" },
  refund:   { icon: "return-down-back", color: "#2563EB", label: "Refund" },
  cashback: { icon: "gift",       color: "#D97706", label: "Cashback" },
  referral: { icon: "people",     color: "#7C3AED", label: "Referral Bonus" },
  reversal: { icon: "refresh",    color: "#6B7280", label: "Reversal" },
  adjustment: { icon: "build",   color: "#6B7280", label: "Adjustment" },
};

const FILTERS = ["all", "credit", "debit"];

export default function WalletTransactions() {
  const router = useRouter();
  const colors = useColors();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState("all");

  const s = useMemo(() => makeStyles(colors), [colors]);

  const load = useCallback(async (p = 1, f = filter, reset = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const params = f !== "all" ? `type=${f}` : "";
      const res = await walletApi.transactions(p, params);
      const data = res?.data || [];
      const total = res?.total || 0;
      if (reset || p === 1) {
        setTransactions(data);
      } else {
        setTransactions((prev) => [...prev, ...data]);
      }
      setHasMore(p * 20 < total);
      setPage(p);
    } catch {}
    setLoading(false);
    setLoadingMore(false);
  }, [filter]);

  useFocusEffect(useCallback(() => { load(1, filter, true); }, [filter]));

  const onFilterChange = (f) => {
    setFilter(f);
    setPage(1);
    load(1, f, true);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) load(page + 1);
  };

  const renderItem = ({ item: txn }) => {
    const meta = CATEGORY_META[txn.category] || CATEGORY_META.adjustment;
    const isCredit = txn.type === "credit";
    return (
      <View style={s.row}>
        <View style={[s.rowIcon, { backgroundColor: meta.color + "18" }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.rowDesc} numberOfLines={2}>{txn.description}</Text>
          <Text style={s.rowMeta}>{meta.label} · {fmtDate(txn.createdAt)}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={[s.rowAmt, { color: isCredit ? "#16A34A" : "#DC2626" }]}>
            {isCredit ? "+" : "−"}{fmtCurrency(txn.amount)}
          </Text>
          <Text style={s.rowBal}>Bal: {fmtCurrency(txn.balanceAfter)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={s.title}>Transactions</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter tabs */}
      <View style={s.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterTab, filter === f && s.filterTabActive]}
            onPress={() => onFilterChange(f)}
          >
            <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(t) => t._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30, gap: 2 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} /> : null}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="receipt-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyTxt}>No transactions found</Text>
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
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, ...shadow.soft },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.secondary },
  filters: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle },
  filterTabActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  filterTxt: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
  filterTxtActive: { color: colors.primary, fontFamily: fonts.bodyBold },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, padding: 14, borderRadius: radius.xl, marginVertical: 4 },
  rowIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  rowDesc: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  rowMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  rowAmt: { fontFamily: fonts.bodyBold, fontSize: 14 },
  rowBal: { fontFamily: fonts.body, fontSize: 10, color: colors.textDisabled },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTxt: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
});
