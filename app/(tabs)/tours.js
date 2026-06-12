import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
const { width: SCREEN_W } = Dimensions.get("window");
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import { tours as toursApi, auth as authApi, volunteerApi } from "../../lib/api";
import SmartSearchBar from "../../components/SmartSearchBar";
import FilterSheet, { DEFAULT_FILTERS } from "../../components/FilterSheet";
import { useFavorites } from "../../lib/hooks/useFavorites";
import { TourCardSkeleton } from "../../components/SkeletonCard";
import FallbackImage from "../../components/FallbackImage";

export default function Tours() {
  const router = useRouter();
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [opFilter, setOpFilter] = useState("all");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("user");
  const [userJoinedOps, setUserJoinedOps] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [advFilters, setAdvFilters] = useState(DEFAULT_FILTERS);
  const [assignedTours, setAssignedTours] = useState([]);
  const [volunteerLoading, setVolunteerLoading] = useState(false);

  const { isFav, toggle: toggleFav } = useFavorites();

  const isOperator =
    role === "admin" || role === "super_admin" || role === "manager";
  const isSuperAdmin = role === "super_admin";
  const isVolunteer = role === "volunteer";

  const loadUserData = useCallback(async () => {
    const loggedIn = await authApi.isAuthenticated();
    setIsLoggedIn(loggedIn);
    setAuthChecked(true);
    if (!loggedIn) return;
    const r = await authApi.getRole();
    setRole(r || "user");
    if (r === "volunteer") {
      setVolunteerLoading(true);
      try {
        const res = await volunteerApi.dashboard();
        setAssignedTours(res.data?.assignedTours || []);
      } catch {}
      setVolunteerLoading(false);
    }
    if (r === "user" || r === "volunteer" || r === "guest") {
      let ops = [];
      // 1. Try fresh from backend
      try {
        const res = await authApi.getProfile();
        const profile = res?.data || res?.user || res;
        if (
          Array.isArray(profile?.joinedOperators) &&
          profile.joinedOperators.length > 0
        ) {
          ops = profile.joinedOperators;
          // Persist fresh operator list back to AsyncStorage without overwriting other fields
          const stored = await AsyncStorage.getItem("user");
          const u = stored ? JSON.parse(stored) : {};
          await AsyncStorage.setItem(
            "user",
            JSON.stringify({ ...u, joinedOperators: ops }),
          );
        }
      } catch {}
      // 2. Always fall back to AsyncStorage when backend gave nothing
      if (ops.length === 0) {
        try {
          const stored = await AsyncStorage.getItem("user");
          if (stored) {
            const u = JSON.parse(stored);
            if (Array.isArray(u.joinedOperators)) ops = u.joinedOperators;
          }
        } catch {}
      }
      setUserJoinedOps(
        ops.map((op) =>
          typeof op === "object"
            ? op
            : { _id: String(op), name: String(op), businessName: "" },
        ),
      );
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await toursApi.all().catch(() => []);
      setAll(Array.isArray(data) ? data : data?.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      load();
    }, [loadUserData, load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUserData(), load()]);
    setRefreshing(false);
  };

  // Unique operators derived from tour data (super_admin sees all)
  const allOperators = useMemo(() => {
    const map = new Map();
    all.forEach((t) => {
      const op = t.operatorId;
      if (!op) return;
      const id = typeof op === "object" ? String(op._id) : String(op);
      const name =
        typeof op === "object" ? op.businessName || op.name || id : id;
      if (!map.has(id)) map.set(id, { _id: id, name });
    });
    return Array.from(map.values());
  }, [all]);

  // Filter chips to show: super_admin = all from tour data; regular user = their joined ops
  const filterOps = isSuperAdmin ? allOperators : userJoinedOps;
  const showOpFilter = filterOps.length > 1;

  const fmt = (s, e) => {
    try {
      const sd = new Date(s).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      });
      const ed = new Date(e).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${sd} – ${ed}`;
    } catch {
      return "";
    }
  };

  const now = new Date();

  const filtered = all.filter((t) => {
    if (
      q &&
      !`${t.title} ${t.source} ${t.destination}`
        .toLowerCase()
        .includes(q.toLowerCase())
    )
      return false;
    if (typeFilter !== "all" && (t.tourType || "other") !== typeFilter)
      return false;
    if (opFilter !== "all") {
      const tourOpId =
        typeof t.operatorId === "object"
          ? String(t.operatorId?._id)
          : String(t.operatorId);
      if (tourOpId !== opFilter) return false;
    } else if (!isOperator && userJoinedOps.length > 0) {
      // Regular users only see tours from their joined operators
      const joinedIds = new Set(
        userJoinedOps.map((op) =>
          typeof op === "object" ? String(op._id) : String(op),
        ),
      );
      const tourOpId =
        typeof t.operatorId === "object"
          ? String(t.operatorId?._id)
          : String(t.operatorId);
      if (!joinedIds.has(tourOpId)) return false;
    }
    // Date range filter — applies to everyone when set, otherwise hide past tours for users
    if (advFilters.dateFrom) {
      const from = new Date(advFilters.dateFrom + "T00:00:00");
      if (new Date(t.startDate) < from) return false;
    }
    if (advFilters.dateTo) {
      const to = new Date(advFilters.dateTo + "T23:59:59");
      if (new Date(t.startDate) > to) return false;
    }
    // Hide past tours only when user has no joined operator and no date filter set
    if (!isOperator && userJoinedOps.length === 0 && !advFilters.dateFrom && !advFilters.dateTo) {
      if (new Date(t.startDate) < now) return false;
    }

    // ── Advanced filters from FilterSheet ──────────────────────────
    if (advFilters.types.length > 0) {
      if (!advFilters.types.includes(t.tourType || "other")) return false;
    }

    if (advFilters.priceRanges.length > 0) {
      const price = parseFloat(t.price) || 0;
      const inRange = advFilters.priceRanges.some((r) => {
        if (r === "0-2000") return price < 2000;
        if (r === "2000-5000") return price >= 2000 && price < 5000;
        if (r === "5000-10000") return price >= 5000 && price < 10000;
        if (r === "10000+") return price >= 10000;
        return false;
      });
      if (!inRange) return false;
    }

    if (advFilters.durations.length > 0) {
      const start = new Date(t.startDate);
      const end = new Date(t.endDate || t.startDate);
      const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
      const inDur = advFilters.durations.some((d) => {
        if (d === "1") return days === 1;
        if (d === "2") return days === 2;
        if (d === "3") return days >= 3 && days <= 4;
        if (d === "5") return days >= 5 && days <= 7;
        if (d === "8") return days >= 8;
        return false;
      });
      if (!inDur) return false;
    }

    return true;
  });

  const sortFn = (a, b) => {
    const s = advFilters.sortBy;
    if (s === "price_asc")
      return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
    if (s === "price_desc")
      return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
    if (s === "date_desc") return new Date(b.startDate) - new Date(a.startDate);
    if (s === "popular")
      return (
        (b.totalSeats - b.availableSeats || 0) -
        (a.totalSeats - a.availableSeats || 0)
      );
    // date_asc (default)
    return new Date(a.startDate) - new Date(b.startDate);
  };
  filtered.sort(sortFn);

  const activeFilterCount =
    advFilters.types.length +
    advFilters.priceRanges.length +
    advFilters.durations.length +
    (advFilters.sortBy !== "date_asc" ? 1 : 0) +
    (advFilters.dateFrom ? 1 : 0) +
    (advFilters.dateTo ? 1 : 0);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      {/* Gradient header */}
      <LinearGradient colors={[colors.secondary, "#3D0D0C"]} style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.title}>Yatras</Text>
            <Text style={s.sub}>Find your perfect pilgrimage</Text>
          </View>
          {activeFilterCount > 0 && (
            <View style={s.filterCountBadge}>
              <Text style={s.filterCountTxt}>{activeFilterCount} Filters</Text>
            </View>
          )}
        </View>
        {/* Search bar inside header */}
        <View style={s.searchRow}>
          <View style={s.searchBarWrap}>
            <SmartSearchBar
              value={q}
              onChangeText={setQ}
              onSubmit={(text) => setQ(text)}
              onClear={() => setQ("")}
              placeholder="Search destination, tour..."
              style={s.searchBarInner}
            />
          </View>
          <TouchableOpacity
            style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeFilterCount > 0 ? "white" : "rgba(255,255,255,0.8)"}
            />
            {activeFilterCount > 0 && (
              <View style={s.filterDot} />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FilterSheet
        visible={showFilters}
        filters={advFilters}
        onApply={(f) => setAdvFilters(f)}
        onClose={() => setShowFilters(false)}
      />

      {/* Operator filter — shown when user follows multiple operators OR super_admin */}
      {showOpFilter && (
        <View style={[s.opRow, { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }]}>
          <Ionicons
            name="business-outline"
            size={13}
            color={colors.textSecondary}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <TouchableOpacity
              style={[s.opChip, opFilter === "all" && s.opChipActive]}
              onPress={() => setOpFilter("all")}
            >
              <Text
                style={[s.opChipTxt, opFilter === "all" && s.opChipTxtActive]}
              >
                All
              </Text>
            </TouchableOpacity>
            {filterOps.map((op) => (
              <TouchableOpacity
                key={op._id}
                style={[
                  s.opChip,
                  opFilter === String(op._id) && s.opChipActive,
                ]}
                onPress={() => setOpFilter(String(op._id))}
              >
                <Text
                  style={[
                    s.opChipTxt,
                    opFilter === String(op._id) && s.opChipTxtActive,
                  ]}
                  numberOfLines={1}
                >
                  {op.businessName || op.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {authChecked && isLoggedIn && isVolunteer ? (
        volunteerLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
        ) : assignedTours.length === 0 ? (
          <View style={s.guest}>
            <View style={s.guestIcon}>
              <Ionicons name="bus-outline" size={40} color={colors.primary} />
            </View>
            <Text style={s.guestTitle}>No Assigned Tours</Text>
            <Text style={s.guestSub}>You have not been assigned to any tours yet. Contact your admin.</Text>
          </View>
        ) : (
          <FlatList
            data={assignedTours}
            keyExtractor={(t) => String(t._id)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 }}
            ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
            renderItem={({ item }) => (
              <View style={[s.volCard, shadow.card]}>
                <View style={s.volCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.volCardTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={s.row}>
                      <Ionicons name="location" size={12} color={colors.primary} />
                      <Text style={s.volCardMeta}>{item.source} → {item.destination}</Text>
                    </View>
                    <View style={s.row}>
                      <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                      <Text style={s.volCardDate}>
                        {item.startDate ? new Date(item.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </Text>
                    </View>
                  </View>
                  <View style={s.volBadge}>
                    <Ionicons name="shield-checkmark" size={13} color="#16A34A" />
                    <Text style={s.volBadgeTxt}>Assigned</Text>
                  </View>
                </View>
                <View style={s.volActions}>
                  <TouchableOpacity
                    style={[s.volBtn, { backgroundColor: "#DCFCE7" }]}
                    onPress={() => router.push("/volunteer/checkin?tourId=" + item._id)}
                  >
                    <Ionicons name="location" size={15} color="#16A34A" />
                    <Text style={[s.volBtnTxt, { color: "#16A34A" }]}>Check In</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.volBtn, { backgroundColor: "#EDE9FE" }]}
                    onPress={() => router.push("/volunteer/checkin?tourId=" + item._id)}
                  >
                    <Ionicons name="qr-code" size={15} color="#7C3AED" />
                    <Text style={[s.volBtnTxt, { color: "#7C3AED" }]}>Scan QR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.volBtn, { backgroundColor: "#DBEAFE" }]}
                    onPress={() => router.push("/volunteer/passengers?tourId=" + item._id)}
                  >
                    <Ionicons name="people" size={15} color="#2563EB" />
                    <Text style={[s.volBtnTxt, { color: "#2563EB" }]}>Passengers</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )
      ) : authChecked && !isLoggedIn ? (
        <View style={s.guest}>
          <View style={s.guestIcon}>
            <Ionicons name="bus" size={40} color={colors.primary} />
          </View>
          <Text style={s.guestTitle}>Explore Sacred Yatras</Text>
          <Text style={s.guestSub}>
            Sign in to browse tours, check seat availability and book your
            pilgrimage.
          </Text>
          <TouchableOpacity
            style={s.guestLoginBtn}
            onPress={() => router.push("/auth/login")}
          >
            <Ionicons name="log-in-outline" size={18} color="#fff" />
            <Text style={s.guestLoginTxt}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.guestRegBtn}
            onPress={() => router.push("/auth/register")}
          >
            <Text style={s.guestRegTxt}>Create Account</Text>
          </TouchableOpacity>
        </View>
      ) : authChecked &&
        isLoggedIn &&
        !isOperator &&
        userJoinedOps.length === 0 ? (
        <View style={s.guest}>
          <View style={s.guestIcon}>
            <Ionicons name="people-outline" size={40} color={colors.primary} />
          </View>
          <Text style={s.guestTitle}>Select a Bus Operator</Text>
          <Text style={s.guestSub}>
            Choose your preferred bus operator to browse their exclusive
            pilgrimage tours.
          </Text>
          <TouchableOpacity
            style={s.guestLoginBtn}
            onPress={() => router.push("/select-operators")}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={s.guestLoginTxt}>Select Operator</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={{ padding: 16, gap: 16 }}>
          {[1, 2, 3].map((k) => <TourCardSkeleton key={k} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => String(item._id || item.id || i)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 32,
            paddingTop: 12,
            gap: 16,
            maxWidth: 680,
            alignSelf: "center",
            width: "100%",
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={() => (
            <View style={s.empty}>
              <Ionicons
                name="bus-outline"
                size={48}
                color={colors.textDisabled}
              />
              <Text style={s.emptyText}>No tours match your filter</Text>
              {(typeFilter !== "all" ||
                opFilter !== "all" ||
                advFilters.dateFrom ||
                advFilters.dateTo ||
                advFilters.types.length > 0 ||
                advFilters.priceRanges.length > 0 ||
                advFilters.durations.length > 0 ||
                advFilters.sortBy !== "date_asc") && (
                <TouchableOpacity
                  onPress={() => {
                    setTypeFilter("all");
                    setOpFilter("all");
                    setAdvFilters(DEFAULT_FILTERS);
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodyBold,
                      fontSize: 13,
                      color: colors.primary,
                      marginTop: 8,
                    }}
                  >
                    Clear filters
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          renderItem={({ item }) => {
            const opName =
              typeof item.operatorId === "object"
                ? item.operatorId?.businessName || item.operatorId?.name
                : null;
            const seatsLeft = item.availableSeats != null ? item.availableSeats : null;
            const seatsTotal = item.totalSeats || null;
            const seatsPercent = seatsLeft != null && seatsTotal ? (seatsLeft / seatsTotal) : null;
            return (
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => router.push(`/tour/${item._id || item.id}`)}
                style={s.card}
                testID={`tour-list-${item._id || item.id}`}
              >
                {/* Image with gradient */}
                <View style={s.cardImgWrap}>
                  <FallbackImage source={{ uri: item.coverPhotoUrl }} style={s.img} />
                  <LinearGradient
                    colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
                    style={StyleSheet.absoluteFillObject}
                  />
                  {/* Top badges */}
                  <View style={s.badgeRow}>
                    <View style={s.badge}>
                      <Ionicons name="calendar-outline" size={10} color={colors.secondary} />
                      <Text style={s.badgeText}>{fmt(item.startDate, item.endDate)}</Text>
                    </View>
                    {item.tourType && item.tourType !== "other" && (
                      <View style={[s.badge, s.typeBadge]}>
                        <Text style={[s.badgeText, { color: colors.primary }]}>
                          {item.tourType.charAt(0).toUpperCase() + item.tourType.slice(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                  {/* Fav button */}
                  {isLoggedIn && (
                    <TouchableOpacity
                      style={s.heartBtn}
                      onPress={(e) => { e.stopPropagation?.(); toggleFav(item._id); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={isFav(item._id) ? "heart" : "heart-outline"}
                        size={17}
                        color={isFav(item._id) ? "#EF4444" : "rgba(255,255,255,0.9)"}
                      />
                    </TouchableOpacity>
                  )}
                  {/* Seat pill on image */}
                  {seatsLeft != null && (
                    <View style={[s.seatBadge, seatsLeft < 5 && { backgroundColor: "#EF444490" }]}>
                      <Ionicons name="people" size={10} color="#fff" />
                      <Text style={s.seatBadgeTxt}>{seatsLeft} left</Text>
                    </View>
                  )}
                </View>

                {/* Info section */}
                <View style={s.cardInfo}>
                  <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={s.routeRow}>
                    <Ionicons name="location" size={12} color={colors.primary} />
                    <Text style={s.routeTxt} numberOfLines={1}>{item.source} → {item.destination}</Text>
                  </View>
                  {opName && (
                    <View style={s.routeRow}>
                      <Ionicons name="business-outline" size={11} color={colors.textSecondary} />
                      <Text style={[s.routeTxt, { color: colors.textSecondary }]} numberOfLines={1}>{opName}</Text>
                    </View>
                  )}
                  <View style={s.cardFooter}>
                    <View>
                      <Text style={s.priceLabel}>Per Person</Text>
                      <Text style={s.price}>{item.price || "₹—"}</Text>
                    </View>
                    <View style={s.pill}>
                      <Text style={s.pillText}>Book Now</Text>
                      <Ionicons name="arrow-forward" size={11} color="#fff" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  // New gradient header
  header: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    zIndex: 100,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  filterCountBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  filterCountTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#fff" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 200,
  },
  searchBarWrap: {
    flex: 1,
    zIndex: 200,
  },
  searchBarInner: {
    borderRadius: radius.lg,
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FCD34D",
  },
  heartBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  seatBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(22,163,74,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  seatBadgeTxt: { fontFamily: fonts.bodyBold, fontSize: 10, color: "#fff" },

  opRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  opChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginRight: 6,
  },
  opChipActive: {
    backgroundColor: colors.secondary + "18",
    borderColor: colors.secondary,
  },
  opChipTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
    maxWidth: 110,
  },
  opChipTxtActive: { color: colors.secondary, fontFamily: fonts.bodyBold },

  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 6,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  typeTextActive: { color: "#fff" },

  // Modern tour card
  card: {
    borderRadius: radius.xxl,
    overflow: "hidden",
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  cardImgWrap: {
    height: 190,
    position: "relative",
  },
  img: { width: "100%", height: "100%" },
  badgeRow: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  typeBadge: { backgroundColor: "rgba(255,255,255,0.92)" },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.secondary,
  },
  // Card info section (white/surface)
  cardInfo: {
    padding: 14,
    gap: 4,
  },
  cardTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  routeTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, flex: 1 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  priceLabel: { fontFamily: fonts.accent, fontSize: 9, color: colors.textSecondary, letterSpacing: 1.5, marginBottom: 2 },
  price: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 18 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  pillText: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 12 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },

  guest: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
    gap: 0,
  },
  guestIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  guestTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.secondary,
    textAlign: "center",
    marginBottom: 8,
  },
  guestSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  guestLoginBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    justifyContent: "center",
    marginBottom: 12,
  },
  guestLoginTxt: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 15 },
  guestRegBtn: {
    width: "100%",
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  guestRegTxt: {
    color: colors.secondary,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },

  // Volunteer assigned tour cards
  volCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  volCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  volCardTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  volCardMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, flex: 1 },
  volCardDate: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary, flex: 1 },
  volBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  volBadgeTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#16A34A" },
  volActions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  volBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: radius.lg,
  },
  volBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
});
