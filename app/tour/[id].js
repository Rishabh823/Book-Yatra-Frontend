import { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts, radius, shadow } from "../../lib/theme";
import { tours as toursApi, auth as authApi, reviews as reviewsApi } from "../../lib/api";
import { resolveImageUrl } from "../../lib/utils";
import { useColors } from "../../lib/ThemeContext";
import { useFavorites } from "../../lib/hooks/useFavorites";
import { useRecentlyViewed } from "../../lib/hooks/useRecentlyViewed";

const { width, height } = Dimensions.get("window");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskPhone(phone) {
  if (!phone) return "";
  const s = String(phone).replace(/\D/g, "");
  if (s.length < 6) return phone;
  return s.slice(0, 2) + "X".repeat(Math.max(0, s.length - 6)) + s.slice(-4);
}

function timeAgo(dateStr) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
    return `${Math.floor(months / 12)} year${Math.floor(months / 12) > 1 ? "s" : ""} ago`;
  } catch {
    return "";
  }
}

const AVATAR_COLORS = [
  "#E57373", "#F06292", "#BA68C8", "#7986CB",
  "#4FC3F7", "#4DB6AC", "#81C784", "#FFD54F",
  "#FF8A65", "#A1887F",
];

function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function StarRow({ rating, size, color }) {
  const sz = size || 14;
  const col = color || "#F59E0B";
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const diff = rating - (i - 1);
    const name = diff >= 1 ? "star" : diff >= 0.5 ? "star-half" : "star-outline";
    stars.push(<Ionicons key={i} name={name} size={sz} color={col} />);
  }
  return <View style={{ flexDirection: "row", gap: 1 }}>{stars}</View>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TourDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isFav, toggle: toggleFav } = useFavorites();
  const { addViewed } = useRecentlyViewed();

  // Reviews state
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [helpfulIds, setHelpfulIds] = useState({});
  const [expandedReviews, setExpandedReviews] = useState({});

  // Write-review modal state
  const [writeModalVisible, setWriteModalVisible] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTags, setReviewTags] = useState([]);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Gallery lightbox state
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const t = await toursApi.byId(id).catch(() => null);
        const data = t?.data || t;
        if (data) {
          setTour(data);
          addViewed(data);
        }
      } finally {
        setLoading(false);
      }
    })();

    // Check login state
    AsyncStorage.getItem("token").then((tok) => setIsLoggedIn(!!tok));

    // Load reviews
    setReviewsLoading(true);
    Promise.allSettled([
      reviewsApi.list(id, { limit: 20, sort: "newest" }),
      reviewsApi.stats(id),
    ]).then(([listRes, statsRes]) => {
      if (listRes.status === "fulfilled") {
        const d = listRes.value;
        setReviewsList(Array.isArray(d) ? d : d?.reviews || d?.data || []);
      }
      if (statsRes.status === "fulfilled") {
        setReviewStats(statsRes.value?.data || statsRes.value);
      }
      setReviewsLoading(false);
    });
  }, [id]);

  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);

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
        <Ionicons name="alert-circle-outline" size={48} color={colors.textDisabled} />
        <Text style={s.notFound}>Yatra not found</Text>
        <TouchableOpacity style={s.backCta} onPress={() => router.back()} testID="not-found-back">
          <Text style={s.backCtaText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const itinerary = Array.isArray(tour.itinerary) && tour.itinerary.length > 0
    ? tour.itinerary
    : tour.isExternal
      ? [] // no fake placeholder for external tours
      : [
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

  const priceNum = parseInt(String(tour.price || "0").replace(/[^0-9]/g, ""), 10) || 0;
  const totalSeats = tour.totalSeats || tour.seats || 0;
  const bookedSeats = tour.bookedSeats || 0;
  const availableSeats = Math.max(0, totalSeats - bookedSeats);
  const fillPct = totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0;
  const almostFull = availableSeats > 0 && availableSeats <= 5;
  const soldOut = availableSeats === 0 && totalSeats > 0;

  const duration = (() => {
    if (tour.duration) return tour.duration;
    if (!tour.startDate || !tour.endDate) return "—";
    try {
      const diff = Math.abs(new Date(tour.endDate) - new Date(tour.startDate));
      if (isNaN(diff)) return "—";
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

  // ── Gallery photos ──────────────────────────────────────────────────────────

  const photos = (() => {
    const arr = Array.isArray(tour.photos) ? tour.photos.filter(Boolean) : [];
    if (arr.length === 0 && tour.coverPhotoUrl) return [tour.coverPhotoUrl];
    return arr.slice(0, 12);
  })();
  const showGallery = photos.length >= 2;

  // ── Inclusions / Exclusions ─────────────────────────────────────────────────

  const inclusions =
    Array.isArray(tour.inclusions) && tour.inclusions.length > 0
      ? tour.inclusions
      : ["AC Bus", "Driver", "Toll Charges", "Parking"];

  const exclusions =
    Array.isArray(tour.exclusions) && tour.exclusions.length > 0
      ? tour.exclusions
      : ["Meals", "Hotel Stay", "Personal Expenses", "Travel Insurance"];

  // ── Cancellation Policy ─────────────────────────────────────────────────────

  const cancellationPolicy = Array.isArray(tour.cancellationPolicy) && tour.cancellationPolicy.length > 0
    ? tour.cancellationPolicy
    : [
        { label: "7+ days before departure", refund: "Full Refund", color: colors.success },
        { label: "3–7 days before", refund: "50% Refund", color: "#65A30D" },
        { label: "1–3 days before", refund: "25% Refund", color: colors.warning },
        { label: "Less than 24 hours", refund: "No Refund", color: colors.error },
      ];

  // ── Reviews helpers ─────────────────────────────────────────────────────────

  const avgRating =
    tour.avgRating ||
    reviewStats?.avgRating ||
    reviewStats?.averageRating ||
    0;

  const totalReviews =
    reviewStats?.totalReviews ||
    reviewStats?.total ||
    reviewsList.length ||
    0;

  const ratingBreakdown = reviewStats?.breakdown || reviewStats?.ratingBreakdown || null;

  const REVIEW_TAGS = ["comfort", "punctuality", "cleanliness", "staff", "value"];

  const displayedReviews = showAllReviews ? reviewsList : reviewsList.slice(0, 3);

  const handleMarkHelpful = async (reviewId) => {
    if (helpfulIds[reviewId]) return;
    setHelpfulIds((prev) => ({ ...prev, [reviewId]: true }));
    try {
      await reviewsApi.markHelpful(reviewId);
    } catch {
      setHelpfulIds((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      setReviewError("Please select a star rating.");
      return;
    }
    if (reviewBody.trim().length < 10) {
      setReviewError("Please write at least a brief review (10 chars).");
      return;
    }
    setReviewSubmitting(true);
    setReviewError("");
    try {
      const newReview = await reviewsApi.create(id, {
        rating: reviewRating,
        title: reviewTitle.trim(),
        body: reviewBody.trim(),
        tags: reviewTags,
      });
      const created = newReview?.data || newReview;
      if (created) setReviewsList((prev) => [created, ...prev]);
      setWriteModalVisible(false);
      setReviewRating(0);
      setReviewTags([]);
      setReviewTitle("");
      setReviewBody("");
    } catch (e) {
      setReviewError(e?.message || "Failed to submit. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ── Share helpers ────────────────────────────────────────────────────────────

  const buildShareMsg = () => {
    const title = tour.title || "Sacred Yatra";
    const from = tour.source || "";
    const to = tour.destination || "";
    const date = tour.startDate ? new Date(tour.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
    const price = tour.price || "";
    const seats = tour.availableSeats != null ? `${tour.availableSeats} seats left` : "";
    return (
      `🕉️ *${title}*\n` +
      (from && to ? `📍 ${from} → ${to}\n` : "") +
      (date ? `📅 ${date}\n` : "") +
      (price ? `💰 ${price} per person\n` : "") +
      (seats ? `🪑 ${seats}\n` : "") +
      `\nBook via Shyam Sawariya Parivar App!`
    );
  };

  const shareWhatsApp = async () => {
    const msg = encodeURIComponent(buildShareMsg());
    const url = `whatsapp://send?text=${msg}`;
    const webUrl = `https://wa.me/?text=${msg}`;
    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    try {
      await Linking.openURL(canOpen ? url : webUrl);
    } catch {
      Share.share({ message: buildShareMsg(), title: tour.title });
    }
  };

  // ── Bus / Driver ────────────────────────────────────────────────────────────

  const buses = Array.isArray(tour.buses) && tour.buses.length > 0 ? tour.buses : null;
  const primaryBus = buses ? buses[0] : null;
  const primaryDriver = tour.primaryDriver || (buses && buses[0]?.driver) || null;
  const hasBusInfo = !!(primaryBus || primaryDriver);

  // ─────────────────────────────────────────────────────────────────────────────

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
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={[s.iconBtn, { backgroundColor: "rgba(37,211,102,0.25)" }]}
                  onPress={shareWhatsApp}
                  testID="whatsapp-share-btn"
                >
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
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
            {!tour.isExternal && tour.startDate && tour.endDate && (
              <View style={s.dateBadge}>
                <Ionicons name="calendar" size={11} color="#FFE9C0" />
                <Text style={s.dateBadgeTxt}>
                  {fmtDate(tour.startDate)} → {fmtDate(tour.endDate)}
                </Text>
              </View>
            )}
            {tour.isExternal && (
              <View style={s.externalBadge}>
                <Ionicons name="globe-outline" size={11} color="#0284C7" />
                <Text style={s.externalBadgeTxt}>Aggregated · Book on {tour.externalSource || 'Partner Site'}</Text>
              </View>
            )}
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

        {/* ── Stats card ───────────────────────────────────────────────── */}
        <View style={s.statsCard}>
          <StatItem
            value={
              tour.isExternal
                ? "—"
                : availableSeats > 0
                  ? String(availableSeats)
                  : totalSeats > 0
                    ? "Full"
                    : "—"
            }
            label="Available"
            icon="people"
            accent={!tour.isExternal && almostFull ? colors.warning : undefined}
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

        {/* ── Seat fill bar ────────────────────────────────────────────── */}
        {!tour.isExternal && totalSeats > 0 && (
          <View style={s.fillWrap}>
            <View style={s.fillLabelRow}>
              <Text style={s.fillLabel}>
                {bookedSeats} of {totalSeats} seats booked
              </Text>
              <Text style={[s.fillPct, fillPct > 80 && { color: colors.error }]}>
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
        {!tour.isExternal && (tour.operatorId || tour.operator) && (
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
                  {(typeof tour.operatorId === "object"
                    ? tour.operatorId?.isVerified
                    : tour.operator?.isVerified)
                    ? "Verified operator"
                    : "Tour Operator"}
                </Text>
              </View>
              {(typeof tour.operatorId === "object"
                ? tour.operatorId?.isVerified
                : tour.operator?.isVerified) && (
                <View style={s.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.success} />
                  <Text style={s.verifiedTxt}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── What's included — only for platform tours with real data ── */}
        {!tour.isExternal && (
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
        )}

        {/* External tour info banner */}
        {tour.isExternal && (
          <View style={[s.section, { paddingTop: 16 }]}>
            <View style={{ backgroundColor: "#EFF6FF", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#BFDBFE", gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="information-circle" size={18} color="#0284C7" />
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: "#1E40AF" }}>Aggregated Tour</Text>
              </View>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: "#1E3A8A", lineHeight: 19 }}>
                This tour is sourced from {tour.externalSource || "a partner site"}. Full itinerary, inclusions, and booking are managed by the partner. Tap "Book on {tour.externalSource || "Website"}" below to view complete details.
              </Text>
            </View>
          </View>
        )}

        {/* ── Itinerary ────────────────────────────────────────────────── */}
        {itinerary.length > 0 && <View style={s.section}>
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
        </View>}

        {/* ── Photo Gallery ─────────────────────────────────────────────── */}
        {showGallery && (
          <View style={s.section}>
            <Text style={s.h3}>Photos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.galleryRow}
            >
              {photos.map((photo, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    setGalleryIndex(i);
                    setGalleryVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: resolveImageUrl(photo) }}
                    style={s.galleryThumb}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Bus & Crew — platform tours only ─────────────────────────── */}
        {!tour.isExternal && <View style={s.section}>
          <Text style={s.h3}>Bus &amp; Crew</Text>
          {hasBusInfo ? (
            <View style={{ marginTop: 14, gap: 12 }}>
              {/* Bus card */}
              <View style={s.busCard}>
                <View style={s.busIconWrap}>
                  <Ionicons name="bus" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={s.busRegNum}>
                      {primaryBus?.registrationNumber || "To be assigned"}
                    </Text>
                    {primaryBus?.hasAC && (
                      <View style={s.acBadge}>
                        <Text style={s.acBadgeTxt}>AC</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.busSub}>
                    {[
                      primaryBus?.busType || primaryBus?.type,
                      primaryBus?.capacity ? `${primaryBus.capacity} seats` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Bus details pending"}
                  </Text>
                </View>
              </View>

              {/* Driver card */}
              {primaryDriver && (
                <View style={s.driverCard}>
                  <View
                    style={[
                      s.driverAvatar,
                      { backgroundColor: avatarColor(primaryDriver.name) },
                    ]}
                  >
                    {primaryDriver.photo ? (
                      <Image
                        source={{ uri: resolveImageUrl(primaryDriver.photo) }}
                        style={s.driverAvatarImg}
                      />
                    ) : (
                      <Text style={s.driverInitial}>
                        {String(primaryDriver.name || "D")[0].toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={s.driverName}>{primaryDriver.name || "Driver"}</Text>
                      <View style={s.driverVerifiedBadge}>
                        <Ionicons name="shield-checkmark" size={10} color={colors.success} />
                        <Text style={s.driverVerifiedTxt}>Verified</Text>
                      </View>
                    </View>
                    <Text style={s.driverSub}>
                      {[
                        primaryDriver.experienceYears
                          ? `${primaryDriver.experienceYears} yrs exp`
                          : null,
                        Array.isArray(primaryDriver.languages) &&
                        primaryDriver.languages.length
                          ? primaryDriver.languages.join(", ")
                          : primaryDriver.languages || null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                    {primaryDriver.phone && (
                      <Text style={s.driverPhone}>
                        {maskPhone(primaryDriver.phone)}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={s.busNote}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={s.busNoteTxt}>
                Fleet details will be shared 24 hours before departure.
              </Text>
            </View>
          )}
        </View>}

        {/* ── Inclusions & Exclusions — platform tours only ─────────────── */}
        {!tour.isExternal && <View style={s.section}>
          <Text style={s.h3}>Inclusions &amp; Exclusions</Text>
          <View style={s.inclExclRow}>
            {/* Included */}
            <View style={s.inclBox}>
              <View style={s.inclHeader}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[s.inclHeaderTxt, { color: colors.success }]}>Included</Text>
              </View>
              {inclusions.map((item, i) => (
                <View key={i} style={s.inclItem}>
                  <Ionicons name="checkmark" size={13} color={colors.success} />
                  <Text style={s.inclItemTxt}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Excluded */}
            <View style={s.exclBox}>
              <View style={s.inclHeader}>
                <Ionicons name="close-circle" size={16} color={colors.error} />
                <Text style={[s.inclHeaderTxt, { color: colors.error }]}>Excluded</Text>
              </View>
              {exclusions.map((item, i) => (
                <View key={i} style={s.inclItem}>
                  <Ionicons name="close" size={13} color={colors.error} />
                  <Text style={s.inclItemTxt}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>}

        {/* ── Cancellation Policy — platform tours only ─────────────────── */}
        {!tour.isExternal && <View style={s.section}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="shield-checkmark" size={20} color={colors.secondary} />
            <Text style={s.h3}>Cancellation Policy</Text>
          </View>
          <View style={s.policyTimeline}>
            {cancellationPolicy.map((tier, i) => {
              const tierColor =
                tier.color ||
                (i === 0
                  ? colors.success
                  : i === 1
                    ? "#65A30D"
                    : i === 2
                      ? colors.warning
                      : colors.error);
              return (
                <View key={i} style={s.policyRow}>
                  <View style={[s.policyDot, { backgroundColor: tierColor }]} />
                  {i < cancellationPolicy.length - 1 && (
                    <View
                      style={[s.policyLine, { backgroundColor: tierColor + "40" }]}
                    />
                  )}
                  <View style={s.policyContent}>
                    <Text style={s.policyLabel}>
                      {tier.label || tier.days || `Tier ${i + 1}`}
                    </Text>
                    <View
                      style={[
                        s.policyPill,
                        {
                          backgroundColor: tierColor + "18",
                          borderColor: tierColor + "40",
                        },
                      ]}
                    >
                      <Text style={[s.policyPillTxt, { color: tierColor }]}>
                        {tier.refund || tier.refundPercent || "—"}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>}

        {/* ── Reviews & Ratings ─────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.h3}>Reviews &amp; Ratings</Text>

          {/* Rating summary card */}
          {(avgRating > 0 || totalReviews > 0) && (
            <View style={s.ratingCard}>
              <View style={s.ratingLeft}>
                <Text style={s.ratingBig}>
                  {avgRating > 0 ? Number(avgRating).toFixed(1) : "—"}
                </Text>
                <StarRow rating={avgRating} size={16} />
                <Text style={s.ratingBasedOn}>
                  Based on {totalReviews} review{totalReviews !== 1 ? "s" : ""}
                </Text>
              </View>
              <View style={s.ratingBars}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const pct = ratingBreakdown
                    ? ratingBreakdown[star] ||
                      ratingBreakdown[`star${star}`] ||
                      0
                    : 0;
                  return (
                    <View key={star} style={s.ratingBarRow}>
                      <Text style={s.ratingBarLabel}>{star}</Text>
                      <Ionicons name="star" size={9} color="#F59E0B" />
                      <View style={s.ratingBarTrack}>
                        <View
                          style={[
                            s.ratingBarFill,
                            { width: `${Math.min(100, pct)}%` },
                          ]}
                        />
                      </View>
                      <Text style={s.ratingBarPct}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Tag chips from stats */}
          {reviewStats?.tagCounts && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.tagChipsRow}
            >
              {Object.entries(reviewStats.tagCounts).map(([tag, count]) => (
                <View key={tag} style={s.tagChip}>
                  <Text style={s.tagChipTxt}>
                    {tag} · {count}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Reviews loading */}
          {reviewsLoading && (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          )}

          {/* Review cards */}
          {!reviewsLoading &&
            displayedReviews.map((review, i) => {
              const reviewId = review._id || review.id || String(i);
              const isExpanded = expandedReviews[reviewId];
              const userName =
                review.user?.name ||
                review.userName ||
                review.name ||
                "Traveller";
              const firstName = userName.split(" ")[0];
              const helpful = review.helpfulCount || review.helpful || 0;
              const bodyText =
                review.body || review.text || review.comment || "";

              return (
                <View key={reviewId} style={s.reviewCard}>
                  {/* Header */}
                  <View style={s.reviewHeader}>
                    <View
                      style={[
                        s.reviewAvatar,
                        { backgroundColor: avatarColor(firstName) },
                      ]}
                    >
                      <Text style={s.reviewAvatarTxt}>
                        {firstName[0]?.toUpperCase() || "?"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View
                        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                      >
                        <Text style={s.reviewUserName}>{firstName}</Text>
                        {review.isVerifiedBooking && (
                          <View style={s.verifiedBookingBadge}>
                            <Ionicons
                              name="checkmark-circle"
                              size={10}
                              color={colors.success}
                            />
                            <Text style={s.verifiedBookingTxt}>
                              Verified Booking
                            </Text>
                          </View>
                        )}
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 2,
                        }}
                      >
                        <StarRow rating={review.rating || 0} size={11} />
                        <Text style={s.reviewDate}>
                          {timeAgo(review.createdAt || review.date)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Title */}
                  {!!review.title && (
                    <Text style={s.reviewTitle}>{review.title}</Text>
                  )}

                  {/* Body */}
                  <Text
                    style={s.reviewBody}
                    numberOfLines={isExpanded ? undefined : 3}
                  >
                    {bodyText}
                  </Text>
                  {bodyText.length > 120 && (
                    <TouchableOpacity
                      onPress={() =>
                        setExpandedReviews((prev) => ({
                          ...prev,
                          [reviewId]: !isExpanded,
                        }))
                      }
                    >
                      <Text style={s.reviewReadMore}>
                        {isExpanded ? "Show less" : "Read more"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Helpful */}
                  <View style={s.reviewFooter}>
                    <TouchableOpacity
                      style={[
                        s.helpfulBtn,
                        helpfulIds[reviewId] && s.helpfulBtnActive,
                      ]}
                      onPress={() => handleMarkHelpful(reviewId)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.helpfulBtnTxt}>
                        {"👍"} Helpful (
                        {helpful + (helpfulIds[reviewId] ? 1 : 0)})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Operator reply */}
                  {review.operatorReply && (
                    <View style={s.replyBox}>
                      <Text style={s.replyText}>{review.operatorReply}</Text>
                      <Text style={s.replySig}>— Operator</Text>
                    </View>
                  )}
                </View>
              );
            })}

          {/* Show all / collapse */}
          {!reviewsLoading && reviewsList.length > 3 && (
            <TouchableOpacity
              style={s.showAllBtn}
              onPress={() => setShowAllReviews((v) => !v)}
            >
              <Text style={s.showAllBtnTxt}>
                {showAllReviews
                  ? "Show less"
                  : `Show all ${reviewsList.length} reviews`}
              </Text>
              <Ionicons
                name={showAllReviews ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}

          {/* Write review */}
          {isLoggedIn && (
            <TouchableOpacity
              style={s.writeReviewBtn}
              onPress={() => setWriteModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="pencil" size={16} color="#fff" />
              <Text style={s.writeReviewBtnTxt}>Write a Review</Text>
            </TouchableOpacity>
          )}
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
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TouchableOpacity
              style={s.whatsappCta}
              onPress={shareWhatsApp}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </TouchableOpacity>
            {tour.isExternal ? (
              <TouchableOpacity
                style={s.bookCta}
                onPress={() => Linking.openURL(tour.externalBookingUrl)}
                testID="book-external-btn"
              >
                <Ionicons name="open-outline" size={18} color="#fff" />
                <Text style={s.bookCtaTxt}>Book on {tour.externalSource || 'Website'}</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            ) : soldOut ? (
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
        </View>
      </SafeAreaView>

      {/* ── Gallery Lightbox Modal ────────────────────────────────────── */}
      <GalleryModal
        visible={galleryVisible}
        photos={photos}
        initialIndex={galleryIndex}
        onClose={() => setGalleryVisible(false)}
      />

      {/* ── Write Review Bottom Sheet Modal ──────────────────────────── */}
      <Modal
        visible={writeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setWriteModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={s.modalOverlay}
            activeOpacity={1}
            onPress={() => setWriteModalVisible(false)}
          />
          <View style={s.writeSheet}>
            <View style={s.sheetHandle} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={s.sheetTitle}>Write a Review</Text>

              {/* Star selector */}
              <Text style={s.sheetLabel}>Your Rating</Text>
              <View style={s.starSelector}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setReviewRating(star)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={reviewRating >= star ? "star" : "star-outline"}
                      size={36}
                      color={reviewRating >= star ? "#F59E0B" : colors.borderStrong}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tag chips */}
              <Text style={s.sheetLabel}>Tags (optional)</Text>
              <View style={s.tagSelectorRow}>
                {REVIEW_TAGS.map((tag) => {
                  const active = reviewTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        s.tagSelectorChip,
                        active && s.tagSelectorChipActive,
                      ]}
                      onPress={() =>
                        setReviewTags((prev) =>
                          active
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag]
                        )
                      }
                    >
                      <Text
                        style={[
                          s.tagSelectorChipTxt,
                          active && s.tagSelectorChipTxtActive,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Title */}
              <Text style={s.sheetLabel}>Title (optional)</Text>
              <TextInput
                style={s.sheetInput}
                placeholder="Summarise your experience..."
                placeholderTextColor={colors.textDisabled}
                value={reviewTitle}
                onChangeText={setReviewTitle}
                maxLength={80}
              />

              {/* Body */}
              <Text style={s.sheetLabel}>Review</Text>
              <TextInput
                style={[s.sheetInput, s.sheetTextarea]}
                placeholder="Share your experience (at least 100 characters recommended)..."
                placeholderTextColor={colors.textDisabled}
                value={reviewBody}
                onChangeText={setReviewBody}
                multiline
                maxLength={1000}
              />
              <Text style={s.charCount}>{reviewBody.length} / 1000</Text>

              {/* Error */}
              {!!reviewError && (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={s.errorTxt}>{reviewError}</Text>
                </View>
              )}

              {/* Submit */}
              <TouchableOpacity
                style={[s.submitBtn, reviewSubmitting && { opacity: 0.7 }]}
                onPress={handleSubmitReview}
                disabled={reviewSubmitting}
              >
                {reviewSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.submitBtnTxt}>Submit Review</Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Gallery Lightbox ─────────────────────────────────────────────────────────

function GalleryModal({ visible, photos, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  const goTo = (idx) => {
    const clamped = Math.max(0, Math.min(photos.length - 1, idx));
    setCurrentIndex(clamped);
    flatRef.current?.scrollToIndex({ index: clamped, animated: true });
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {/* Top bar */}
        <SafeAreaView edges={["top"]} style={gl.topBar}>
          <TouchableOpacity onPress={onClose} style={gl.closeBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={gl.counter}>
            {currentIndex + 1} / {photos.length}
          </Text>
        </SafeAreaView>

        {/* Paged image strip */}
        <FlatList
          ref={flatRef}
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          onMomentumScrollEnd={(e) => {
            const newIdx = Math.round(
              e.nativeEvent.contentOffset.x / width
            );
            setCurrentIndex(newIdx);
          }}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View
              style={{
                width,
                height: height * 0.75,
                justifyContent: "center",
              }}
            >
              <Image
                source={{ uri: resolveImageUrl(item) }}
                style={{ width, height: height * 0.75 }}
                resizeMode="contain"
              />
            </View>
          )}
        />

        {/* Prev arrow */}
        {currentIndex > 0 && (
          <TouchableOpacity
            style={gl.arrowLeft}
            onPress={() => goTo(currentIndex - 1)}
          >
            <Ionicons name="chevron-back" size={30} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Next arrow */}
        {currentIndex < photos.length - 1 && (
          <TouchableOpacity
            style={gl.arrowRight}
            onPress={() => goTo(currentIndex + 1)}
          >
            <Ionicons name="chevron-forward" size={30} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatItem({ value, label, icon, accent }) {
  const colors = useColors();
  const ss = useMemo(() => StyleSheet.create({
    statItem: { flex: 1, alignItems: "center", gap: 4 },
    statIconWrap: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: colors.primaryLight,
      alignItems: "center", justifyContent: "center", marginBottom: 4,
    },
    statValue: { fontFamily: fonts.heading, fontSize: 18, color: colors.secondary },
    statLabel: { fontFamily: fonts.accent, fontSize: 9, color: colors.textSecondary, letterSpacing: 1.5, textTransform: "uppercase" },
  }), [colors]);
  return (
    <View style={ss.statItem}>
      <View style={ss.statIconWrap}>
        <Ionicons name={icon} size={16} color={accent || colors.secondary} />
      </View>
      <Text style={[ss.statValue, accent && { color: accent }]}>{value}</Text>
      <Text style={ss.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHead({ label }) {
  const colors = useColors();
  const ss = useMemo(() => StyleSheet.create({
    sectionLabel: { fontFamily: fonts.accent, fontSize: 11, color: colors.textSecondary, letterSpacing: 3 },
  }), [colors]);
  return <Text style={ss.sectionLabel}>{label}</Text>;
}

// ─── Gallery styles ───────────────────────────────────────────────────────────

const gl = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    color: "#fff",
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  arrowLeft: {
    position: "absolute",
    left: 12,
    top: "50%",
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowRight: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Main styles ──────────────────────────────────────────────────────────────

const makeStyles = (colors) => StyleSheet.create({
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

  // ── Hero ──────────────────────────────────────────────────────────────────
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
  externalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(2,132,199,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(2,132,199,0.3)',
  },
  externalBadgeTxt: { fontFamily: fonts.bodyBold, fontSize: 10, color: '#93C5FD' },
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

  // ── Stats card ────────────────────────────────────────────────────────────
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

  // ── Fill bar ──────────────────────────────────────────────────────────────
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

  // ── Sections ──────────────────────────────────────────────────────────────
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

  // ── Operator ──────────────────────────────────────────────────────────────
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

  // ── Features ──────────────────────────────────────────────────────────────
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

  // ── Itinerary ─────────────────────────────────────────────────────────────
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

  // ── Gallery ───────────────────────────────────────────────────────────────
  galleryRow: { gap: 8, marginTop: 14, paddingRight: 4 },
  galleryThumb: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.borderSubtle,
  },

  // ── Bus & Crew ────────────────────────────────────────────────────────────
  busCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
    ...shadow.soft,
  },
  busIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  busRegNum: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  busSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  acBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  acBadgeTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: "#1D4ED8",
    letterSpacing: 0.5,
  },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
    ...shadow.soft,
  },
  driverAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  driverAvatarImg: { width: 46, height: 46 },
  driverInitial: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: "#fff",
  },
  driverName: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  driverSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  driverPhone: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  driverVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  driverVerifiedTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    color: colors.success,
  },
  busNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.elevated,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: 12,
  },
  busNoteTxt: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 19,
  },

  // ── Inclusions / Exclusions ───────────────────────────────────────────────
  inclExclRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  inclBox: {
    flex: 1,
    backgroundColor: "#F0FDF4",
    borderRadius: radius.lg,
    padding: 12,
    gap: 8,
  },
  exclBox: {
    flex: 1,
    backgroundColor: "#FFF1F2",
    borderRadius: radius.lg,
    padding: 12,
    gap: 8,
  },
  inclHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  inclHeaderTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  inclItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  inclItemTxt: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 17,
  },

  // ── Cancellation Policy ───────────────────────────────────────────────────
  policyTimeline: { marginTop: 18, paddingLeft: 4 },
  policyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
    position: "relative",
  },
  policyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 14,
    flexShrink: 0,
  },
  policyLine: {
    position: "absolute",
    left: 5,
    top: 16,
    width: 2,
    height: 28,
  },
  policyContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  policyLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  policyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  policyPillTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },

  // ── Ratings ───────────────────────────────────────────────────────────────
  ratingCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    marginTop: 14,
    gap: 16,
    ...shadow.soft,
  },
  ratingLeft: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 80,
  },
  ratingBig: {
    fontFamily: fonts.heading,
    fontSize: 42,
    color: colors.secondary,
    lineHeight: 46,
  },
  ratingBasedOn: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },
  ratingBars: { flex: 1, gap: 5, justifyContent: "center" },
  ratingBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  ratingBarLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textSecondary,
    width: 10,
    textAlign: "right",
  },
  ratingBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.borderSubtle,
    borderRadius: 3,
    overflow: "hidden",
  },
  ratingBarFill: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 3,
  },
  ratingBarPct: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textSecondary,
    width: 28,
  },

  // ── Tag chips ─────────────────────────────────────────────────────────────
  tagChipsRow: { gap: 8, marginTop: 10, paddingRight: 4 },
  tagChip: {
    backgroundColor: colors.elevated,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  tagChipTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textPrimary,
    textTransform: "capitalize",
  },

  // ── Review cards ──────────────────────────────────────────────────────────
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
    marginTop: 12,
    ...shadow.soft,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  reviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarTxt: {
    color: "#fff",
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  reviewUserName: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  verifiedBookingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  verifiedBookingTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    color: colors.success,
  },
  reviewDate: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textDisabled,
  },
  reviewTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  reviewBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  reviewReadMore: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
  },
  reviewFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  helpfulBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.bg,
  },
  helpfulBtnActive: {
    borderColor: colors.primary + "60",
    backgroundColor: colors.primaryLight,
  },
  helpfulBtnTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  replyBox: {
    marginTop: 10,
    backgroundColor: colors.elevated,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  replyText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  replySig: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // ── Show all / Write review ───────────────────────────────────────────────
  showAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + "50",
    backgroundColor: colors.primaryLight,
  },
  showAllBtnTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  writeReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: radius.pill,
    backgroundColor: colors.secondary,
  },
  writeReviewBtnTxt: {
    color: "#fff",
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },

  // ── Write Review modal / bottom sheet ────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  writeSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    maxHeight: height * 0.9,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.secondary,
    marginBottom: 16,
  },
  sheetLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
  },
  starSelector: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  tagSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  tagSelectorChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bg,
  },
  tagSelectorChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  tagSelectorChipTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  tagSelectorChipTxtActive: {
    color: colors.primary,
  },
  sheetInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sheetTextarea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textDisabled,
    textAlign: "right",
    marginBottom: 4,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF1F2",
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 8,
  },
  errorTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.error,
    flex: 1,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    ...shadow.card,
  },
  submitBtnTxt: {
    color: "#fff",
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },

  // ── Sticky CTA ────────────────────────────────────────────────────────────
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
  whatsappCta: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: "rgba(37,211,102,0.12)",
    borderWidth: 1.5,
    borderColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
  },
});
