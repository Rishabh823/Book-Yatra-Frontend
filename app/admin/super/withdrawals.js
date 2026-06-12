import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { colors, fonts, radius, shadow } from "../../../lib/theme";
import { settlementApi } from "../../../lib/api";
import Toast from "../../../components/Toast";
import { useToast } from "../../../lib/hooks/useToast";

const fmtCurrency = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const STATUS_TABS = [
  { key: "pending",    label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "completed",  label: "Done" },
  { key: "rejected",   label: "Rejected" },
];

const STATUS_META = {
  pending:    { color: "#D97706", bg: "#FFFBEB" },
  processing: { color: "#2563EB", bg: "#EFF6FF" },
  completed:  { color: "#16A34A", bg: "#F0FDF4" },
  rejected:   { color: "#DC2626", bg: "#FEF2F2" },
};

function ActionSheet({ request, onClose, onAction }) {
  const [utr, setUtr] = useState(request.utrNumber || "");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    await onAction("approve", request._id, { utrNumber: utr });
    setLoading(false);
    onClose();
  };

  const handleReject = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    await onAction("reject", request._id, { rejectionReason: reason });
    setLoading(false);
    onClose();
  };

  return (
    <View style={s.overlay}>
      <TouchableOpacity style={s.overlayBg} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHandle} />
        <Text style={s.sheetTitle}>Review Withdrawal</Text>

        <View style={s.sheetInfo}>
          <View style={s.sheetRow}>
            <Text style={s.sheetLabel}>Operator</Text>
            <Text style={s.sheetVal}>{request.operatorId?.name || "—"}</Text>
          </View>
          <View style={s.sheetRow}>
            <Text style={s.sheetLabel}>Amount</Text>
            <Text style={[s.sheetVal, { fontFamily: fonts.bodyBold, color: colors.secondary }]}>
              {fmtCurrency(request.amount)}
            </Text>
          </View>
          <View style={s.sheetRow}>
            <Text style={s.sheetLabel}>Bank</Text>
            <Text style={s.sheetVal}>
              {request.bankAccountId?.bankName} · ****{request.bankAccountId?.accountNumber?.slice(-4)}
            </Text>
          </View>
          <View style={s.sheetRow}>
            <Text style={s.sheetLabel}>IFSC</Text>
            <Text style={s.sheetVal}>{request.bankAccountId?.ifscCode}</Text>
          </View>
          <View style={s.sheetRow}>
            <Text style={s.sheetLabel}>Account Holder</Text>
            <Text style={s.sheetVal}>{request.bankAccountId?.accountHolderName}</Text>
          </View>
          <View style={s.sheetRow}>
            <Text style={s.sheetLabel}>Requested</Text>
            <Text style={s.sheetVal}>{fmtDate(request.createdAt)}</Text>
          </View>
        </View>

        {request.status === "pending" || request.status === "processing" ? (
          <>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>UTR / Reference Number (for approval)</Text>
              <TextInput
                style={s.fieldInput}
                value={utr}
                onChangeText={setUtr}
                placeholder="Enter UTR number after transfer"
                placeholderTextColor={colors.textDisabled}
                autoCapitalize="characters"
              />
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Rejection Reason (to reject)</Text>
              <TextInput
                style={[s.fieldInput, { height: 70, textAlignVertical: "top" }]}
                value={reason}
                onChangeText={setReason}
                placeholder="Enter reason if rejecting"
                placeholderTextColor={colors.textDisabled}
                multiline
              />
            </View>

            <View style={s.sheetBtns}>
              <TouchableOpacity
                style={[s.rejectBtn, (!reason.trim() || loading) && { opacity: 0.4 }]}
                onPress={handleReject}
                disabled={!reason.trim() || loading}
              >
                <Ionicons name="close-circle" size={16} color="#DC2626" />
                <Text style={s.rejectBtnTxt}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.approveBtn, loading && { opacity: 0.6 }]}
                onPress={handleApprove}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text style={s.approveBtnTxt}>Approve</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={s.sheetDone}>
            <Ionicons
              name={request.status === "completed" ? "checkmark-circle" : "close-circle"}
              size={40}
              color={request.status === "completed" ? "#16A34A" : "#DC2626"}
            />
            <Text style={s.sheetDoneTxt}>
              {request.status === "completed" ? "Payment Completed" : "Request Rejected"}
            </Text>
            {request.utrNumber && <Text style={s.sheetUtr}>UTR: {request.utrNumber}</Text>}
            {request.rejectionReason && <Text style={s.sheetRejectReason}>{request.rejectionReason}</Text>}
          </View>
        )}
      </View>
    </View>
  );
}

