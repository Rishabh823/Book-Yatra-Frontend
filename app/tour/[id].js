import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import { tours as toursApi, auth as authApi } from "../../lib/api";
import { resolveImageUrl } from "../../lib/utils";
import { useFavorites } from "../../lib/hooks/useFavorites";
import { useRecentlyViewed } from "../../lib/hooks/useRecentlyViewed";

const { width } = Dimensions.get("window");

export default function TourDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isFav, toggle: toggleFav } = useFavorites();
  const { addViewed } = useRecentlyViewed();

  useEffect(() => {
    (async () => {
      try {
        const t = await toursApi.byId(id).catch(() => null);
        const data = t?.data || t;
        if (data) {
          setTour(data);
          addViewed(data); // Track recently viewed
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!tour) {
    return (
      <View style={s.center}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={colors.textDisabled}
        />
        <Text style={s.notFound}>Yatra not found</Text>
        <TouchableOpacity
          style={s.backCta}
          onPress={() => router.back()}
          testID="not-found-back"
        >
          <Text style={s.backCtaText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const itinerary = tour.itinerary || [
    { day: "Day 1", desc: "Departure from origin · Evening prayers" },
    { day: "Day 2", desc: "Arrive at destination · Darshan & Aarti" },
    { day: "Day 3", desc: "Bhajan sandhya · Return journey" },
  ];

  const features = [
    { icon: "bus", label: tour.busType || "AC Bus" },
    { icon: "restaurant", label: "Meals included" },
    { icon: "bed", label: "Stay arranged" },
    { icon: "shield-checkmark", label: "Safe travel" },
  ];

  const priceNum =
    parseInt(String(tour.price || "0").replace(/[^0-9]/g, ""), 10) || 0;
  const totalSeats = tour.totalSeats || tour.seats || 0;
  const bookedSeats = tour.bookedSeats || 0;
  const availableSeats = Math.max(0, totalSeats - bookedSeats);
  const fillPct =
    totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0;
  const almostFull = availableSeats > 0 && availableSeats <= 5;
  const soldOut = availableSeats === 0 && totalSeats > 0;

  const duration = (() => {
    if (tour.duration) return tour.duration;
    try {
      const diff = Math.abs(new Date(tour.endDate) - new Date(tour.startDate));
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
      return `${days}D`;
    } catch {
      return "—";
    }
  })();

  const fmtDate = (d) => {
    try {
      return new Date(d).toLocaleDateString("en-IN", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <View style={s.heroWrap}>
          <Image
            source={{ uri: resolveImageUrl(tour.coverPhotoUrl) }}
            style={s.heroImg}
            resizeMode="cover"
          />
          {/* Multi-stop gradient */}
          <LinearGradient
            colors={["rgba(30,5,4,0.55)", "transparent", "rgba(30,5,4,0.90)"]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Top bar */}
          <SafeAreaView edges={["top"]} style={s.topBarWrap}>
            <View style={s.topBar}>
              <TouchableOpacity
                style={s.iconBtn}
                onPress={() => router.back()}
                testID="detail-back-btn"
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.iconBtn}
                onPress={() => toggleFav(tour._id)}
                testID="favorite-btn"
              >
                <Ionicons
                  name={isFav(tour._id) ? "heart" : "heart-outline"}
                  size={20}
                  color={isFav(tour._id) ? "#EF4444" : "#fff"}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Badges */}
          <View style={s.heroMiddle}>
            {soldOut && (
              <View style={[s.heroBadge, { backgroundColor: "#DC2626" }]}>
                <Ionicons name="close-circle" size={12} color="#fff" />
                <Text style={s.heroBadgeTxt}>SOLD OUT</Text>
              </View>
            )}
            {almostFull && !soldOut && (
              <View style={[s.heroBadge, { backgroundColor: "#D97706" }]}>
                <Ionicons name="flame" size={12} color="#fff" />
                <Text style={s.heroBadgeTxt}>ONLY {availableSeats} LEFT</Text>
              </View>
            )}
          </View>

          {/* Bottom info */}
          <View style={s.heroBottom}>
            <View style={s.dateBadge}>
              <Ionicons name="calendar" size={11} color="#FFE9C0" />
              <Text style={s.dateBadgeTxt}>
                {fmtDate(tour.startDate)} → {fmtDate(tour.endDate)}
              </Text>
            </View>
            <Text style={s.heroTitle} numberOfLines={2}>
              {tour.title}
            </Text>
            <View style={s.heroMeta}>
              <Ionicons name="location" size={13} color="#FFE9C0" />
              <Text style={s.heroMetaTxt}>
                {tour.source} → {tour.destination}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Stats card (overlapping hero) ─────────────────────────── */}
        <View style={s.statsCard}>
          <StatItem
            value={
              availableSeats > 0
                ? String(availableSeats)
                : totalSeats > 0
                  ? "Full"
                  : "—"
            }
            label="Available"
            icon="people"
            accent={almostFull ? colors.warning : undefined}
          />
          <View style={s.statDiv} />
          <StatItem value={duration} label="Duration" icon="time" />
          <View style={s.statDiv} />
          <StatItem
            value={tour.price || `₹${priceNum}` || "—"}
            label="Per seat"
            icon="pricetag"
            accent={colors.primary}
          />
        </View>

        {/* Seat fill bar (only shown when seat data available) */}
        {totalSeats > 0 && (
          <View style={s.fillWrap}>
            <View style={s.fillLabelRow}>
              <Text style={s.fillLabel}>
                {bookedSeats} of {totalSeats} seats booked
              </Text>
              <Text
                style={[s.fillPct, fillPct > 80 && { color: colors.error }]}
              >
                {fillPct}%
              </Text>
            </View>
            <View style={s.fillBar}>
              <View
                style={[
                  s.fillFill,
                  {
                    width: `${Math.min(100, fillPct)}%`,
                    backgroundColor:
                      fillPct > 80
                        ? colors.error
                        : fillPct > 50
                          ? colors.warning
                          : colors.success,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* ── About ────────────────────────────────────────────────────── */}
        <View style={s.section}>
          <SectionHead label="· About this yatra ·" />
          <Text style={s.desc}>
            {tour.description ||
              "A divine journey to seek blessings. Experience devotion, community, and deep tradition. All meals, transport and stay arranged with care."}
          </Text>
        </View>

        {/* ── Operator info ────────────────────────────────────────────── */}
        {(tour.operatorId || tour.operator) && (
          <View style={s.section}>
            <SectionHead label="· Tour Operator ·" />
            <View style={s.operatorCard}>
              <View style={s.opIconWrap}>
                <Ionicons name="bus" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.opName}>
                  {typeof tour.operatorId === "object"
                    ? tour.operatorId.businessName || tour.operatorId.name || "Tour Operator"
                    : tour.operator?.businessName ||
                      tour.operator?.name ||
                      "Tour Operator"}
                </Text>
                <Text style={s.opSub}>
                  {(typeof tour.operatorId === "object" ? tour.operatorId?.isVerified : tour.operator?.isVerified)
                    ? "Verified operator"
                    : "Tour Operator"}
                </Text>
              </View>
              {(typeof tour.operatorId === "object" ? tour.operatorId?.isVerified : tour.operator?.isVerified) && (
                <View style={s.verifiedBadge}>
                  <Ionicons
                    name="shield-checkmark"
                    size={12}
                    color={colors.success}
                  />
                  <Text style={s.verifiedTxt}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── What's included ──────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.h3}>What's included</Text>
          <View style={s.featureGrid}>
            {features.map((f, i) => (
              <View key={i} style={s.featCard}>
                <View style={s.featIcon}>
                  <Ionicons name={f.icon} size={18} color={colors.primary} />
                </View>
                <Text style={s.featLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Itinerary ────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.h3}>Itinerary</Text>
          <View style={{ marginTop: 16 }}>
            {itinerary.map((it, i) => (
              <View key={i} style={s.timelineRow}>
                <View style={s.timelineLeft}>
                  <View style={s.timelineDot}>
                    <Text style={s.timelineDotTxt}>{i + 1}</Text>
                  </View>
                  {i < itinerary.length - 1 && <View style={s.timelineLine} />}
                </View>
                <View style={s.timelineContent}>
                  <Text style={s.timelineTitle}>{it.day}</Text>
                  <Text style={s.timelineDesc}>
                    {it.desc || it.title || ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky CTA ──────────────────────────────────────────────────── */}
      <SafeAreaView edges={["bottom"]} style={s.stickyWrap}>
        <View style={s.sticky}>
          <View>
            <Text style={s.stickyLabel}>PER PERSON</Text>
            <Text style={s.stickyPrice}>
              {tour.price || (priceNum ? `₹${priceNum}` : "Free")}
            </Text>
          </View>
          {soldOut ? (
            <View style={s.soldOutBtn}>
              <Text style={s.soldOutTxt}>Sold Out</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={s.bookCta}
              onPress={async () => {
                const ok = await authApi.isAuthenticated();
                if (!ok) {
                  router.push("/auth/login");
                  return;
                }
                router.push({
                  pathname: "/booking",
                  params: { tourId: tour._id || tour.id },
                });
              }}
              testID="book-now-btn"
            >
              <Ionicons name="ticket" size={18} color="#fff" />
              <Text style={s.bookCtaTxt}>Book Now</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function StatItem({ value, label, icon, accent }) {
  return (
    <View style={s.statItem}>
      <View style={s.statIconWrap}>
        <Ionicons name={icon} size={16} color={accent || colors.secondary} />
      </View>
      <Text style={[s.statValue, accent && { color: accent }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHead({ label }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    gap: 12,
  },
  notFound: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 8,
  },
  backCta: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  backCtaText: { color: "#fff", fontFamily: fonts.bodyBold },

  // Hero
  heroWrap: { height: 380, position: "relative" },
  heroImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  topBarWrap: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 2 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  heroMiddle: {
    position: "absolute",
    top: "40%",
    left: 20,
    flexDirection: "row",
    gap: 8,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  heroBadgeTxt: {
    color: "#fff",
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  heroBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  dateBadgeTxt: {
    color: "#FFE9C0",
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  heroTitle: {
    color: "#fff",
    fontFamily: fonts.heading,
    fontSize: 30,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  heroMetaTxt: { color: "#FFE9C0", fontFamily: fonts.body, fontSize: 13 },

  // Stats card
  statsCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: -22,
    padding: 18,
    borderRadius: radius.xxl,
    ...shadow.card,
    zIndex: 3,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.secondary,
  },
  statLabel: {
    fontFamily: fonts.accent,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  statDiv: {
    width: 1,
    backgroundColor: colors.borderSubtle,
    alignSelf: "stretch",
    marginVertical: 4,
  },

  // Fill bar
  fillWrap: { marginHorizontal: 20, marginTop: 18 },
  fillLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  fillLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  fillPct: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  fillBar: {
    height: 5,
    backgroundColor: colors.borderSubtle,
    borderRadius: 3,
    overflow: "hidden",
  },
  fillFill: { height: "100%", borderRadius: 3 },

  // Sections
  section: { paddingHorizontal: 20, paddingTop: 28 },
  sectionLabel: {
    fontFamily: fonts.accent,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 3,
  },
  desc: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
    marginTop: 12,
  },
  h3: { fontFamily: fonts.heading, fontSize: 20, color: colors.secondary },

  // Operator
  operatorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
    marginTop: 12,
    ...shadow.soft,
  },
  opIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  opName: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  opSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  verifiedTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.success,
  },

  // Features
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  featCard: {
    width: (width - 40 - 10) / 2,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radius.lg,
    gap: 10,
    ...shadow.soft,
  },
  featIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  featLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },

  // Itinerary
  timelineRow: { flexDirection: "row", gap: 14, position: "relative" },
  timelineLeft: { alignItems: "center", width: 34 },
  timelineDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotTxt: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 13 },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.borderSubtle,
    marginTop: 4,
    minHeight: 24,
  },
  timelineContent: { flex: 1, paddingBottom: 20 },
  timelineTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.secondary,
  },
  timelineDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 19,
  },

  // Sticky
  stickyWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  sticky: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  stickyLabel: {
    fontFamily: fonts.accent,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginBottom: 3,
  },
  stickyPrice: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.primary,
  },
  soldOutBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: colors.borderSubtle,
    borderRadius: radius.pill,
  },
  soldOutTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  bookCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  bookCtaTxt: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 14 },
});
