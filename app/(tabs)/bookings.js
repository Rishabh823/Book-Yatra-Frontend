import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import { useTheme } from "../../lib/ThemeContext";
import {
  bookings as bookingsApi,
  auth as authApi,
  volunteerApi,
} from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { BookingCardSkeleton } from "../../components/SkeletonCard";

const STATUS_CFG = {
  confirmed: {
    color: "#16A34A",
    bg: "#F0FDF4",
    icon: "checkmark-circle",
    label: "Confirmed",
  },
  paid: { color: "#16A34A", bg: "#F0FDF4", icon: "card", label: "Paid" },
  pending: { color: "#D97706", bg: "#FFFBEB", icon: "time", label: "Pending" },
  cancelled: {
    color: "#DC2626",
    bg: "#FEF2F2",
    icon: "close-circle",
    label: "Cancelled",
  },
  checked_in: {
    color: "#0284C7",
    bg: "#EFF6FF",
    icon: "scan",
    label: "Checked In",
  },
};

function fmt(d) {
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function Bookings() {
  const router = useRouter();
  useLang();
  const { theme } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authed, setAuthed] = useState(true);
  const [role, setRole] = useState("user");
  const [volTours, setVolTours] = useState([]);
  const [tourFilter, setTourFilter] = useState("all");

  const load = async () => {
    const ok = await authApi.isAuthenticated();
    setAuthed(ok);
    if (!ok) {
      setLoading(false);
      return;
    }
    const r = await authApi.getRole();
    setRole(r || "user");
    try {
      if (r === "volunteer") {
        const res = await volunteerApi
          .assignedBookings()
          .catch(() => ({ data: [], tours: [] }));
        setItems(Array.isArray(res.data) ? res.data : []);
        setVolTours(Array.isArray(res.tours) ? res.tours : []);
      } else {
        const data = await bookingsApi.my().catch(() => []);
        setItems(
          Array.isArray(data) ? data : data?.data || data?.bookings || [],
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const isVolunteer = role === "volunteer";

  // For volunteers, filter by selected tour
  const displayItems =
    isVolunteer && tourFilter !== "all"
      ? items.filter((i) => String(i.tourId?._id || i.tourId) === tourFilter)
      : items;

  // Stats
  const confirmedCount = displayItems.filter((i) =>
    ["confirmed", "paid"].includes((i.status || "").toLowerCase()),
  ).length;
  const pendingCount = displayItems.filter(
    (i) => (i.status || "pending").toLowerCase() === "pending",
  ).length;

  // ── Auth gate ────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.bg }}
        edges={["top"]}
      >
        {/* Clean white header */}
        <View style={s.headerClean}>
          <Text style={s.headerTitle}>My Bookings</Text>
          <Text style={s.headerSub}>
            Your sacred journeys, all in one place
          </Text>
        </View>
        <View style={s.gateBody}>
          <View style={s.gateIconWrap}>
            <Ionicons name="ticket-outline" size={36} color={colors.primary} />
          </View>
          <Text style={s.gateTitle}>See your bookings</Text>
          <Text style={s.gateSub}>
            Login to view all your tour bookings and travel history.
          </Text>
          <TouchableOpacity
            style={s.loginBtn}
            onPress={() => router.push("/auth/login")}
            testID="bookings-login-btn"
          >
            <Ionicons name="log-in-outline" size={18} color="#fff" />
            <Text style={s.loginBtnText}>Login / Register</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top"]}
    >
      {/* Clean white header */}
      <View style={s.headerClean}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>
              {isVolunteer ? "Passenger Bookings" : "My Bookings"}
            </Text>
            <Text style={s.headerSub}>
              {isVolunteer
                ? "Passengers on your assigned tours"
                : "Your sacred journey records"}
            </Text>
          </View>
          <View style={s.countBadge}>
            <Text style={s.countBadgeNum}>{displayItems.length}</Text>
            <Text style={s.countBadgeLabel}>Total</Text>
          </View>
        </View>

        {/* Stats chips */}
        {displayItems.length > 0 && (
          <View style={s.statsRow}>
            <StatPill
              icon="checkmark-circle"
              label="Confirmed"
              value={confirmedCount}
              color="#16A34A"
              bg="#F0FDF4"
            />
            <StatPill
              icon="time"
              label="Pending"
              value={pendingCount}
              color="#D97706"
              bg="#FFFBEB"
            />
            <StatPill
              icon="ticket"
              label="All"
              value={displayItems.length}
              color={colors.primary}
              bg={colors.primaryLight}
            />
          </View>
        )}
      </View>

      {/* Tour filter chips for volunteers */}
      {isVolunteer && volTours.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 46 }}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            gap: 8,
            flexDirection: "row",
          }}
        >
          <TouchableOpacity
            style={[s.tourChip, tourFilter === "all" && s.tourChipActive]}
            onPress={() => setTourFilter("all")}
          >
            <Text
              style={[
                s.tourChipTxt,
                tourFilter === "all" && s.tourChipTxtActive,
              ]}
            >
              All Tours
            </Text>
          </TouchableOpacity>
          {volTours.map((t) => (
            <TouchableOpacity
              key={String(t._id)}
              style={[
                s.tourChip,
                tourFilter === String(t._id) && s.tourChipActive,
              ]}
              onPress={() => setTourFilter(String(t._id))}
            >
              <Text
                style={[
                  s.tourChipTxt,
                  tourFilter === String(t._id) && s.tourChipTxtActive,
                ]}
                numberOfLines={1}
              >
                {t.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={{ padding: 16, gap: 14 }}>
          {[1, 2, 3].map((k) => (
            <BookingCardSkeleton key={k} />
          ))}
        </View>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(it, i) => String(it._id || it.id || i)}
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingTop: 18,
            paddingBottom: 36,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={() => (
            <View style={s.empty}>
              <View style={s.emptyIconBg}>
                <Ionicons
                  name="ticket-outline"
                  size={40}
                  color={colors.primary}
                />
              </View>
              <Text style={s.emptyTitle}>No Bookings Yet</Text>
              <Text style={s.emptySub}>
                Your journey begins with a single booking.
              </Text>
              <TouchableOpacity
                style={s.cta}
                onPress={() => router.push("/(tabs)/tours")}
                testID="empty-explore-btn"
              >
                <Ionicons name="search" size={16} color="#fff" />
                <Text style={s.ctaText}>Explore Tours</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item }) => (
            <BookingCard
              item={item}
              router={router}
              isVolunteer={isVolunteer}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function StatPill({ icon, label, value, color, bg }) {
  return (
    <View style={[s.statPill, bg ? { backgroundColor: bg } : null]}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={[s.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

function BookingCard({ item, router, isVolunteer }) {
  const { theme } = useTheme();
  const status = (item.status || "pending").toLowerCase();
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  const seats = item.numberOfSeats || item.seats || 1;
  const amount = item.totalAmount || item.amount;
  const bookId = String(item._id || item.id || "")
    .slice(-8)
    .toUpperCase();
  const source = item.source || item.tourId?.source || item.tour?.source || "";
  const dest =
    item.destination ||
    item.tourId?.destination ||
    item.tour?.destination ||
    "";
  const date = fmt(
    item.tourStartDate ||
      item.tripDate ||
      item.tourId?.startDate ||
      item.tour?.startDate,
  );
  const passengerName = isVolunteer ? item.userId?.name || "Guest" : null;
  const tourName = isVolunteer
    ? item.tourId?.title || item.tourTitle || ""
    : null;
  const displayTitle =
    isVolunteer && passengerName
      ? passengerName
      : item.tourTitle || item.tour?.title || "Yatra Booking";

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: theme.surface }]}
      activeOpacity={0.93}
      onPress={() => router.push(`/booking/${item._id || item.id}`)}
      testID={`booking-${item._id || item.id}`}
    >
      {/* Colored left border strip */}
      <View style={[s.cardLeftBorder, { backgroundColor: cfg.color }]} />

      <View style={s.cardInner}>
        {/* Card header: bus icon + title + status badge */}
        <View style={s.cardHeader}>
          <View style={[s.busIconWrap, { backgroundColor: cfg.bg }]}>
            <Ionicons name="bus-outline" size={20} color={cfg.color} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.cardTitle} numberOfLines={1}>
              {displayTitle}
            </Text>
            {isVolunteer && tourName ? (
              <Text style={s.cardSubTitle} numberOfLines={1}>
                {tourName}
              </Text>
            ) : null}
            <Text style={s.bookingIdTxt}>#{bookId}</Text>
          </View>
          <View
            style={[
              s.statusBadge,
              { backgroundColor: cfg.bg, borderColor: cfg.color + "44" },
            ]}
          >
            <Ionicons name={cfg.icon} size={11} color={cfg.color} />
            <Text style={[s.statusBadgeTxt, { color: cfg.color }]}>
              {cfg.label}
            </Text>
          </View>
        </View>

        {/* Route: FROM → TO prominently */}
        {(source || dest) && (
          <View style={s.routeBar}>
            <View style={s.routeEndpoint}>
              <Text style={s.routeEndpointLabel}>FROM</Text>
              <Text style={s.routeEndpointCity} numberOfLines={1}>
                {source || "—"}
              </Text>
            </View>
            <View style={s.routeArrowWrap}>
              <View style={s.routeArrowLine} />
              <Ionicons name="bus" size={16} color={colors.primary} />
              <View style={s.routeArrowLine} />
            </View>
            <View style={[s.routeEndpoint, { alignItems: "flex-end" }]}>
              <Text style={s.routeEndpointLabel}>TO</Text>
              <Text
                style={[s.routeEndpointCity, { color: colors.primary }]}
                numberOfLines={1}
              >
                {dest || "—"}
              </Text>
            </View>
          </View>
        )}

        {/* Divider */}
        <View style={[s.divider, { borderColor: colors.borderSubtle }]} />

        {/* Footer: info chips + amount + view details */}
        <View style={s.cardFooter}>
          <View style={{ gap: 6 }}>
            {/* Date + Seats chips */}
            <View style={{ flexDirection: "row", gap: 6 }}>
              {date ? (
                <View style={s.infoChip}>
                  <Ionicons
                    name="calendar-outline"
                    size={11}
                    color={colors.textSecondary}
                  />
                  <Text style={s.infoChipTxt}>{date}</Text>
                </View>
              ) : null}
              <View style={s.infoChip}>
                <Ionicons
                  name="people-outline"
                  size={11}
                  color={colors.textSecondary}
                />
                <Text style={s.infoChipTxt}>
                  {seats} seat{seats > 1 ? "s" : ""}
                </Text>
              </View>
            </View>
            {/* Amount */}
            <Text style={s.amountTxt}>{amount ? `₹${amount}` : "—"}</Text>
          </View>

          <View style={{ alignItems: "flex-end", gap: 6 }}>
            {!isVolunteer && status === "pending" && (
              <View style={s.payPendingBadge}>
                <Ionicons name="time-outline" size={11} color="#D97706" />
                <Text style={s.payPendingTxt}>Payment Pending</Text>
              </View>
            )}
            <TouchableOpacity
              style={s.viewBtn}
              onPress={() => router.push(`/booking/${item._id || item.id}`)}
            >
              <Text style={s.viewBtnTxt}>View Details</Text>
              <Ionicons name="arrow-forward" size={13} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  // ── Clean white header (replaces dark gradient hero) ──────────────────────
  headerClean: {
    backgroundColor: colors.surface,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    ...shadow.soft,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.secondary,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  countBadge: {
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 56,
  },
  countBadgeNum: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.primary,
  },
  countBadgeLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.primary,
    marginTop: 1,
  },

  // Stats chips row
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 13 },
  statLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },

  // Auth gate body (below clean header)
  gateBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 10,
  },
  gateIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  gateTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.secondary,
    textAlign: "center",
    marginTop: 8,
  },
  gateSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  loginBtnText: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 14 },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  empty: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.secondary,
    marginTop: 4,
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  ctaText: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 14 },

  // ── Booking Card ───────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: "hidden",
    flexDirection: "row",
    ...shadow.card,
  },
  cardLeftBorder: {
    width: 4,
    borderTopLeftRadius: radius.xl,
    borderBottomLeftRadius: radius.xl,
  },
  cardInner: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },

  // Card header
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  busIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.secondary,
  },
  cardSubTitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  bookingIdTxt: {
    fontFamily: fonts.accent,
    fontSize: 9,
    color: colors.textDisabled,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginLeft: 6,
  },
  statusBadgeTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.3,
  },

  // Route bar
  routeBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  routeEndpoint: { flex: 1 },
  routeEndpointLabel: {
    fontFamily: fonts.accent,
    fontSize: 8,
    color: colors.textDisabled,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  routeEndpointCity: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.secondary,
  },
  routeArrowWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginHorizontal: 8,
  },
  routeArrowLine: {
    flex: 1,
    width: 18,
    height: 1,
    backgroundColor: colors.borderStrong,
  },

  // Divider
  divider: {
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderSubtle,
    marginBottom: 12,
  },

  // Footer
  cardFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  infoChipTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  amountTxt: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.primary,
    marginTop: 2,
  },
  payPendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  payPendingTxt: { fontFamily: fonts.bodyBold, fontSize: 10, color: "#D97706" },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  viewBtnTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: "#fff",
  },

  // Tour filter chips (volunteer)
  tourChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  tourChipActive: {
    backgroundColor: colors.secondary + "18",
    borderColor: colors.secondary,
  },
  tourChipTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
    maxWidth: 120,
  },
  tourChipTxtActive: { color: colors.secondary, fontFamily: fonts.bodyBold },
});