export default function WithdrawalsScreen() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();

  const [tab, setTab] = useState("pending");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (p = 1, t = tab, reset = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await settlementApi.withdrawals(t, p);
      const list = res?.data || [];
      const total = res?.total || 0;
      if (reset || p === 1) setData(list); else setData((prev) => [...prev, ...list]);
      setHasMore(p * 20 < total);
      setPage(p);
    } catch {}
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, [tab]);

  useFocusEffect(useCallback(() => { load(1, tab, true); }, [tab]));

  const onTabChange = (t) => {
    setTab(t);
    load(1, t, true);
  };

  const handleAction = async (action, id, payload) => {
    try {
      if (action === "approve") {
        await settlementApi.approveWithdrawal(id, payload);
        showToast("Withdrawal approved!", "success");
      } else {
        await settlementApi.rejectWithdrawal(id, payload.rejectionReason);
        showToast("Withdrawal rejected", "info");
      }
      load(1, tab, true);
    } catch (e) {
      showToast(e.message || "Action failed", "error");
    }
  };

  const renderItem = ({ item }) => {
    const meta = STATUS_META[item.status] || STATUS_META.pending;
    return (
      <TouchableOpacity style={s.row} onPress={() => setSelected(item)} activeOpacity={0.7}>
        <View style={[s.rowIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name="arrow-up-circle" size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.rowOp} numberOfLines={1}>{item.operatorId?.name || "Operator"}</Text>
          <Text style={s.rowBank}>
            {item.bankAccountId?.bankName} · ****{item.bankAccountId?.accountNumber?.slice(-4)}
          </Text>
          <Text style={s.rowDate}>{fmtDate(item.createdAt)}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <Text style={s.rowAmt}>{fmtCurrency(item.amount)}</Text>
          <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[s.statusTxt, { color: meta.color }]}>{item.status}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={s.title}>Withdrawal Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Status tabs */}
      <View style={s.tabs}>
        {STATUS_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && s.tabActive]}
            onPress={() => onTabChange(t.key)}
          >
            <Text style={[s.tabTxt, tab === t.key && s.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30, gap: 2 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1, tab, true); }} tintColor={colors.primary} />}
          onEndReached={() => { if (!loadingMore && hasMore) load(page + 1, tab, false); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} /> : null}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyTxt}>
                {tab === "pending" ? "No pending withdrawals" : `No ${tab} withdrawals`}
              </Text>
            </View>
          }
        />
      )}

      {selected && (
        <ActionSheet
          request={selected}
          onClose={() => setSelected(null)}
          onAction={handleAction}
        />
      )}

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, ...shadow.soft },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.secondary },
  tabs: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 10, gap: 6 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: "center", borderWidth: 1.5, borderColor: "transparent" },
  tabActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  tabTxt: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  tabTxtActive: { color: colors.primary, fontFamily: fonts.bodyBold },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, padding: 14, borderRadius: radius.xl, marginVertical: 3, ...shadow.soft },
  rowIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  rowOp: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  rowBank: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowDate: { fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled, marginTop: 2 },
  rowAmt: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.secondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  statusTxt: { fontFamily: fonts.bodyBold, fontSize: 10, textTransform: "capitalize" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTxt: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  // Action sheet
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, justifyContent: "flex-end" },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16, maxHeight: "90%" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderSubtle, alignSelf: "center", marginBottom: 4 },
  sheetTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.secondary, textAlign: "center" },
  sheetInfo: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 14, gap: 10 },
  sheetRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  sheetLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  sheetVal: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textPrimary, flex: 1, textAlign: "right" },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  fieldInput: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontFamily: fonts.body, fontSize: 13, color: colors.textPrimary, borderWidth: 1, borderColor: colors.borderSubtle },
  sheetBtns: { flexDirection: "row", gap: 10 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: radius.pill, padding: 13, backgroundColor: "#FEF2F2", borderWidth: 1.5, borderColor: "#DC2626" },
  rejectBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#DC2626" },
  approveBtn: { flex: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: radius.pill, padding: 13, backgroundColor: "#16A34A" },
  approveBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
  sheetDone: { alignItems: "center", paddingVertical: 20, gap: 8 },
  sheetDoneTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary },
  sheetUtr: { fontFamily: fonts.bodyMedium, fontSize: 13, color: "#16A34A" },
  sheetRejectReason: { fontFamily: fonts.body, fontSize: 13, color: colors.error, textAlign: "center" },
});
