import { useState, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, ScrollView,
  useWindowDimensions, Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { AdminShell } from "../../lib/AdminScreen";
import { fonts, radius } from "../../lib/theme";
import { useColors } from "../../lib/ThemeContext";
import { admin as adminApi } from "../../lib/api";
import { fmtDate, fmtCurrency } from "../../lib/utils";

const STATUSES = ["all", "confirmed", "pending", "cancelled"];
const SC = {
  confirmed: { bg: "#DCFCE7", text: "#16A34A" },
  pending:   { bg: "#FEF9C3", text: "#CA8A04" },
  cancelled: { bg: "#FEE2E2", text: "#DC2626" },
};

export default function AdminBookings() {
  const router = useRouter();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const px = width >= 600 ? 20 : 16;

  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const s = useMemo(() => makeStyles(colors), [colors]);

  const load = useCallback(async () => {
    try {
      const res  = await adminApi.allBookings();
      const data = Array.isArray(res) ? res : res?.data || res?.bookings || [];
      setItems(data);
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const stats = useMemo(() => ({
    total:     items.length,
    confirmed: items.filter(b => b.status === "confirmed").length,
    pending:   items.filter(b => b.status === "pending").length,
    cancelled: items.filter(b => b.status === "cancelled").length,
    revenue:   items.filter(b => b.paymentStatus === "paid")
                    .reduce((s, b) => s + (b.totalAmount || b.amount || 0), 0),
  }), [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(b => {
      const matchStatus = statusFilter === "all" || b.status === statusFilter;
      const matchSearch = !q ||
        (b.tourTitle || b.tour?.title || "").toLowerCase().includes(q) ||
        (b.name || b.passengerName || "").toLowerCase().includes(q) ||
        (b._id || "").includes(q);
      return matchStatus && matchSearch;
    });
  }, [items, search, statusFilter]);

  const fmtRev = (n) => n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${n}`;

  const exportCSV = async () => {
    if (!filtered.length) return;
    const header = "BookingID,Passenger,Tour,Date,Seats,Amount,Status,Payment";
    const rows = filtered.map(b => [
      String(b._id || "").slice(-8).toUpperCase(),
      b.name || b.passengerName || b.userId?.name || "—",
      b.tourTitle || b.tour?.title || "—",
      b.tourId?.startDate ? new Date(b.tourId.startDate).toLocaleDateString("en-IN") : "—",
      b.numberOfSeats || b.seats || 1,
      b.totalAmount || b.amount || 0,
      b.status || "—",
      b.paymentStatus || "—",
    ].map(v => `"${String(v).replace(/"/g, "'")}"`).join(","));
    const csv = [header, ...rows].join("\n");
    await Share.share({ message: `Bookings Export\n\n${csv}`, title: "Bookings CSV" });
  };

  return (
    <AdminShell title="Manage Bookings" subtitle={`${filtered.length} of ${items.length}`}>
      {/* Stats strip */}
      <View style={[s.statsStrip, { marginHorizontal: px }]}>
        <StripStat label="Total" value={stats.total} color={colors.textPrimary} s={s} />
        <View style={s.stripDiv} />
        <StripStat label="Confirmed" value={stats.confirmed} color="#16A34A" s={s} />
        <View style={s.stripDiv} />
        <StripStat label="Pending" value={stats.pending} color="#D97706" s={s} />
        <View style={s.stripDiv} />
        <StripStat label="Revenue" value={fmtRev(stats.revenue)} color={colors.primary} s={s} />
        <TouchableOpacity style={s.exportBtn} onPress={exportCSV}>
          <Ionicons name="share-outline" size={14} color={colors.primary} />
          <Text style={s.exportTxt}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Search + Filter */}
      <View style={{ paddingHorizontal: px, gap: 8, marginBottom: 4 }}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search tour, passenger, ID..."
            placeholderTextColor={colors.textDisabled}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {STATUSES.map(st => (
            <TouchableOpacity
              key={st}
              style={[s.chip, statusFilter === st && s.chipActive]}
              onPress={() => setStatusFilter(st)}
            >
              <Text style={[s.chipTxt, statusFilter === st && s.chipTxtActive]}>{st}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => String(it._id || it.id)}
          contentContainerStyle={{ paddingHorizontal: px, paddingBottom: 40, paddingTop: 4 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="ticket-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyTxt}>No bookings found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const sc = SC[item.status] || { bg: colors.elevated, text: colors.textSecondary };
            return (
              <TouchableOpacity
                style={s.card}
                activeOpacity={0.88}
                onPress={() => router.push(`/admin/booking/${item._id || item.id}`)}
                testID={`booking-${item._id}`}
              >
                <View style={s.cardTop}>
                  <View style={s.idBadge}>
                    <Text style={s.idTxt}>#{String(item._id || "").slice(-5).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tourName} numberOfLines={1}>
                      {item.tourTitle || item.tour?.title || "Yatra"}
                    </Text>
                    <Text style={s.passengerName} numberOfLines={1}>
                      {item.name || item.passengerName || "—"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 5 }}>
                    <View style={[s.sBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.sBadgeTxt, { color: sc.text }]}>{item.status || "pending"}</Text>
                    </View>
                    <View style={s.payRow}>
                      <Ionicons
                        name={item.paymentStatus === "paid" ? "checkmark-circle" : "time"}
                        size={11}
                        color={item.paymentStatus === "paid" ? "#16A34A" : "#D97706"}
                      />
                      <Text style={[s.payTxt, { color: item.paymentStatus === "paid" ? "#16A34A" : "#D97706" }]}>
                        {item.paymentStatus || "pending"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={s.metaRow}>
                  <View style={s.metaItem}>
                    <Ionicons name="calendar-outline" size={12} color={colors.primary} />
                    <Text style={s.metaTxt}>{fmtDate(item.tourStartDate || item.tripDate || item.tour?.startDate)}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Ionicons name="people-outline" size={12} color={colors.primary} />
                    <Text style={s.metaTxt}>{item.numberOfSeats || 1} seat(s)</Text>
                  </View>
                  {(item.source || item.destination) && (
                    <View style={[s.metaItem, { flex: 1 }]}>
                      <Ionicons name="location-outline" size={12} color={colors.primary} />
                      <Text style={[s.metaTxt, { flex: 1 }]} numberOfLines={1}>
                        {item.source || "—"} → {item.destination || "—"}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={s.cardFooter}>
                  <Text style={s.amount}>{fmtCurrency(item.totalAmount || item.amount)}</Text>
                  <View style={s.viewBtn}>
                    <Text style={s.viewBtnTxt}>View Details</Text>
                    <Ionicons name="chevron-forward" size={13} color={colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </AdminShell>
  );
}

function StripStat({ label, value, color, s }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={[s.stripVal, { color }]}>{value}</Text>
      <Text style={s.stripLbl}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  statsStrip: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginBottom: 10, marginTop: 2, borderWidth: 1, borderColor: colors.borderSubtle },
  stripDiv:   { width: 1, backgroundColor: colors.borderSubtle, height: 24, marginHorizontal: 6 },
  exportBtn:  { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.primaryLight, borderRadius: 16 },
  exportTxt:  { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primary },
  stripVal:   { fontFamily: fonts.heading, fontSize: 18 },
  stripLbl:   { fontFamily: fonts.body, fontSize: 10, color: colors.textSecondary, marginTop: 1 },

  searchBar:  { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: colors.borderSubtle },
  searchInput:{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  chip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, marginRight: 8, alignSelf: "flex-start" },
  chipActive: { backgroundColor: colors.primary + "18", borderColor: colors.primary },
  chipTxt:    { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, textTransform: "capitalize" },
  chipTxtActive: { color: colors.primary, fontFamily: fonts.bodyBold },

  card:      { backgroundColor: colors.surface, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: colors.borderSubtle },
  cardTop:   { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  idBadge:   { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary + "14", alignItems: "center", justifyContent: "center" },
  idTxt:     { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.primary },
  tourName:  { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.secondary },
  passengerName: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  sBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  sBadgeTxt: { fontFamily: fonts.bodyBold, fontSize: 10, textTransform: "capitalize" },
  payRow:    { flexDirection: "row", alignItems: "center", gap: 3 },
  payTxt:    { fontFamily: fonts.body, fontSize: 10 },

  metaRow:  { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTxt:  { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },

  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  amount:     { fontFamily: fonts.heading, fontSize: 20, color: colors.primary },
  viewBtn:    { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.primaryLight || "#FFEEE8", borderRadius: 999 },
  viewBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primary },

  empty:    { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt: { fontFamily: fonts.body, color: colors.textSecondary },
});
