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
import { LinearGradient } from "expo-linear-gradient";
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
        <LinearGradient
          colors={[colors.secondary, "#3D0D0C"]}
          style={s.heroGate}
        >
          <Ionicons name="ticket-outline" size={44} color="rgba(255,233,192,0.9)" style={{ marginBottom: 6 }} />
          <Text style={s.heroTitle}>My Bookings</Text>
          <Text style={s.heroSub}>Your sacred journeys, all in one place</Text>
        </LinearGradient>
        <View style={s.gateBody}>
          <View style={s.gateIconWrap}>
            <Ionicons name="ticket-outline" size={36} color={colors.primary} />
          </View>
          <Text style={s.gateTitle}>See your bookings</Text>
          <Text style={s.gateSub}>
            Login to view all your yatra bookings and travel history.
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
      {/* Hero header */}
      <LinearGradient colors={[colors.secondary, "#3D0D0C"]} style={s.hero}>
        <View style={s.heroContent}>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>
              {isVolunteer ? "Passenger Bookings" : "My Bookings"}
            </Text>
            <Text style={s.heroSub}>
              {isVolunteer
                ? "Passengers on your assigned tours"
                : "Your sacred journey records"}
            </Text>
          </View>
          <View style={s.heroBadge}>
            <Text style={s.heroBadgeTxt}>{displayItems.length}</Text>
            <Text style={s.heroBadgeLabel}>Total</Text>
          </View>
        </View>

        {/* Stats strip */}
        {displayItems.length > 0 && (
          <View style={s.statsStrip}>
            <StatPill
              icon="checkmark-circle"
              label="Confirmed"
              value={confirmedCount}
              color="#4ADE80"
            />
            <View style={s.statsDiv} />
            <StatPill
              icon="time"
              label="Pending"
              value={pendingCount}
              color="#FCD34D"
            />
            <View style={s.statsDiv} />
            <StatPill
              icon="ticket"
              label="All"
              value={displayItems.length}
              color="#fff"
            />
          </View>
        )}
      </LinearGradient>

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
              <LinearGradient
                colors={["#FFF4EC", colors.primaryLight]}
                style={s.emptyIconBg}
              >
                <Ionicons
                  name="ticket-outline"
                  size={40}
                  color={colors.primary}
                />
              </LinearGradient>
              <Text style={s.emptyTitle}>No Bookings Yet</Text>
              <Text style={s.emptySub}>
                Your yatra journey begins with a single booking.
              </Text>
              <TouchableOpacity
                style={s.cta}
                onPress={() => router.push("/(tabs)/tours")}
                testID="empty-explore-btn"
              >
                <Ionicons name="search" size={16} color="#fff" />
                <Text style={s.ctaText}>Explore Yatras</Text>
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

