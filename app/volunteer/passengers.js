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
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../../lib/api";
import { colors, fonts, radius, shadow } from "../../lib/theme";

export default function PassengersScreen() {
  const { tourId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/volunteer/passengers?tourId=" + tourId);
      setPassengers(res.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [tourId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const manualCheckIn = async (bookingId, passengerId) => {
    try {
      await api.post("/volunteer/manual-checkin", {
        bookingId,
        passengerId,
        tourId,
      });
      setPassengers((prev) =>
        prev.map((p) =>
          p.bookingId === bookingId ? { ...p, checkedIn: true } : p,
        ),
      );
    } catch {
      Alert.alert("Error", "Check-in failed");
    }
  };

  const filtered = passengers.filter((p) => {
    const matchSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.seatNumber?.toString().includes(search);
    const matchFilter =
      filter === "all" ||
      (filter === "in" && p.checkedIn) ||
      (filter === "pending" && !p.checkedIn);
    return matchSearch && matchFilter;
  });

  const checkedCount = passengers.filter((p) => p.checkedIn).length;

  const renderItem = ({ item }) => (
    <View style={[styles.passengerRow, shadow.soft]}>
      <View
        style={[
          styles.seatBadge,
          { backgroundColor: item.checkedIn ? "#DCFCE7" : "#F3F4F6" },
        ]}
      >
        <Text
          style={[
            styles.seatNum,
            { color: item.checkedIn ? "#16A34A" : colors.textSecondary },
          ]}
        >
          {item.seatNumber || "—"}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.passengerName}>{item.name || "Guest"}</Text>
        <Text style={styles.passengerPhone}>{item.phone || "No phone"}</Text>
      </View>
      {item.checkedIn ? (
        <View style={styles.checkedBadge}>
          <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
          <Text style={styles.checkedText}>In</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.checkInBtn}
          onPress={() => manualCheckIn(item.bookingId, item._id)}
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Passengers</Text>
          <Text style={styles.subtitle}>
            {checkedCount}/{passengers.length} checked in
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/volunteer/checkin?tourId=" + tourId)}
          style={styles.scanBtn}
        >
          <Ionicons name="qr-code" size={20} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              {
                width: passengers.length
                  ? (checkedCount / passengers.length) * 100 + "%"
                  : "0%",
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {passengers.length
            ? Math.round((checkedCount / passengers.length) * 100)
            : 0}
          %
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
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {l}
              </Text>
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
          contentContainerStyle={{
            padding: 16,
            gap: 8,
            paddingBottom: insets.bottom + 20,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
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
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
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
  progressBg: {
    flex: 1,
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#16A34A", borderRadius: 4 },
  progressText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: "#16A34A",
    width: 36,
  },
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
  filterText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  filterTextActive: { color: "white" },
  passengerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
  },
  seatBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  seatNum: { fontFamily: fonts.bodyBold, fontSize: 14 },
  passengerName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  passengerPhone: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
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
  checkInText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.primary,
  },
  empty: { alignItems: "center", paddingVertical: 40 },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
