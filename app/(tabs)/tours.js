import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { DateInput } from "../../components/DateInput";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import { tours as toursApi, auth as authApi } from "../../lib/api";
import SmartSearchBar from "../../components/SmartSearchBar";
import FilterSheet, { DEFAULT_FILTERS } from "../../components/FilterSheet";
import { useFavorites } from "../../lib/hooks/useFavorites";

const FALLBACK =
  "https://images.pexels.com/photos/11398067/pexels-photo-11398067.jpeg";

const TOUR_TYPES = [
  { k: "all", label: "All", icon: "apps-outline" },
  { k: "temple", label: "Temple", icon: "business-outline" },
  { k: "pilgrimage", label: "Pilgrimage", icon: "walk-outline" },
  { k: "mountain", label: "Mountain", icon: "triangle-outline" },
  { k: "leisure", label: "Leisure", icon: "sunny-outline" },
  { k: "heritage", label: "Heritage", icon: "library-outline" },
  { k: "beach", label: "Beach", icon: "water-outline" },
  { k: "other", label: "Other", icon: "ellipsis-horizontal-outline" },
];

export default function Tours() {
  const router = useRouter();
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [opFilter, setOpFilter] = useState("all");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("user");
  const [userJoinedOps, setUserJoinedOps] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [advFilters, setAdvFilters] = useState(DEFAULT_FILTERS);

  const { isFav, toggle: toggleFav } = useFavorites();

  const isOperator =
    role === "admin" || role === "super_admin" || role === "manager";
  const isSuperAdmin = role === "super_admin";

  const loadUserData = useCallback(async () => {
    const loggedIn = await authApi.isAuthenticated();
    setIsLoggedIn(loggedIn);
    setAuthChecked(true);
    if (!loggedIn) return;
    const r = await authApi.getRole();
    setRole(r || "user");
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
    if (dateFrom) {
      const from = new Date(dateFrom + "T00:00:00");
      if (new Date(t.startDate) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59");
      if (new Date(t.startDate) > to) return false;
    }
    // Hide past tours for regular users when no date filter active
    if (!isOperator && !dateFrom && !dateTo) {
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
    if (s === "price_asc") return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
    if (s === "price_desc") return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
    if (s === "date_desc") return new Date(b.startDate) - new Date(a.startDate);
    if (s === "popular") return (b.totalSeats - b.availableSeats || 0) - (a.totalSeats - a.availableSeats || 0);
    // date_asc (default)
    return new Date(a.startDate) - new Date(b.startDate);
  };
  filtered.sort(sortFn);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      <View style={s.header}>
        <Text style={s.title}>Yatras</Text>
        <Text style={s.sub}>Find your perfect journey</Text>
      </View>

      {/* Smart Search + Filter button */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 8,
          marginHorizontal: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <SmartSearchBar
            value={q}
            onChangeText={setQ}
            onSubmit={(text) => setQ(text)}
            onClear={() => setQ("")}
            placeholder="Search destination, tour..."
          />
        </View>
        <TouchableOpacity
          style={[
            s.filterBtn,
            advFilters.types.length +
              advFilters.priceRanges.length +
              advFilters.durations.length +
              (advFilters.sortBy !== "date_asc" ? 1 : 0) >
              0 && s.filterBtnActive,
          ]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons
            name="options"
            size={20}
            color={
              advFilters.types.length +
                advFilters.priceRanges.length +
                advFilters.durations.length +
                (advFilters.sortBy !== "date_asc" ? 1 : 0) >
              0
                ? "white"
                : colors.textSecondary
            }
          />
        </TouchableOpacity>
      </View>
      <FilterSheet
        visible={showFilters}
        filters={advFilters}
        onApply={(f) => setAdvFilters(f)}
        onClose={() => setShowFilters(false)}
      />

      {/* Date range filter — all logged-in users */}
      {isLoggedIn && (
        <View style={s.dateRow}>
          <DateInput
            label="From"
            value={dateFrom}
            onChange={setDateFrom}
            style={{ flex: 1 }}
          />
          <Ionicons
            name="arrow-forward"
            size={14}
            color={colors.textDisabled}
          />
          <DateInput
            label="To"
            value={dateTo}
            onChange={(v) => {
              setDateTo(v);
            }}
            minDate={dateFrom ? new Date(dateFrom + "T12:00:00") : undefined}
            style={{ flex: 1 }}
          />
          {(dateFrom || dateTo) && (
            <TouchableOpacity
              onPress={() => {
                setDateFrom("");
                setDateTo("");
              }}
              style={s.clearDateBtn}
            >
              <Ionicons
                name="close-circle"
                size={22}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Operator filter — shown when user follows multiple operators OR super_admin */}
      {showOpFilter && (
        <View style={s.opRow}>
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

      {/* Tour type chips */}
      <View style={s.typeRow}>
        {TOUR_TYPES.map((tt) => (
          <TouchableOpacity
            key={tt.k}
            style={[s.typeChip, typeFilter === tt.k && s.typeChipActive]}
            onPress={() => setTypeFilter(tt.k)}
            testID={`type-${tt.k}`}
          >
            <Ionicons
              name={tt.icon}
              size={12}
              color={typeFilter === tt.k ? "#fff" : colors.textSecondary}
            />
            <Text style={[s.typeText, typeFilter === tt.k && s.typeTextActive]}>
              {tt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {authChecked && !isLoggedIn ? (
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
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => String(item._id || item.id || i)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 24,
            paddingTop: 4,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
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
                dateFrom ||
                dateTo) && (
                <TouchableOpacity
                  onPress={() => {
                    setTypeFilter("all");
                    setOpFilter("all");
                    setDateFrom("");
                    setDateTo("");
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
            return (
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => router.push(`/tour/${item._id || item.id}`)}
                style={s.card}
                testID={`tour-list-${item._id || item.id}`}
              >
                <Image
                  source={{ uri: item.coverPhotoUrl || FALLBACK }}
                  style={s.img}
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.65)"]}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={s.badgeRow}>
                  <View style={s.badge}>
                    <Text style={s.badgeText}>
                      {fmt(item.startDate, item.endDate)}
                    </Text>
                  </View>
                  {item.tourType && item.tourType !== "other" && (
                    <View style={[s.badge, s.typeBadge]}>
                      <Text style={[s.badgeText, { color: colors.primary }]}>
                        {item.tourType.charAt(0).toUpperCase() +
                          item.tourType.slice(1)}
                      </Text>
                    </View>
                  )}
                </View>
                {isLoggedIn && (
                  <TouchableOpacity
                    style={s.heartBtn}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      toggleFav(item._id);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={isFav(item._id) ? "heart" : "heart-outline"}
                      size={18}
                      color={
                        isFav(item._id) ? "#EF4444" : "rgba(255,255,255,0.8)"
                      }
                    />
                  </TouchableOpacity>
                )}
                <View style={s.body}>
                  <Text style={s.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={s.row}>
                    <Ionicons name="location" size={12} color="#FFE9C0" />
                    <Text style={s.meta} numberOfLines={1}>
                      {item.source} → {item.destination}
                    </Text>
                  </View>
                  {opName && (
                    <View style={s.row}>
                      <Ionicons name="business" size={11} color="#FFE9C0" />
                      <Text style={s.meta} numberOfLines={1}>
                        {opName}
                      </Text>
                    </View>
                  )}
                  <View style={s.footer}>
                    <Text style={s.price}>{item.price || "₹—"}</Text>
                    <View style={s.pill}>
                      <Text style={s.pillText}>View Details</Text>
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
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.secondary,
    letterSpacing: -0.5,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },

  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
  search: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    height: 44,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 10,
  },
  clearDateBtn: { padding: 4 },

  opRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 8,
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

  card: {
    height: 248,
    borderRadius: radius.xxl,
    overflow: "hidden",
    backgroundColor: colors.elevated,
    ...shadow.card,
  },
  img: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  badgeRow: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  typeBadge: { backgroundColor: "rgba(255,255,255,0.9)" },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.secondary,
  },
  body: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 14 },
  cardTitle: {
    color: "#fff",
    fontFamily: fonts.heading,
    fontSize: 20,
    marginBottom: 3,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  meta: { color: "#FFE9C0", fontFamily: fonts.body, fontSize: 11, flex: 1 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  price: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 18 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  pillText: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 11 },
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
});
