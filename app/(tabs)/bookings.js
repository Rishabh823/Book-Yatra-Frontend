import { useState, useCallback, useRef, useMemo } from "react";
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
import { useRouter, useFocusEffect } from "expo-router";
import { fonts, radius, shadow } from "../../lib/theme";
import { colors as themeColors } from "../../lib/theme";
import { useTheme, useColors } from "../../lib/ThemeContext";
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
    bg: "#DCFCE7",
    icon: "checkmark-circle",
    label: "Confirmed",
    borderColor: "#16A34A",
  },
  paid: {
    color: "#16A34A",
    bg: "#DCFCE7",
    icon: "card",
    label: "Paid",
    borderColor: "#16A34A",
  },
  pending: {
    color: "#D97706",
    bg: "#FEF3C7",
    icon: "time",
    label: "Pending",
    borderColor: "#D97706",
  },
  cancelled: {
    color: "#DC2626",
    bg: "#FEE2E2",
    icon: "close-circle",
    label: "Cancelled",
    borderColor: "#DC2626",
  },
  checked_in: {
    color: "#0284C7",
    bg: "#DBEAFE",
    icon: "scan",
    label: "Checked In",
    borderColor: "#0284C7",
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
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authed, setAuthed] = useState(true);
  const [role, setRole] = useState("user");
  const [volTours, setVolTours] = useState([]);
  const [tourFilter, setTourFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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

  // Volunteer tour filter
  const tourFiltered =
    isVolunteer && tourFilter !== "all"
      ? items.filter((i) => String(i.tourId?._id || i.tourId) === tourFilter)
      : items;

  // Status filter
  const displayItems =
    statusFilter === "all"
      ? tourFiltered
      : statusFilter === "confirmed"
        ? tourFiltered.filter((i) =>
            ["confirmed", "paid", "checked_in"].includes(
              (i.status || "").toLowerCase(),
            ),
          )
        : tourFiltered.filter(
            (i) => (i.status || "pending").toLowerCase() === statusFilter,
          );

  const confirmedCount = tourFiltered.filter((i) =>
    ["confirmed", "paid", "checked_in"].includes(
      (i.status || "").toLowerCase(),
    ),
  ).length;
  const pendingCount = tourFiltered.filter(
    (i) => (i.status || "pending").toLowerCase() === "pending",
  ).length;
  const cancelledCount = tourFiltered.filter(
    (i) => (i.status || "").toLowerCase() === "cancelled",
  ).length;

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.bg }}
        edges={["top"]}
      >
        <View style={s.header}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.headerTitle}>My Bookings</Text>
              <Text style={s.headerSub}>Your sacred journey records</Text>
            </View>
          </View>
        </View>
        <View style={s.gateBody}>
          <View style={s.gateIconWrap}>
            <Ionicons name="ticket-outline" size={36} color="#D95D39" />
          </View>
          <Text style={s.gateTitle}>See your bookings</Text>
          <Text style={s.gateSub}>
            Login to view all your tour bookings and travel history.
          </Text>
          <TouchableOpacity
            style={s.loginBtn}
            onPress={() => router.push("/auth/login")}
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
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={s.header}>
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
            <Text style={s.countBadgeNum}>{tourFiltered.length}</Text>
            <Text style={s.countBadgeLabel}>Total</Text>
          </View>
        </View>

        {/* ── Filter tabs ─────────────────────────────────────────────────── */}
        {tourFiltered.length > 0 && (
          <View style={s.filterRow}>
            <TouchableOpacity
              style={[
                s.filterTab,
                statusFilter === "confirmed" && s.filterTabActive,
              ]}
              onPress={() =>
                setStatusFilter(
                  statusFilter === "confirmed" ? "all" : "confirmed",
                )
              }
            >
              <View style={[s.filterDot, { backgroundColor: "#16A34A" }]} />
              <Text
                style={[
                  s.filterTabTxt,
                  statusFilter === "confirmed" && s.filterTabTxtActive,
                ]}
              >
                {confirmedCount} confirmed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.filterTab,
                s.filterTabPending,
                statusFilter === "pending" && s.filterTabPendingActive,
              ]}
              onPress={() =>
                setStatusFilter(statusFilter === "pending" ? "all" : "pending")
              }
            >
              <View style={[s.filterDot, { backgroundColor: "#D97706" }]} />
              <Text
                style={[
                  s.filterTabTxt,
                  statusFilter === "pending" && s.filterTabTxtPendingActive,
                ]}
              >
                {pendingCount} pending
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.filterTab,
                s.filterTabAll,
                statusFilter === "all" && s.filterTabAllActive,
              ]}
              onPress={() => setStatusFilter("all")}
            >
              <Text
                style={[
                  s.filterTabTxt,
                  {
                    color: statusFilter === "all" ? "#fff" : colors.textPrimary,
                    fontFamily:
                      statusFilter === "all"
                        ? fonts.bodyBold
                        : fonts.bodyMedium,
                  },
                ]}
              >
                {tourFiltered.length} all
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Volunteer tour filter chips */}
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

      {/* ── Gray band separator ─────────────────────────────────────────────── */}
      <View style={s.grayBand} />

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
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 36,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#D95D39"
              colors={["#D95D39"]}
            />
          }
          ListEmptyComponent={() => (
            <View style={s.empty}>
              <View style={s.emptyIconBg}>
                <Ionicons name="ticket-outline" size={40} color="#D95D39" />
              </View>
              <Text style={s.emptyTitle}>No Bookings Yet</Text>
              <Text style={s.emptySub}>
                Your journey begins with a single booking.
              </Text>
              <TouchableOpacity
                style={s.cta}
                onPress={() => router.push("/(tabs)/tours")}
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

function BookingCard({ item, router, isVolunteer }) {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
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
      style={s.card}
      activeOpacity={0.93}
      onPress={() => router.push(`/booking/${item._id || item.id}`)}
      testID={`booking-${item._id || item.id}`}
    >
      {/* Left color strip */}
      <View style={[s.cardStrip, { backgroundColor: cfg.borderColor }]} />

      <View style={s.cardBody}>
        {/* Header row: icon + title/id + status */}
        <View style={s.cardHeader}>
          <View style={[s.busIcon, { backgroundColor: colors.elevated }]}>
            <Ionicons name="bus-outline" size={20} color={colors.textSecondary} />
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
            <Text style={s.bookingId}>#{bookId}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[s.statusBadgeTxt, { color: cfg.color }]}>
              {cfg.label}
            </Text>
          </View>
        </View>

        {/* Route FROM → TO */}
        {(source || dest) && (
          <View style={s.routeRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.routeLabel}>FROM</Text>
              <Text style={s.routeCity} numberOfLines={1}>
                {source || "—"}
              </Text>
            </View>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={colors.textDisabled}
              style={{ marginHorizontal: 8, marginTop: 14 }}
            />
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={s.routeLabel}>TO</Text>
              <Text
                style={[s.routeCity, { color: "#D95D39" }]}
                numberOfLines={1}
              >
                {dest || "—"}
              </Text>
            </View>
          </View>
        )}

        {/* Date + seats + amount row */}
        <View style={s.footerRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {date ? (
                <View style={s.infoChip}>
                  <Ionicons name="calendar-outline" size={11} color={colors.textSecondary} />
                  <Text style={s.infoChipTxt}>{date}</Text>
                </View>
              ) : null}
              <View style={s.infoChip}>
                <Ionicons name="people-outline" size={11} color={colors.textSecondary} />
                <Text style={s.infoChipTxt}>
                  {seats} seat{seats > 1 ? "s" : ""}
                </Text>
              </View>
            </View>
            <Text style={s.amountTxt}>
              {amount ? `₹${amount.toLocaleString("en-IN")}` : "—"}
            </Text>
          </View>
          <TouchableOpacity
            style={s.viewBtn}
            onPress={() => router.push(`/booking/${item._id || item.id}`)}
          >
            <Text style={s.viewBtnTxt}>View details</Text>
            <Ionicons name="arrow-forward" size={13} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    // Header
    header: {
      backgroundColor: colors.surface,
      paddingTop: 14,
      paddingHorizontal: 18,
      paddingBottom: 14,
    },
    headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    headerTitle: {
      fontFamily: fonts.heading,
      fontSize: 26,
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    headerSub: {
      fontFamily: fonts.body,
      fontSize: 13, // sub text level — matches menuSub in profile
      color: colors.textDisabled,
      marginTop: 2,
    },
    countBadge: {
      alignItems: "center",
      backgroundColor: colors.elevated,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 8,
      minWidth: 56,
    },
    countBadgeNum: {
      fontFamily: fonts.heading,
      fontSize: 22,
      color: "#D95D39",
    },
    countBadgeLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 11, // small badge level — matches sectionLabel in profile
      color: "#D95D39",
      marginTop: 1,
    },

    // Filter tabs
    filterRow: {
      flexDirection: "row",
      gap: 8,
    },
    filterTab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 50,
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    filterTabActive: {
      backgroundColor: "#16A34A",
      borderColor: "#16A34A",
    },
    filterTabPending: {
      backgroundColor: colors.elevated,
      borderColor: "#D97706",
    },
    filterTabPendingActive: {
      backgroundColor: "#D97706",
      borderColor: "#D97706",
    },
    filterTabAll: {
      backgroundColor: colors.elevated,
      borderColor: colors.borderSubtle,
      flex: 1,
      justifyContent: "center",
    },
    filterTabAllActive: {
      backgroundColor: "#D95D39",
      borderColor: "#D95D39",
    },
    filterDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    filterTabTxt: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.textPrimary,
    },
    filterTabTxtActive: {
      color: "#fff",
      fontFamily: fonts.bodyBold,
    },
    filterTabTxtPendingActive: {
      color: "#fff",
      fontFamily: fonts.bodyBold,
    },
    filterTabTxtAllActive: {
      color: "#fff",
      fontFamily: fonts.bodyBold,
    },

    // Auth gate
    gateBody: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 36,
      gap: 10,
      paddingTop: 40,
    },
    gateIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.elevated,
      alignItems: "center",
      justifyContent: "center",
    },
    gateTitle: {
      fontFamily: fonts.heading,
      fontSize: 22,
      color: "#5C1615",
      textAlign: "center",
      marginTop: 8,
    },
    gateSub: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textDisabled,
      textAlign: "center",
      lineHeight: 20,
    },
    loginBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 20,
      backgroundColor: "#D95D39",
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 50,
    },
    loginBtnText: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 14 },

    // Empty
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
      backgroundColor: colors.elevated,
    },
    emptyTitle: {
      fontFamily: fonts.heading,
      fontSize: 22,
      color: "#5C1615",
      marginTop: 4,
    },
    emptySub: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textDisabled,
      textAlign: "center",
    },
    cta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 16,
      backgroundColor: "#D95D39",
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 50,
    },
    ctaText: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 14 },

    // Gray band between header and cards (iOS Settings style)
    grayBand: {
      height: 10,
      backgroundColor: colors.bg,
    },

    // Booking card
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      flexDirection: "row",
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    cardStrip: { width: 4 },
    cardBody: { flex: 1, padding: 14 },

    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    busIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary }, // primary label
    cardSubTitle: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textDisabled,
      marginTop: 1,
    }, // sub text
    bookingId: {
      fontFamily: fonts.accent,
      fontSize: 10,
      color: colors.textDisabled,
      letterSpacing: 1,
      marginTop: 2,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 20,
      marginLeft: 6,
    },
    statusBadgeTxt: { fontFamily: fonts.bodyBold, fontSize: 11 }, // small badge level

    routeRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.elevated,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 12,
    },
    routeLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 10,
      color: colors.textDisabled,
      letterSpacing: 1.5,
      marginBottom: 2,
    }, // small badge level
    routeCity: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary }, // primary label

    footerRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
    infoChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.elevated,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
    },
    infoChipTxt: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary }, // meta level
    amountTxt: {
      fontFamily: fonts.bodyBold,
      fontSize: 22,
      color: colors.textPrimary,
      marginTop: 4,
    }, // same as statNum

    viewBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: "#D95D39",
      borderRadius: 50,
    },
    viewBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" }, // button level

    // Volunteer tour filter
    tourChip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    tourChipActive: { backgroundColor: "#D95D39", borderColor: "#D95D39" },
    tourChipTxt: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.textSecondary,
      maxWidth: 120,
    }, // meta level
    tourChipTxtActive: { color: "#fff", fontFamily: fonts.bodyBold },
  });
