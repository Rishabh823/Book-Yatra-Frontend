import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { volunteerApi } from "../../lib/api";
import { colors, fonts, radius, shadow } from "../../lib/theme";

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function TourPickerScreen({ onSelect }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const res = await volunteerApi.dashboard();
          setTours(res.data?.assignedTours || []);
        } catch {}
        setLoading(false);
      })();
    }, []),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={["#1E0A0A", "#5C1615"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Select Tour</Text>
          <Text style={styles.subtitle}>Choose a tour to view passengers</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : tours.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bus-outline" size={48} color={colors.textDisabled} />
          <Text style={styles.emptyText}>No tours assigned to you</Text>
        </View>
      ) : (
        <FlatList
          data={tours}
          keyExtractor={(t) => String(t._id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tourPickCard, shadow.soft]}
              onPress={() => onSelect(item._id, item.title)}
              activeOpacity={0.85}
            >
              <View style={styles.tourPickIcon}>
                <Ionicons name="bus" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tourPickTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.tourPickMeta}>
                  {item.source} → {item.destination}
                </Text>
                <Text style={styles.tourPickDate}>{fmtDate(item.startDate)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

export default function PassengersScreen() {
  const { tourId: paramTourId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [selectedTourId, setSelectedTourId] = useState(paramTourId || null);
  const [selectedTourTitle, setSelectedTourTitle] = useState("");
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    if (!selectedTourId) return;
    setLoading(true);
    try {
      const res = await volunteerApi.passengers(selectedTourId);
      setPassengers(res.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [selectedTourId]);

  useFocusEffect(
    useCallback(() => {
      if (selectedTourId) load();
    }, [load, selectedTourId]),
  );

  const manualCheckIn = async (bookingId) => {
    try {
      await volunteerApi.manualCheckIn({ bookingId, tourId: selectedTourId });
      setPassengers((prev) =>
        prev.map((p) => (String(p._id) === String(bookingId) ? { ...p, isCheckedIn: true } : p)),
      );
    } catch {
      showToast("Check-in failed", "error");
    }
  };

  const filtered = passengers.filter((p) => {
    const matchSearch =
      !search ||
      p.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      String(p.seatNumber || "").includes(search);
    const matchFilter =
      filter === "all" ||
      (filter === "in" && p.isCheckedIn) ||
      (filter === "pending" && !p.isCheckedIn);
    return matchSearch && matchFilter;
  });

  const checkedCount = passengers.filter((p) => p.isCheckedIn).length;

  const exportCSV = async () => {
    if (!passengers.length) { showToast("No passengers to export", "info"); return; }
    const header = "Seat,Name,Phone,Status";
    const rows = passengers.map(p =>
      [p.seatNumber || "—", p.userId?.name || "Guest", p.userId?.phone || "", p.isCheckedIn ? "Checked In" : "Pending"].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const tourLabel = selectedTourTitle || "Tour";
    await Share.share({
      message: `Passenger List — ${tourLabel}\n\n${csv}`,
      title: `Passengers - ${tourLabel}`,
    });
  };

  // Tour picker — if no tour is selected yet
  if (!selectedTourId) {
    return (
      <TourPickerScreen
        onSelect={(id, title) => {
          setSelectedTourId(id);
          setSelectedTourTitle(title);
        }}
      />
    );
  }

  const renderItem = ({ item }) => (
    <View style={[styles.passengerRow, shadow.soft]}>
      <View style={[styles.seatBadge, { backgroundColor: item.isCheckedIn ? "#DCFCE7" : "#F3F4F6" }]}>
        <Text style={[styles.seatNum, { color: item.isCheckedIn ? "#16A34A" : colors.textSecondary }]}>
          {item.seatNumber || "—"}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.passengerName}>{item.userId?.name || "Guest"}</Text>
        <Text style={styles.passengerPhone}>{item.userId?.phone || "No phone"}</Text>
      </View>
      {item.isCheckedIn ? (
        <View style={styles.checkedBadge}>
          <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
          <Text style={styles.checkedText}>In</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.checkInBtn}
          onPress={() => manualCheckIn(item._id)}
        >
          <Ionicons name="person-add" size={14} color={colors.primary} />
          <Text style={styles.checkInText}>Check In</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={["#1E0A0A", "#5C1615"]} style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (paramTourId) {
              router.back();
            } else {
              setSelectedTourId(null);
              setPassengers([]);
            }
          }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Passengers</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {selectedTourTitle || checkedCount + "/" + passengers.length + " checked in"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <TouchableOpacity
            onPress={exportCSV}
            style={styles.scanBtn}
          >
            <Ionicons name="share-outline" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/volunteer/checkin?tourId=" + selectedTourId)}
            style={styles.scanBtn}
          >
            <Ionicons name="qr-code" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              { width: passengers.length ? (checkedCount / passengers.length) * 100 + "%" : "0%" },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {passengers.length ? Math.round((checkedCount / passengers.length) * 100) : 0}%
        </Text>
      </View>

      <View style={styles.controls}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or seat..."
          placeholderTextColor={colors.textSecondary}
        />
        <View style={styles.filterRow}>
          {[
            ["all", "All"],
            ["in", "Checked In"],
            ["pending", "Pending"],
          ].map(([f, l]) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => String(item._id || i)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: insets.bottom + 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No passengers found</Text>
            </View>
          }
        />
      )}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "Philosopher_700Bold", fontSize: 20, color: "white" },
  subtitle: { fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.7)" },
  scanBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  progressBg: { flex: 1, height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#16A34A", borderRadius: 4 },
  progressText: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#16A34A", width: 36 },
  controls: {
    backgroundColor: colors.surface,
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  searchInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "#F3F4F6",
  },
  filterActive: { backgroundColor: colors.primary },
  filterText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  filterTextActive: { color: "white" },
  passengerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
  },
  seatBadge: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  seatNum: { fontFamily: fonts.bodyBold, fontSize: 14 },
  passengerName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary },
  passengerPhone: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  checkedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  checkedText: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#16A34A" },
  checkInBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  checkInText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary },
  empty: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  // Tour picker styles
  tourPickCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
  },
  tourPickIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  tourPickTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  tourPickMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  tourPickDate: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary, marginTop: 2 },
});