function StatPill({ icon, label, value, color }) {
  return (
    <View style={s.statPill}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
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

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: theme.surface }]}
      activeOpacity={0.93}
      onPress={() => router.push(`/booking/${item._id || item.id}`)}
      testID={`booking-${item._id || item.id}`}
    >
      {/* Ticket header strip */}
      <View style={[s.cardStrip, { backgroundColor: cfg.bg }]}>
        <View style={s.cardStripLeft}>
          <View style={[s.statusIcon, { backgroundColor: cfg.color + "22" }]}>
            <Ionicons name={cfg.icon} size={16} color={cfg.color} />
          </View>
          <View>
            <Text style={[s.statusLabel, { color: cfg.color }]}>
              {cfg.label}
            </Text>
            <Text style={[s.bookingId, { color: theme.textSecondary }]}>
              #{bookId}
            </Text>
          </View>
        </View>
        <View style={[s.statusBadge, { backgroundColor: cfg.color }]}>
          <Text style={s.statusBadgeTxt}>{cfg.label.toUpperCase()}</Text>
        </View>
      </View>

      {/* Tour title / Passenger name */}
      <View style={s.cardBody}>
        {isVolunteer && passengerName ? (
          <>
            <Text
              style={[s.tourTitle, { color: theme.secondary }]}
              numberOfLines={1}
            >
              {passengerName}
            </Text>
            {tourName ? (
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginBottom: 6,
                }}
                numberOfLines={1}
              >
                {tourName}
              </Text>
            ) : null}
          </>
        ) : (
          <Text
            style={[s.tourTitle, { color: theme.secondary }]}
            numberOfLines={1}
          >
            {item.tourTitle || item.tour?.title || "Yatra Booking"}
          </Text>
        )}

        {/* Route */}
        {(source || dest) && (
          <View style={s.routeRow}>
            <View
              style={[s.routeChip, { backgroundColor: theme.borderSubtle }]}
            >
              <Text
                style={[s.routeChipTxt, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {source || "—"}
              </Text>
            </View>
            <Ionicons
              name="arrow-forward"
              size={12}
              color={colors.textDisabled}
            />
            <View
              style={[s.routeChip, { backgroundColor: colors.primaryLight }]}
            >
              <Text
                style={[s.routeChipTxt, { color: colors.primary }]}
                numberOfLines={1}
              >
                {dest || "—"}
              </Text>
            </View>
          </View>
        )}

        {/* Details row */}
        <View style={s.detailsRow}>
          {date ? (
            <View style={s.detailChip}>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={colors.primary}
              />
              <Text style={s.detailChipTxt}>{date}</Text>
            </View>
          ) : null}
          <View style={s.detailChip}>
            <Ionicons name="people-outline" size={12} color={colors.primary} />
            <Text style={s.detailChipTxt}>
              {seats} seat{seats > 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      </View>

      {/* Ticket tear line */}
      <View style={s.tearWrap}>
        <View style={[s.tearCircleL, { backgroundColor: theme.bg }]} />
        <View style={[s.tearLine, { borderColor: theme.borderSubtle }]} />
        <View style={[s.tearCircleR, { backgroundColor: theme.bg }]} />
      </View>

      {/* Card footer */}
      <View style={s.cardFooter}>
        <View>
          <Text style={s.priceLabel}>Amount</Text>
          <Text style={s.price}>{amount ? `₹${amount}` : "—"}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {!isVolunteer && status === "pending" && (
            <View style={s.payPendingBadge}>
              <Ionicons name="time-outline" size={11} color="#D97706" />
              <Text style={s.payPendingTxt}>Payment Pending</Text>
            </View>
          )}
          <View style={s.viewBtn}>
            <Text style={s.viewBtnTxt}>View</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  hero: { paddingTop: 14, paddingHorizontal: 20, paddingBottom: 18 },
  heroContent: { flexDirection: "row", alignItems: "center" },
  heroTitle: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: "#fff",
    letterSpacing: -0.3,
  },
  heroSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "#FFE9C0",
    marginTop: 2,
  },
  heroBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: radius.lg,
    padding: 12,
    minWidth: 60,
  },
  heroBadgeTxt: { fontFamily: fonts.heading, fontSize: 28, color: "#fff" },
  heroBadgeLabel: {
    fontFamily: fonts.accent,
    fontSize: 9,
    color: "#FFE9C0",
    letterSpacing: 1.5,
    marginTop: 2,
  },

  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.xl,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  statPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 15 },
  statLabel: {
    fontFamily: fonts.accent,
    fontSize: 9,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1,
  },
  statsDiv: { width: 1, height: 24, backgroundColor: "rgba(255,255,255,0.15)" },

  heroGate: { paddingTop: 40, paddingBottom: 32, alignItems: "center" },
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

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    overflow: "hidden",
    ...shadow.card,
  },
  cardStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardStripLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  statusLabel: { fontFamily: fonts.bodyBold, fontSize: 12 },
  bookingId: {
    fontFamily: fonts.accent,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusBadgeTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: "#fff",
    letterSpacing: 1,
  },

  cardBody: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  tourTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.secondary,
    marginBottom: 10,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  routeChip: {
    flex: 1,
    backgroundColor: colors.borderSubtle,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  routeChipTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },

  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 4,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  detailChipTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.primary,
  },

  tearWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    paddingHorizontal: 0,
  },
  tearCircleL: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.bg,
    marginLeft: -7,
  },
  tearCircleR: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.bg,
    marginRight: -7,
  },
  tearLine: {
    flex: 1,
    borderBottomWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderStyle: "dashed",
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  priceLabel: {
    fontFamily: fonts.accent,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginBottom: 2,
  },
  price: { fontFamily: fonts.heading, fontSize: 22, color: colors.primary },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
  },
  viewBtnTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.primary,
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
