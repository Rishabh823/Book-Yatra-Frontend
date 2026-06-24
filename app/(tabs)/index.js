import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  RefreshControl,
  ActivityIndicator,
  DeviceEventEmitter,
  TextInput,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { fonts } from "../../lib/theme";
import { getProfileCompletion } from "../../lib/onboarding";
import {
  tours as toursApi,
  feedback as feedbackApi,
  auth as authApi,
  publicSettings,
  publicStats,
  volunteerApi,
  walletApi,
  api,
  search as searchApi,
} from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { resolveImageUrl } from "../../lib/utils";
import { useTheme, useColors } from "../../lib/ThemeContext";
import SearchModal from "../../components/SearchModal";

const { width } = Dimensions.get("window");
const BANNER_W = width - 32; // matches banner marginHorizontal: 16
const BANNERS = [
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
  "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
  "https://images.unsplash.com/photo-1605649487212-47bdab064df7?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
  "https://images.pexels.com/photos/11398067/pexels-photo-11398067.jpeg?auto=compress&cs=tinysrgb&w=800",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
];

// ─── Reusable Section Header ──────────────────────────────────────────────────
function SectionHeader({ title, subtitle, onSeeAll }) {
  const colors = useColors();
  return (
    <View style={sectionHeaderStyles.container}>
      <View style={{ flex: 1 }}>
        <Text
          style={[sectionHeaderStyles.title, { color: colors.textPrimary }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              sectionHeaderStyles.subtitle,
              { color: colors.textSecondary },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onSeeAll ? (
        <TouchableOpacity
          onPress={onSeeAll}
          style={sectionHeaderStyles.seeAllBtn}
        >
          <Text
            style={[sectionHeaderStyles.seeAllText, { color: colors.primary }]}
          >
            See All
          </Text>
          <Ionicons name="arrow-forward" size={13} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const sectionHeaderStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingBottom: 2,
  },
  seeAllText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: "#D95D39",
  },
});

// ─── Shimmer placeholder ──────────────────────────────────────────────────────
function ShimmerCard({ width: w, height: h, borderRadius: br = 20 }) {
  const colors = useColors();
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });
  return (
    <Animated.View
      style={{
        width: w,
        height: h,
        borderRadius: br,
        backgroundColor: colors.borderSubtle,
        marginRight: 14,
        opacity,
      }}
    />
  );
}

// ─── Star rating renderer ─────────────────────────────────────────────────────
function StarRow({ rating = 0, count, size = 11, color = "#F59E0B" }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
      {stars.map((s) => {
        const filled = s <= Math.floor(rating);
        const half = !filled && s - 0.5 <= rating;
        return (
          <Ionicons
            key={s}
            name={filled ? "star" : half ? "star-half" : "star-outline"}
            size={size}
            color={filled || half ? color : "#9B8F85"}
          />
        );
      })}
      {count != null && (
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: size - 1,
            color: "#9B8F85",
            marginLeft: 3,
          }}
        >
          ({count})
        </Text>
      )}
    </View>
  );
}

// ─── Helper: extract array from various API response shapes ──────────────────
function extractArray(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.tours)) return res.tours;
  return [];
}

// ─── Client-side fallbacks when backend filter params aren't supported ────────
function fallbackTrending(all) {
  return [...all]
    .sort((a, b) => (b.totalBookings || 0) - (a.totalBookings || 0))
    .slice(0, 6);
}
function fallbackTopRated(all) {
  return [...all]
    .sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))
    .slice(0, 6);
}
function fallbackOffers(all) {
  const now = new Date();
  return all
    .filter((t) => {
      if (t.isExternal) return true;
      const end = t.endDate
        ? new Date(t.endDate)
        : t.startDate
          ? new Date(t.startDate)
          : null;
      if (end && end < now) return false;
      return t.discountPercent > 0 || t.originalPrice > 0;
    })
    .slice(0, 6);
}

// ─── Offer gradient palettes ──────────────────────────────────────────────────
const OFFER_GRADIENTS = [
  ["#F59E0B", "#EF4444"],
  ["#8B5CF6", "#3B82F6"],
  ["#10B981", "#0284C7"],
  ["#EC4899", "#8B5CF6"],
  ["#F97316", "#EF4444"],
  ["#6366F1", "#8B5CF6"],
];

function fmtStat(n) {
  if (n >= 10000) return Math.floor(n / 1000) + "K+";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "K+";
  if (n > 0) return n + "+";
  return "—";
}

// ─── Main Home Component ──────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const { lang, t, toggle } = useLang();
  const { theme } = useTheme();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [slide, setSlide] = useState(0);
  const [upcoming, setUpcoming] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("user");
  const [joinedOps, setJoinedOps] = useState([]);
  const [authChecked, setAuthChecked] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  const [profileCompletion, setProfileCompletion] = useState(null);

  // New section states
  const [trendingTours, setTrendingTours] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [topRatedTours, setTopRatedTours] = useState([]);
  const [topRatedLoading, setTopRatedLoading] = useState(true);
  const [specialOffers, setSpecialOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);

  // Dynamic stats
  const [statsData, setStatsData] = useState({
    tours: 0,
    cities: 0,
    travelers: 0,
    fiveStarReviews: 0,
  });

  // App settings
  const [appSettings, setAppSettings] = useState({
    maintenanceMode: false,
    announcement: "",
  });

  // Role-specific dashboard data
  const [volDashboard, setVolDashboard] = useState(null);
  const [adminStats, setAdminStats] = useState(null);

  // Wallet
  const [walletBalance, setWalletBalance] = useState(null);

  // ── Search / filter state ──────────────────────────────────────────────────
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [searchDate, setSearchDate] = useState(new Date());
  const [tourTypeFilter, setTourTypeFilter] = useState("All");
  const [searchResults, setSearchResults] = useState(null); // null = not searched yet
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const scrollRef = useRef(null);
  const toursYRef = useRef(0);
  const bannerRef = useRef(null);

  const TOUR_TYPES = [
    "All",
    "Pilgrimage",
    "Heritage",
    "Hills",
    "Beach",
    "Weekend",
  ];

  const formatSearchDate = (date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleSearch = async () => {
    const fromQ = searchFrom.trim().toLowerCase();
    const toQ = searchTo.trim().toLowerCase();
    const typeQ = tourTypeFilter;
    const combinedQ = [fromQ, toQ].filter(Boolean).join(" ").trim();

    // Combine all available tour pools for client-side search
    const allAvailable = [
      ...upcoming,
      ...trendingTours,
      ...topRatedTours,
      ...specialOffers,
    ];
    // Deduplicate by id
    const seen = new Set();
    const pool = allAvailable.filter((t) => {
      const id = t._id || t.id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    function tourMatchesQuery(t) {
      const haystack = [
        t.title,
        t.source,
        t.destination,
        t.category,
        t.tourType,
        t.description,
        ...(t.pickupPoints || []).map((pp) => pp.name),
        ...(t.itinerary || []).map((it) => it.location),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const fromWords = fromQ.split(/\s+/).filter(Boolean);
      const toWords = toQ.split(/\s+/).filter(Boolean);
      const matchFrom =
        fromQ === "" || fromWords.every((w) => haystack.includes(w));
      const matchTo = toQ === "" || toWords.every((w) => haystack.includes(w));
      const matchType =
        typeQ === "All" || haystack.includes(typeQ.toLowerCase());
      const matchDate = !t.startDate || new Date(t.startDate) >= searchDate;

      return matchFrom && matchTo && matchType && matchDate;
    }

    let filtered = pool.filter(tourMatchesQuery);

    // If nothing found locally, call the backend unified search as fallback
    if (filtered.length === 0 && combinedQ.length >= 2) {
      try {
        const res = await searchApi.unified(combinedQ);
        const apiTours = res?.data?.tours || [];
        // Also try the tours search endpoint for a broader match
        if (apiTours.length === 0) {
          const searchRes = await toursApi.search({ q: combinedQ, limit: 20 });
          filtered = searchRes?.data || searchRes || [];
        } else {
          filtered = apiTours;
        }
      } catch {}
    }

    setSearchResults(filtered);
    // Scroll down to tour results section
    if (scrollRef.current && toursYRef.current > 0) {
      scrollRef.current.scrollTo({ y: toursYRef.current, animated: true });
    }
  };

  useFocusEffect(
    useCallback(() => {
      const checkAuth = async () => {
        const ok = await authApi.isAuthenticated();
        setIsLoggedIn(ok);
        if (ok) {
          const role = await authApi.getRole();
          setUserRole(role || "user");
          const isOperator = ["admin", "super_admin", "manager"].includes(role);
          if (role === "volunteer") {
            volunteerApi
              .dashboard()
              .then((r) => setVolDashboard(r.data))
              .catch(() => {});
          }
          if (role === "super_admin") {
            api
              .get("/users/super-admin/stats")
              .then((r) => setAdminStats(r?.data || r))
              .catch(() => {});
          } else if (role === "admin" || role === "manager") {
            api
              .get("/analytics/dashboard-summary")
              .then((r) => setAdminStats(r?.data || r))
              .catch(() => {});
          }
          // Fetch wallet balance for all logged-in users (hide for super_admin/volunteer)
          if (!["super_admin", "volunteer"].includes(role)) {
            const walletEndpoint =
              role === "admin" || role === "manager"
                ? api.get("/operator-wallet")
                : walletApi.balance();
            walletEndpoint
              .then((r) => {
                const bal = r?.data?.balance ?? r?.balance ?? null;
                setWalletBalance(bal);
              })
              .catch(() => {});
          }
          if (!isOperator) {
            let ops = [];
            try {
              const res = await authApi.getProfile();
              const profile = res?.data || res?.user || res;
              if (
                Array.isArray(profile?.joinedOperators) &&
                profile.joinedOperators.length > 0
              ) {
                ops = profile.joinedOperators;
                // Merge-persist so joinedOperators isn't lost
                const AsyncStorage = (
                  await import("@react-native-async-storage/async-storage")
                ).default;
                const raw = await AsyncStorage.getItem("user");
                const prev = raw ? JSON.parse(raw) : {};
                await AsyncStorage.setItem(
                  "user",
                  JSON.stringify({ ...prev, joinedOperators: ops }),
                );
              }
            } catch {}
            if (ops.length === 0) {
              try {
                const AsyncStorage = (
                  await import("@react-native-async-storage/async-storage")
                ).default;
                const raw = await AsyncStorage.getItem("user");
                if (raw) {
                  const u = JSON.parse(raw);
                  if (Array.isArray(u.joinedOperators)) ops = u.joinedOperators;
                }
              } catch {}
            }
            setJoinedOps(ops);
          } else {
            setJoinedOps([]); // operators see everything — no filter
          }
        }
        setAuthChecked(true);
      };
      checkAuth();
    }, []),
  );

  // These are language-aware and must be inside the component
  const QUICK_ACTIONS = [
    {
      icon: "bus",
      label: t.bookBus,
      sub: t.bookBusSub,
      route: "/(tabs)/tours",
      tint: "#D95D39",
    },
    {
      icon: "people",
      label: t.membership,
      sub: t.membershipSub,
      route: "/(tabs)/profile",
      tint: "#5C1615",
    },
    {
      icon: "heart",
      label: t.donate,
      sub: t.donateSub,
      route: "/donate",
      tint: "#B94929",
    },
    {
      icon: "call",
      label: t.contact,
      sub: t.contactSub,
      route: "/contact",
      tint: "#8A2A28",
    },
  ];

  const WHY_FEATURES = [
    {
      icon: "bus",
      label: "Modern Fleet",
      sub: "AC & Non-AC coaches for every journey",
      color: "#D95D39",
    },
    {
      icon: "location",
      label: "GPS Tracked",
      sub: "Live location updates for every route",
      color: "#0284C7",
    },
    {
      icon: "people",
      label: "Group Travel",
      sub: "Book seats together, travel as one",
      color: "#16A34A",
    },
    {
      icon: "shield-checkmark",
      label: "Safe & Insured",
      sub: "Vetted operators, insured journeys",
      color: "#7C3AED",
    },
  ];

  // ── Load new sections with fallback ──────────────────────────────────────
  const loadTrending = async (allTours) => {
    setTrendingLoading(true);
    try {
      const res = await toursApi.trending();
      const data = extractArray(res);
      setTrendingTours(data.length > 0 ? data : fallbackTrending(allTours));
    } catch {
      setTrendingTours(fallbackTrending(allTours));
    } finally {
      setTrendingLoading(false);
    }
  };

  const loadTopRated = async (allTours) => {
    setTopRatedLoading(true);
    try {
      const res = await toursApi.topRated();
      const data = extractArray(res);
      setTopRatedTours(data.length > 0 ? data : fallbackTopRated(allTours));
    } catch {
      setTopRatedTours(fallbackTopRated(allTours));
    } finally {
      setTopRatedLoading(false);
    }
  };

  const loadOffers = async (allTours) => {
    setOffersLoading(true);
    try {
      const res = await toursApi.specialOffers();
      const now = new Date();
      const data = extractArray(res).filter((t) => {
        // External/aggregated tours (no dates): always include
        if (t.isExternal) return true;
        // Platform tours: exclude if end date has passed
        const end = t.endDate
          ? new Date(t.endDate)
          : t.startDate
            ? new Date(t.startDate)
            : null;
        if (end && end < now) return false;
        return true;
      });
      setSpecialOffers(data.length > 0 ? data : fallbackOffers(allTours));
    } catch {
      setSpecialOffers(fallbackOffers(allTours));
    } finally {
      setOffersLoading(false);
    }
  };

  const load = async () => {
    try {
      const res = await toursApi.upcoming().catch(() => []);
      setUpcoming(Array.isArray(res) ? res : res?.data || []);
      const f = await feedbackApi.public(6).catch(() => ({ data: [] }));
      setFeedbacks(f?.data || []);

      // Fetch all tours once, use as fallback for new sections
      let allTours = [];
      try {
        const allRes = await toursApi.all();
        allTours = extractArray(allRes);
      } catch {}

      // Fire new section loads in parallel (each manages own loading state)
      loadTrending(allTours);
      loadTopRated(allTours);
      loadOffers(allTours);

      // Dynamic stats and settings (fire and forget, non-blocking)
      publicStats
        .get()
        .then((s) => setStatsData(s))
        .catch(() => {});
      publicSettings
        .get()
        .then((s) =>
          setAppSettings({
            maintenanceMode: s.maintenanceMode,
            announcement: s.announcement || "",
          }),
        )
        .catch(() => {});
    } finally {
      setLoading(false);
      Animated.timing(fade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  };

  useEffect(() => {
    // Prefetch all banner images immediately so carousel loads faster
    BANNERS.forEach((url) => Image.prefetch(url).catch(() => {}));
    load();
  }, []);

  useEffect(() => {
    const i = setInterval(() => {
      setSlide((s) => {
        const next = (s + 1) % BANNERS.length;
        bannerRef.current?.scrollTo({ x: next * BANNER_W, animated: true });
        return next;
      });
    }, 4500);
    return () => clearInterval(i);
  }, []);

  // Reload profile completion every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      getProfileCompletion().then(setProfileCompletion);
    }, []),
  );

  // Immediately reflect admin settings changes (maintenance mode / announcement)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("appSettingsChanged", (cfg) => {
      setAppSettings({
        maintenanceMode: cfg.maintenanceMode,
        announcement: cfg.announcement || "",
      });
    });
    return () => sub.remove();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const formatDate = (s, e) => {
    try {
      const sd = new Date(s).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const ed = new Date(e).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${sd} – ${ed}`;
    } catch {
      return "";
    }
  };

  const formatPrice = (tour) => {
    if (tour.price) return `₹${tour.price}`;
    if (tour.pricePerPerson) return `₹${tour.pricePerPerson}`;
    return "₹—";
  };

  // ── Trending / Top Rated card renderer ───────────────────────────────────
  const renderDiscoverCard = (item, badgeLabel, badgeStyle) => (
    <TouchableOpacity
      key={item._id || item.id}
      activeOpacity={0.88}
      style={styles.discoverCard}
      onPress={() => router.push(`/tour/${item._id || item.id}`)}
    >
      {/* Cover image */}
      <Image
        source={{ uri: resolveImageUrl(item.coverPhotoUrl) }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      {/* Gradient overlay */}
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.72)"]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Favorite button top-left */}
      <TouchableOpacity style={styles.heartBtn} activeOpacity={0.8}>
        <Ionicons name="heart-outline" size={16} color="#fff" />
      </TouchableOpacity>

      {/* Badge top-right */}
      <View style={[styles.discoverBadge, badgeStyle]}>
        <Text style={styles.discoverBadgeText}>{badgeLabel}</Text>
      </View>

      {/* Bottom info */}
      <View style={styles.discoverCardContent}>
        <Text style={styles.discoverTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {(item.source || item.destination) && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginTop: 3,
            }}
          >
            <Ionicons name="location-outline" size={10} color="#FFE9C0" />
            <Text style={styles.discoverRoute} numberOfLines={1}>
              {item.source || ""}
              {item.source && item.destination ? " → " : ""}
              {item.destination || ""}
            </Text>
          </View>
        )}
        <View style={styles.discoverFooter}>
          <Text style={styles.discoverPrice}>{formatPrice(item)}</Text>
          {item.avgRating > 0 && (
            <StarRow
              rating={item.avgRating}
              count={item.ratingCount}
              size={10}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // ── Special Offer card renderer ───────────────────────────────────────────
  const renderOfferCard = (item, idx) => {
    const gradient = OFFER_GRADIENTS[idx % OFFER_GRADIENTS.length];
    const discountPct = item.discountPercent || 0;
    const originalPrice = item.originalPrice || item.pricePerPerson || item.price || 0;
    const discountedPrice = item.discountedPrice || (discountPct > 0 ? Math.round(originalPrice * (1 - discountPct / 100)) : null);
    const hasImage = !!item.coverPhotoUrl;

    return (
      <TouchableOpacity
        key={item._id || item.id}
        activeOpacity={0.88}
        style={styles.offerCard}
        onPress={() => router.push(`/tour/${item._id || item.id}`)}
      >
        {/* Background image */}
        {hasImage && (
          <Image
            source={{ uri: item.coverPhotoUrl }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        )}
        {/* Gradient overlay */}
        <LinearGradient
          colors={hasImage ? ["rgba(0,0,0,0.1)", "rgba(0,0,0,0.82)"] : gradient}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Top row: source + discount badges */}
        <View style={styles.offerTopRow}>
          {item.isExternal && item.externalSource ? (
            <View style={styles.offerSourceBadge}>
              <Ionicons name="globe-outline" size={9} color="#fff" />
              <Text style={styles.offerSourceTxt} numberOfLines={1}>{item.externalSource}</Text>
            </View>
          ) : <View />}
          {discountPct > 0 && (
            <View style={styles.offerDiscountBadge}>
              <Text style={styles.offerDiscountText}>{discountPct}% OFF</Text>
            </View>
          )}
        </View>

        {/* Bottom content */}
        <View style={styles.offerCardContent}>
          <Text style={styles.offerTitle} numberOfLines={2}>{item.title}</Text>
          {(item.source || item.destination) && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 }}>
              <Ionicons name="location-outline" size={10} color="rgba(255,255,255,0.75)" />
              <Text style={styles.offerRoute} numberOfLines={1}>
                {[item.source, item.destination].filter(Boolean).join(" → ")}
              </Text>
            </View>
          )}
          <View style={styles.offerPriceRow}>
            <View>
              {discountedPrice ? (
                <>
                  <Text style={styles.offerOriginalPrice}>₹{originalPrice}</Text>
                  <Text style={styles.offerFinalPrice}>₹{discountedPrice}</Text>
                </>
              ) : (
                <Text style={styles.offerFinalPrice}>{formatPrice(item)}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.offerBookBtn}
              onPress={() => router.push(`/tour/${item._id || item.id}`)}
              activeOpacity={0.85}
            >
              <Text style={styles.offerBookBtnText}>Book Now</Text>
              <Ionicons name="arrow-forward" size={11} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Build dynamic stats pills
  const QUICK_STATS = [
    {
      icon: "bus",
      label: "Tours",
      value: fmtStat(statsData.tours),
      color: "#D95D39",
    },
    {
      icon: "location",
      label: "Cities",
      value: fmtStat(statsData.cities),
      color: "#0284C7",
    },
    {
      icon: "people",
      label: "Travelers",
      value: fmtStat(statsData.travelers),
      color: "#16A34A",
    },
    {
      icon: "star",
      label: "5-Star Reviews",
      value: fmtStat(statsData.fiveStarReviews),
      color: "#F59E0B",
    },
  ];

  if (appSettings.maintenanceMode) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
        edges={["top"]}
      >
        <Ionicons name="construct-outline" size={64} color={colors.primary} />
        <Text
          style={{
            fontFamily: fonts.heading,
            fontSize: 26,
            color: colors.secondary,
            textAlign: "center",
            marginTop: 20,
          }}
        >
          Under Maintenance
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: 12,
            lineHeight: 22,
          }}
        >
          {appSettings.announcement ||
            "We are performing scheduled maintenance. Please check back shortly."}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        testID="home-scroll"
      >
        {/* Announcement Banner */}
        {!!appSettings.announcement?.trim() && (
          <View style={styles.announcementBanner}>
            <Ionicons name="megaphone-outline" size={15} color="#92400E" />
            <Text style={styles.announcementText} numberOfLines={3}>
              {appSettings.announcement}
            </Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {userRole === "volunteer"
                ? "Welcome Back"
                : userRole === "super_admin"
                  ? "Command Center"
                  : userRole === "admin" || userRole === "manager"
                    ? "Operator Hub"
                    : "TripKart"}
            </Text>
            <Text style={styles.greetSub}>
              {userRole === "volunteer"
                ? "Volunteer Portal · TripKart"
                : userRole === "super_admin"
                  ? "Super Admin · TripKart"
                  : userRole === "admin" || userRole === "manager"
                    ? "Admin Panel · TripKart"
                    : t.appName}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* Wallet button — shown to logged-in users and operators */}
            {isLoggedIn && !["super_admin", "volunteer"].includes(userRole) && (
              <TouchableOpacity
                style={styles.walletHeaderBtn}
                onPress={() => {
                  const dest =
                    userRole === "admin" || userRole === "manager"
                      ? "/admin/wallet"
                      : "/wallet";
                  router.push(dest);
                }}
              >
                <Ionicons name="wallet" size={14} color="#fff" />
                {walletBalance !== null && (
                  <Text style={styles.walletHeaderBal}>
                    ₹
                    {walletBalance >= 1000
                      ? (walletBalance / 1000).toFixed(1) + "k"
                      : walletBalance.toLocaleString("en-IN")}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Search Bar ── opens SearchModal ─────────────────────────────── */}
        <TouchableOpacity
          style={styles.searchCard}
          activeOpacity={0.85}
          onPress={() => setShowSearchModal(true)}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.textDisabled}
            style={{ marginRight: 10 }}
          />
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.textDisabled,
              flex: 1,
            }}
          >
            Search tours, destinations...
          </Text>
          <View
            style={{
              backgroundColor: colors.elevated,
              borderRadius: 8,
              padding: 6,
            }}
          >
            <Ionicons name="options-outline" size={16} color="#D95D39" />
          </View>
        </TouchableOpacity>

        {/* SearchModal */}
        <SearchModal
          visible={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onSearch={(q) => {
            setShowSearchModal(false);
            router.push(`/(tabs)/tours?q=${encodeURIComponent(q)}`);
          }}
          onSelectResult={(tour) => {
            setShowSearchModal(false);
            router.push(`/tour/${tour._id || tour.id}`);
          }}
          tours={[...upcoming, ...trendingTours, ...topRatedTours]}
        />

        {/* Hero Banner */}
        <Animated.View style={[styles.banner, { opacity: fade }]}>
          {/* Swipable image track */}
          <ScrollView
            ref={bannerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_W);
              if (idx !== slide) setSlide(idx);
            }}
            style={StyleSheet.absoluteFillObject}
          >
            {BANNERS.map((b, i) => (
              <Image
                key={i}
                source={{ uri: b }}
                resizeMode="cover"
                style={{ width: BANNER_W, height: 320 }}
              />
            ))}
          </ScrollView>
          <LinearGradient
            colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.25)", "rgba(0,0,0,0.75)"]}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View style={styles.bannerContent}>
            <Text style={styles.bannerAccent}>{t.monthlyYatra}</Text>
            <Text style={styles.bannerTitle}>{t.bannerTitle}</Text>
            <Text style={styles.bannerSub}>{t.bannerSub}</Text>
            <TouchableOpacity
              style={styles.bannerCta}
              onPress={() => router.push("/(tabs)/tours")}
              testID="hero-explore-btn"
            >
              <Text style={styles.bannerCtaText}>{t.exploreToursBtn}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
            <View style={styles.dots}>
              {BANNERS.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === slide && styles.dotActive]}
                />
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ── Quick Stats Row ──────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}
          style={{ marginTop: 16 }}
        >
          {QUICK_STATS.map((stat, i) => (
            <View
              key={i}
              style={[styles.statPill, { borderColor: stat.color + "22" }]}
            >
              <Ionicons name={stat.icon} size={14} color={stat.color} />
              <Text style={[styles.statValue, { color: stat.color }]}>
                {stat.value}
              </Text>
              <Text style={styles.statLabel}>{stat.label.toLowerCase()}</Text>
            </View>
          ))}
        </ScrollView>

        {/* ── Profile Completion Card ──────────────────────────────────── */}
        {isLoggedIn &&
          userRole !== "volunteer" &&
          userRole !== "super_admin" &&
          profileCompletion &&
          profileCompletion.percentage < 100 && (
            <View
              style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 4 }}
            >
              <View style={styles.profileCard}>
                {/* Header row */}
                <View style={styles.profileCardHeader}>
                  <View style={styles.profileCardIconWrap}>
                    <Ionicons
                      name="person-circle-outline"
                      size={26}
                      color="#D95D39"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileCardTitle}>
                      Complete Your Profile
                    </Text>
                    <Text style={styles.profileCardSub}>
                      {profileCompletion.completed}/{profileCompletion.total}{" "}
                      steps done
                    </Text>
                  </View>
                  <View style={styles.profilePctWrap}>
                    <Text style={styles.profilePct}>
                      {profileCompletion.percentage}%
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.profileBarBg}>
                  <View
                    style={[
                      styles.profileBarFill,
                      { width: `${profileCompletion.percentage}%` },
                    ]}
                  />
                </View>

                {/* Step pills */}
                <View style={styles.profileSteps}>
                  {profileCompletion.steps.map((step) => (
                    <View
                      key={step.key}
                      style={[
                        styles.profileStepPill,
                        step.done && styles.profileStepPillDone,
                      ]}
                    >
                      <Ionicons
                        name={step.done ? "checkmark-circle" : step.icon}
                        size={13}
                        color={step.done ? "#16A34A" : colors.textDisabled}
                      />
                      <Text
                        style={[
                          styles.profileStepTxt,
                          step.done && styles.profileStepTxtDone,
                        ]}
                      >
                        {step.label}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* CTA button */}
                {profileCompletion.firstIncomplete && (
                  <TouchableOpacity
                    style={styles.profileCta}
                    onPress={() =>
                      router.push(profileCompletion.firstIncomplete.route)
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.profileCtaTxt}>
                      Complete: {profileCompletion.firstIncomplete.label}
                    </Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

        {/* ── Volunteer Home Section ──────────────────────────────────────── */}
        {isLoggedIn && userRole === "volunteer" && (
          <View style={styles.section}>
            <View style={styles.roleBanner}>
              <View style={styles.roleBannerTop}>
                <View
                  style={[
                    styles.roleBannerIcon,
                    { backgroundColor: colors.elevated },
                  ]}
                >
                  <Ionicons name="shield-checkmark" size={22} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleBannerTitle, { color: "#16A34A" }]}>
                    Volunteer Panel
                  </Text>
                  <Text
                    style={[
                      styles.roleBannerSub,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {volDashboard?.assignedTours?.length
                      ? `${volDashboard.assignedTours.length} tour${volDashboard.assignedTours.length > 1 ? "s" : ""} assigned`
                      : "No tours assigned yet"}
                  </Text>
                </View>
              </View>
              {volDashboard?.todayTour && (
                <View style={styles.todayTourCard}>
                  <Ionicons name="today" size={14} color="#16A34A" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.todayTourLabel}>Today's Tour</Text>
                    <Text style={styles.todayTourName} numberOfLines={1}>
                      {volDashboard.todayTour.title}
                    </Text>
                    <Text style={styles.todayTourMeta}>
                      {volDashboard.todayTour.source} →{" "}
                      {volDashboard.todayTour.destination}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.todayTourBtn}
                    onPress={() =>
                      router.push(
                        "/volunteer/checkin?tourId=" +
                          volDashboard.todayTour._id,
                      )
                    }
                  >
                    <Text style={styles.todayTourBtnTxt}>Check In</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.volActionsRow}>
                {[
                  {
                    icon: "location",
                    label: "Check In",
                    color: "#16A34A",
                    route: "/volunteer/checkin",
                  },
                  {
                    icon: "qr-code",
                    label: "Scan QR",
                    color: "#16A34A",
                    route: "/volunteer/checkin",
                  },
                  {
                    icon: "people",
                    label: "Passengers",
                    color: "#16A34A",
                    route: "/volunteer/passengers",
                  },
                  {
                    icon: "warning",
                    label: "Report",
                    color: "#EF4444",
                    route: "/volunteer/report-incident",
                  },
                ].map((a) => (
                  <TouchableOpacity
                    key={a.label}
                    style={styles.volActionBtn}
                    onPress={() =>
                      router.push(
                        (a.route === "/volunteer/checkin" ||
                          a.route === "/volunteer/passengers") &&
                          volDashboard?.todayTour
                          ? a.route + "?tourId=" + volDashboard.todayTour._id
                          : a.route,
                      )
                    }
                  >
                    <Ionicons name={a.icon} size={18} color={a.color} />
                    <Text style={[styles.volActionTxt, { color: a.color }]}>
                      {a.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── Admin / Manager Home Section ────────────────────────────────── */}
        {isLoggedIn && (userRole === "admin" || userRole === "manager") && (
          <View style={styles.section}>
            <View style={styles.roleBanner}>
              <View style={styles.roleBannerTop}>
                <View
                  style={[
                    styles.roleBannerIcon,
                    { backgroundColor: colors.elevated },
                  ]}
                >
                  <Ionicons name="shield" size={22} color="#D95D39" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleBannerTitle, { color: "#D95D39" }]}>
                    Admin Dashboard
                  </Text>
                  <Text
                    style={[
                      styles.roleBannerSub,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Manage your tour operations
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.roleBannerCta}
                  onPress={() => router.push("/admin/dashboard")}
                >
                  <Text style={[styles.roleBannerCtaTxt, { color: "#D95D39" }]}>
                    Full View
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color="#D95D39" />
                </TouchableOpacity>
              </View>
              <View style={styles.adminStatsRow}>
                {[
                  {
                    label: "Bookings",
                    value: adminStats?.totalBookings ?? "—",
                    icon: "ticket",
                    color: "#EF4444",
                  },
                  {
                    label: "Tours",
                    value: adminStats?.tourCount ?? "—",
                    icon: "bus",
                    color: "#16A34A",
                  },
                  {
                    label: "Revenue",
                    value: adminStats?.monthRevenue
                      ? "₹" + Math.round(adminStats.monthRevenue / 1000) + "k"
                      : "—",
                    icon: "cash",
                    color: "#D97706",
                  },
                ].map((st) => (
                  <View key={st.label} style={styles.adminStatCard}>
                    <Ionicons name={st.icon} size={16} color={st.color} />
                    <Text style={[styles.adminStatValue, { color: st.color }]}>
                      {String(st.value)}
                    </Text>
                    <Text style={styles.adminStatLabel}>{st.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.adminActionsGrid}>
                {[
                  {
                    icon: "bus",
                    label: "Tours",
                    route: "/admin/tours",
                    color: "#16A34A",
                  },
                  {
                    icon: "ticket",
                    label: "Bookings",
                    route: "/admin/bookings",
                    color: "#D95D39",
                  },
                  {
                    icon: "people",
                    label: "Volunteers",
                    route: "/admin/volunteer-management",
                    color: "#7C3AED",
                  },
                  {
                    icon: "bar-chart",
                    label: "Analytics",
                    route: "/admin/analytics",
                    color: "#D97706",
                  },
                ].map((a) => (
                  <TouchableOpacity
                    key={a.label}
                    style={styles.adminActionBtn}
                    onPress={() => router.push(a.route)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={a.icon} size={20} color={a.color} />
                    <Text style={[styles.adminActionTxt, { color: a.color }]}>
                      {a.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── Super Admin Home Section ─────────────────────────────────────── */}
        {isLoggedIn && userRole === "super_admin" && (
          <View style={styles.section}>
            <View style={styles.roleBanner}>
              <View style={styles.roleBannerTop}>
                <View
                  style={[
                    styles.roleBannerIcon,
                    { backgroundColor: colors.elevated },
                  ]}
                >
                  <Ionicons name="planet" size={22} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.roleBannerTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    Super Admin
                  </Text>
                  <Text
                    style={[
                      styles.roleBannerSub,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Platform-wide overview
                  </Text>
                </View>
              </View>
              <View style={styles.adminStatsRow}>
                {[
                  {
                    label: "Tours",
                    value: adminStats?.tours ?? "—",
                    icon: "bus",
                    color: "#EF4444",
                  },
                  {
                    label: "Users",
                    value: adminStats?.users ?? "—",
                    icon: "people",
                    color: "#2563EB",
                  },
                  {
                    label: "Operators",
                    value: adminStats?.operators ?? "—",
                    icon: "business",
                    color: "#16A34A",
                  },
                  {
                    label: "Bookings",
                    value: adminStats?.bookings ?? "—",
                    icon: "ticket",
                    color: "#D97706",
                  },
                ].map((st) => (
                  <View
                    key={st.label}
                    style={[
                      styles.adminStatCard,
                      {
                        backgroundColor: colors.elevated,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                  >
                    <Ionicons name={st.icon} size={15} color={st.color} />
                    <Text style={[styles.adminStatValue, { color: st.color }]}>
                      {String(st.value)}
                    </Text>
                    <Text style={styles.adminStatLabel}>{st.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.adminActionsGrid}>
                {[
                  {
                    icon: "business",
                    label: "Operators",
                    route: "/admin/super/operators",
                    color: "#7C3AED",
                  },
                  {
                    icon: "person",
                    label: "Users",
                    route: "/admin/super/users",
                    color: "#2563EB",
                  },
                  {
                    icon: "bus",
                    label: "All Tours",
                    route: "/admin/super/tours",
                    color: "#16A34A",
                  },
                  {
                    icon: "ticket",
                    label: "Bookings",
                    route: "/admin/super/bookings",
                    color: "#D95D39",
                  },
                ].map((a) => (
                  <TouchableOpacity
                    key={a.label}
                    style={styles.adminActionBtn}
                    onPress={() => router.push(a.route)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={a.icon} size={20} color={a.color} />
                    <Text style={[styles.adminActionTxt, { color: a.color }]}>
                      {a.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Quick actions — hide for volunteer and super_admin (they have dedicated sections) */}
        {userRole !== "volunteer" && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>QUICK ACCESS</Text>
            <View style={styles.quickGrid}>
              {QUICK_ACTIONS.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.85}
                  onPress={() => router.push(q.route)}
                  style={styles.quickCard}
                  testID={`quick-action-${i}`}
                >
                  <View
                    style={[
                      styles.quickIcon,
                      { backgroundColor: q.tint + "1A" },
                    ]}
                  >
                    <Ionicons name={q.icon} size={22} color={q.tint} />
                  </View>
                  <Text style={styles.quickLabel}>{q.label}</Text>
                  <Text style={styles.quickSub}>{q.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Upcoming Tours — logged-in users only, hide for volunteers (they use volunteer hub) */}
        {userRole !== "volunteer" &&
          (isLoggedIn ? (
            (() => {
              const isOp = ["admin", "super_admin", "manager"].includes(
                userRole,
              );
              const visibleTours = isOp
                ? upcoming
                : upcoming.filter((t) => {
                    if (t.isExternal) return true;
                    if (joinedOps.length === 0) return false;
                    const tid =
                      typeof t.operatorId === "object"
                        ? String(t.operatorId?._id)
                        : String(t.operatorId);
                    return joinedOps.some(
                      (op) =>
                        (typeof op === "object"
                          ? String(op._id)
                          : String(op)) === tid,
                    );
                  });
              const noOperatorSelected =
                !isOp &&
                authChecked &&
                joinedOps.length === 0 &&
                visibleTours.length === 0;
              return (
                <View style={styles.section}>
                  <View style={styles.sectionHead}>
                    <View>
                      <Text style={styles.h2}>{t.upcomingYatras}</Text>
                      <Text style={styles.h2Sub}>{t.upcomingYatrasSub}</Text>
                    </View>
                    {!noOperatorSelected && (
                      <TouchableOpacity
                        onPress={() => router.push("/(tabs)/tours")}
                        testID="view-all-tours-btn"
                      >
                        <Text style={styles.link}>{t.viewAll}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {loading ? (
                    <ActivityIndicator
                      color={colors.primary}
                      style={{ marginVertical: 32 }}
                    />
                  ) : noOperatorSelected ? (
                    <View style={styles.empty}>
                      <Ionicons
                        name="people-outline"
                        size={32}
                        color={colors.textDisabled}
                      />
                      <Text style={styles.emptyText}>No operator selected</Text>
                      <TouchableOpacity
                        style={styles.selectOpBtn}
                        onPress={() => router.push("/select-operators")}
                      >
                        <Text style={styles.selectOpTxt}>Select Operator</Text>
                      </TouchableOpacity>
                    </View>
                  ) : visibleTours.length === 0 ? (
                    <View style={styles.empty}>
                      <Ionicons
                        name="calendar-outline"
                        size={32}
                        color={colors.textDisabled}
                      />
                      <Text style={styles.emptyText}>{t.noUpcomingYatras}</Text>
                    </View>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 24 }}
                      snapToInterval={width * 0.72 + 16}
                      decelerationRate="fast"
                      snapToAlignment="start"
                    >
                      {visibleTours.map((tour, i) => (
                        <TouchableOpacity
                          key={tour._id || tour.id || i}
                          activeOpacity={0.9}
                          style={[
                            styles.tourCard,
                            tour.isExternal && styles.tourCardExternal,
                          ]}
                          onPress={() =>
                            router.push(`/tour/${tour._id || tour.id}`)
                          }
                          testID={`tour-card-${i}`}
                        >
                          <Image
                            source={{
                              uri: resolveImageUrl(tour.coverPhotoUrl),
                            }}
                            style={styles.tourImg}
                          />
                          <LinearGradient
                            colors={["transparent", "rgba(0,0,0,0.75)"]}
                            style={styles.tourGrad}
                          />
                          {/* Date badge — only for platform tours with dates */}
                          {!tour.isExternal &&
                          tour.startDate &&
                          tour.endDate ? (
                            <View style={styles.tourBadge}>
                              <Text style={styles.tourBadgeText}>
                                {formatDate(tour.startDate, tour.endDate)}
                              </Text>
                            </View>
                          ) : tour.isExternal ? (
                            <View
                              style={[
                                styles.tourBadge,
                                { backgroundColor: "#B94929" },
                              ]}
                            >
                              <Ionicons
                                name="globe-outline"
                                size={10}
                                color="#fff"
                              />
                              <Text
                                style={[
                                  styles.tourBadgeText,
                                  { marginLeft: 4, color: "#fff" },
                                ]}
                              >
                                {tour.externalSource || "Partner Site"}
                              </Text>
                            </View>
                          ) : null}
                          {/* Seats left urgency badge — only for platform tours */}
                          {!tour.isExternal &&
                            tour.availableSeats != null &&
                            tour.availableSeats <= 10 && (
                              <View
                                style={[
                                  styles.seatsLeftBadge,
                                  tour.availableSeats <= 3 && {
                                    backgroundColor: "#EF4444",
                                  },
                                ]}
                              >
                                <Ionicons name="people" size={9} color="#fff" />
                                <Text style={styles.seatsLeftTxt}>
                                  {tour.availableSeats === 0
                                    ? "Full"
                                    : `${tour.availableSeats} left`}
                                </Text>
                              </View>
                            )}
                          <View style={styles.tourCardContent}>
                            <Text style={styles.tourTitle} numberOfLines={1}>
                              {tour.title}
                            </Text>
                            <View style={styles.tourRow}>
                              <Ionicons
                                name="location"
                                size={12}
                                color="#FFE9C0"
                              />
                              <Text style={styles.tourMeta} numberOfLines={1}>
                                {tour.source} → {tour.destination}
                              </Text>
                            </View>
                            {tour.isExternal && tour.duration ? (
                              <View style={styles.tourRow}>
                                <Ionicons
                                  name="time-outline"
                                  size={12}
                                  color="#BAE6FD"
                                />
                                <Text
                                  style={[
                                    styles.tourMeta,
                                    { color: "#BAE6FD" },
                                  ]}
                                >
                                  {tour.duration}
                                </Text>
                              </View>
                            ) : null}
                            <View style={styles.tourFooter}>
                              <Text style={styles.tourPrice}>
                                {tour.price || "₹—"}
                              </Text>
                              <View style={[styles.bookPill, tour.isExternal]}>
                                <Text style={styles.bookPillText}>
                                  {tour.isExternal ? "View" : t.bookNow}
                                </Text>
                                <Ionicons
                                  name={
                                    tour.isExternal
                                      ? "open-outline"
                                      : "arrow-forward"
                                  }
                                  size={12}
                                  color="#fff"
                                />
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              );
            })()
          ) : (
            <View style={styles.section}>
              <View style={styles.loginCta}>
                <View style={styles.loginCtaIcon}>
                  <Ionicons name="bus" size={32} color={colors.primary} />
                </View>
                <Text style={styles.loginCtaTitle}>Discover Tours</Text>
                <Text style={styles.loginCtaSub}>
                  Sign in to view upcoming tours, check availability and book
                  your seat.
                </Text>
                <View style={styles.loginCtaRow}>
                  <TouchableOpacity
                    style={styles.loginBtn}
                    onPress={() => router.push("/auth/login")}
                  >
                    <Text style={styles.loginBtnTxt}>Sign In</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.registerBtn}
                    onPress={() => router.push("/auth/register")}
                  >
                    <Text style={styles.registerBtnTxt}>Create Account</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

        {/* ── Trending Tours ──────────────────────────────────────────────── */}
        {/* <View style={styles.section}>
          <SectionHeader
            title="🔥 Trending Tours"
            subtitle="Most popular right now"
            onSeeAll={() => router.push("/(tabs)/tours")}
          />
          {trendingLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 24 }}
            >
              {[1, 2, 3].map((k) => (
                <ShimmerCard key={k} width={220} height={280} borderRadius={24} />
              ))}
            </ScrollView>
          ) : trendingTours.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="flame-outline" size={28} color={colors.textDisabled} />
              <Text style={styles.emptyText}>No trending tours yet</Text>
            </View>
          ) : (
            <FlatList
              data={trendingTours}
              keyExtractor={(item, i) => item._id || item.id || String(i)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 24 }}
              renderItem={({ item }) =>
                renderDiscoverCard(item, "TRENDING", styles.trendingBadge)
              }
            />
          )}
        </View> */}

        {/* ── Top Rated ───────────────────────────────────────────────────── */}
        {/* <View style={styles.section}>
          <SectionHeader
            title="⭐ Top Rated"
            subtitle="Highly reviewed by travelers"
            onSeeAll={() => router.push("/(tabs)/tours")}
          />
          {topRatedLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 24 }}
            >
              {[1, 2, 3].map((k) => (
                <ShimmerCard key={k} width={220} height={280} borderRadius={24} />
              ))}
            </ScrollView>
          ) : topRatedTours.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="star-outline" size={28} color={colors.textDisabled} />
              <Text style={styles.emptyText}>No top-rated tours yet</Text>
            </View>
          ) : (
            <FlatList
              data={topRatedTours}
              keyExtractor={(item, i) => item._id || item.id || String(i)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 24 }}
              renderItem={({ item }) =>
                renderDiscoverCard(item, "TOP RATED", styles.topRatedBadge)
              }
            />
          )}
        </View> */}

        {/* ── Special Offers (only when data exists) ──────────────────────── */}
        {!offersLoading && specialOffers.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="🎁 Special Offers"
              subtitle="Limited time deals"
              onSeeAll={() => router.push("/(tabs)/tours")}
            />
            <FlatList
              data={specialOffers}
              keyExtractor={(item, i) => item._id || item.id || String(i)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 24 }}
              renderItem={({ item, index }) => renderOfferCard(item, index)}
            />
          </View>
        )}
        {offersLoading && (
          <View style={styles.section}>
            <SectionHeader
              title="🎁 Special Offers"
              subtitle="Limited time deals"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 24 }}
            >
              {[1, 2].map((k) => (
                <ShimmerCard
                  key={k}
                  width={260}
                  height={200}
                  borderRadius={24}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Why Travel With Us */}
        <View style={styles.section}>
          <Text style={styles.h2}>Why Travel With Us</Text>
          <Text style={styles.h2Sub}>Trusted by thousands of pilgrims</Text>
          <View style={styles.whyGrid}>
            {WHY_FEATURES.map((f, i) => (
              <View key={i} style={styles.whyCard}>
                <View
                  style={[styles.whyIcon, { backgroundColor: f.color + "18" }]}
                >
                  <Ionicons name={f.icon} size={22} color={f.color} />
                </View>
                <Text style={styles.whyLabel}>{f.label}</Text>
                <Text style={styles.whySub}>{f.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Feedback */}
        {feedbacks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.h2}>{t.devoteesVoice}</Text>
            <Text style={styles.h2Sub}>{t.devoteesVoiceSub}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 16 }}
              contentContainerStyle={{ paddingRight: 24 }}
            >
              {feedbacks.map((f, i) => (
                <View key={f._id || i} style={styles.feedbackCard}>
                  <View style={styles.feedbackHead}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(f.name || "?").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.feedbackName}>{f.name}</Text>
                      <View style={{ flexDirection: "row", marginTop: 2 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons
                            key={s}
                            name="star"
                            size={11}
                            color={s <= (f.rating || 5) ? "#F59E0B" : "#E8DFD8"}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.feedbackText} numberOfLines={5}>
                    "{f.message}"
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Footer mantra */}
        <View style={styles.mantra}>
          <Text style={styles.mantraText}>{t.mantra}</Text>
          <View style={styles.mantraDivider} />
          <Text style={styles.mantraEn}>{t.mantraEn}</Text>
        </View>
      </ScrollView>

      {/* Floating SOS button — only for logged-in users */}
      {isLoggedIn && (
        <TouchableOpacity
          style={styles.sosFab}
          onPress={() => router.push("/sos")}
          activeOpacity={0.85}
        >
          <Ionicons name="warning" size={18} color="white" />
          <Text style={styles.sosFabTxt}>SOS</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    announcementBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: colors.elevated,
      borderLeftWidth: 4,
      borderLeftColor: "#F59E0B",
      marginHorizontal: 16,
      marginTop: 8,
      borderRadius: 12,
      padding: 12,
    },
    announcementText: {
      flex: 1,
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: "#92400E",
      lineHeight: 19,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 16,
    },
    greeting: {
      fontSize: 24,
      fontFamily: fonts.heading,
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    greetSub: {
      fontSize: 12,
      fontFamily: fonts.bodyMedium,
      color: colors.textSecondary,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginTop: 2,
    },
    bell: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    walletHeaderBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 6,
      backgroundColor: colors.primary,
      borderRadius: 999,
    },
    walletHeaderBal: {
      fontFamily: fonts.bodyBold,
      fontSize: 11,
      color: "#fff",
      letterSpacing: 0.3,
    },
    langBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.surface,
      borderRadius: 999,
    },
    langText: {
      fontFamily: fonts.bodyBold,
      fontSize: 11,
      color: "#fff",
      letterSpacing: 1,
    },

    banner: {
      marginHorizontal: 16,
      height: 320,
      borderRadius: 24,
      overflow: "hidden",
      backgroundColor: "#111827",
    },
    bannerContent: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, padding: 24, justifyContent: "flex-end" },
    bannerAccent: {
      color: "#FFE9C0",
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      letterSpacing: 3,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    bannerTitle: {
      color: "#FFFFFF",
      fontSize: 32,
      fontFamily: fonts.heading,
      letterSpacing: -0.5,
      lineHeight: 36,
    },
    bannerSub: {
      color: "#FFE9C0",
      fontFamily: fonts.body,
      fontSize: 13,
      marginTop: 6,
    },
    bannerCta: {
      marginTop: 16,
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 999,
      gap: 8,
    },
    bannerCtaText: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 13 },
    dots: {
      flexDirection: "row",
      position: "absolute",
      bottom: 18,
      right: 24,
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "rgba(255,255,255,0.4)",
    },
    dotActive: { backgroundColor: "#fff", width: 20 },

    // ── Quick Stats ────────────────────────────────────────────────────────────
    statsRow: {
      paddingHorizontal: 20,
      paddingVertical: 4,
      gap: 10,
    },
    statPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.surface,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderWidth: 1,
    },
    statValue: {
      fontFamily: fonts.bodyBold,
      fontSize: 13,
    },
    statLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
    },

    announce: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: 24,
      marginTop: 16,
      padding: 14,
      backgroundColor: colors.primaryLight,
      borderRadius: 16,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    announceText: {
      flex: 1,
      color: colors.secondary,
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
    },

    section: { paddingHorizontal: 24, paddingTop: 32 },
    sectionLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      color: colors.textDisabled,
      letterSpacing: 3,
      textTransform: "uppercase",
      marginBottom: 12,
    },
    sectionHead: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    h2: {
      fontFamily: fonts.heading,
      fontSize: 24,
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    h2Sub: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    link: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary },

    quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    quickCard: {
      flex: 1,
      minWidth: 130,
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    quickIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    quickLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    quickSub: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },

    // Profile completion card
    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.borderSubtle,
      padding: 16,
      gap: 12,
    },
    profileCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    profileCardIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.elevated,
      alignItems: "center",
      justifyContent: "center",
    },
    profileCardTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    profileCardSub: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    profilePctWrap: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 3,
      borderColor: "#D95D39",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.elevated,
    },
    profilePct: { fontFamily: fonts.heading, fontSize: 15, color: "#D95D39" },
    profileBarBg: {
      height: 6,
      backgroundColor: colors.elevated,
      borderRadius: 3,
    },
    profileBarFill: { height: 6, backgroundColor: "#D95D39", borderRadius: 3 },
    profileSteps: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    profileStepPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    profileStepPillDone: {
      backgroundColor: colors.elevated,
      borderColor: "#BBF7D0",
    },
    profileStepTxt: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textDisabled,
    },
    profileStepTxtDone: { color: "#16A34A" },
    profileCta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: "#D95D39",
      paddingVertical: 11,
      borderRadius: 10,
    },
    profileCtaTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },

    empty: { alignItems: "center", paddingVertical: 32, gap: 6 },
    emptyText: {
      fontFamily: fonts.bodyMedium,
      color: colors.textSecondary,
      marginTop: 8,
    },
    selectOpBtn: {
      marginTop: 12,
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: colors.primary,
      borderRadius: 999,
    },
    selectOpTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },

    tourCard: {
      width: width * 0.72,
      height: 240,
      marginRight: 16,
      borderRadius: 24,
      overflow: "hidden",
      backgroundColor: colors.elevated,
    },
    tourCardExternal: {
      // borderWidth: 2,
      // borderColor: "#0284C7",
    },
    tourImg: {
      ...StyleSheet.absoluteFillObject,
      width: "100%",
      height: "100%",
    },
    tourGrad: { ...StyleSheet.absoluteFillObject },
    tourBadge: {
      position: "absolute",
      top: 14,
      left: 14,
      backgroundColor: "rgba(255,255,255,0.92)",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      flexDirection: "row",
      alignItems: "center",
    },
    tourBadgeText: {
      fontFamily: fonts.bodyBold,
      fontSize: 11,
      color: colors.textPrimary,
    },
    seatsLeftBadge: {
      position: "absolute",
      top: 14,
      right: 14,
      backgroundColor: "#F97316",
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 999,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    seatsLeftTxt: {
      fontFamily: fonts.bodyBold,
      fontSize: 10,
      color: "#fff",
    },
    tourCardContent: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
    },
    tourTitle: { color: "#fff", fontFamily: fonts.heading, fontSize: 20 },
    tourRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
    },
    tourMeta: {
      color: "#FFE9C0",
      fontFamily: fonts.body,
      fontSize: 12,
      flex: 1,
    },
    tourFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 10,
    },
    tourPrice: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 18 },
    bookPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    bookPillText: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 11 },

    // ── Discover cards (Trending / Top Rated) ──────────────────────────────────
    discoverCard: {
      width: 220,
      height: 280,
      marginRight: 14,
      borderRadius: 24,
      overflow: "hidden",
      backgroundColor: colors.elevated,
    },
    heartBtn: {
      position: "absolute",
      top: 12,
      left: 12,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "rgba(0,0,0,0.35)",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    discoverBadge: {
      position: "absolute",
      top: 12,
      right: 12,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      zIndex: 2,
    },
    trendingBadge: {
      backgroundColor: "#EF4444",
    },
    topRatedBadge: {
      backgroundColor: "#D97706",
    },
    discoverBadgeText: {
      fontFamily: fonts.bodyBold,
      fontSize: 9,
      color: "#fff",
      letterSpacing: 0.5,
    },
    discoverCardContent: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 14,
    },
    discoverTitle: {
      color: "#fff",
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    discoverRoute: {
      color: "#FFE9C0",
      fontFamily: fonts.body,
      fontSize: 10,
      flex: 1,
    },
    discoverFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8,
    },
    discoverPrice: {
      color: "#FCD34D",
      fontFamily: fonts.bodyBold,
      fontSize: 15,
    },

    // ── Special Offer cards ───────────────────────────────────────────────────
    offerCard: {
      width: 230,
      height: 175,
      marginRight: 14,
      borderRadius: 20,
      overflow: "hidden",
      justifyContent: "space-between",
    },
    offerTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: 12,
    },
    offerSourceBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(0,0,0,0.45)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    offerSourceTxt: {
      fontFamily: fonts.bodyBold,
      fontSize: 9,
      color: "#fff",
      maxWidth: 90,
    },
    offerDiscountBadge: {
      backgroundColor: "#EF4444",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    offerDiscountText: {
      fontFamily: fonts.bodyBold,
      fontSize: 10,
      color: "#fff",
      letterSpacing: 0.3,
    },
    offerCardContent: {
      padding: 13,
      paddingTop: 0,
    },
    offerTitle: {
      color: "#fff",
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      lineHeight: 19,
    },
    offerRoute: {
      color: "rgba(255,255,255,0.72)",
      fontFamily: fonts.body,
      fontSize: 10,
      flex: 1,
    },
    offerDate: {
      color: "rgba(255,255,255,0.72)",
      fontFamily: fonts.body,
      fontSize: 10,
      flex: 1,
    },
    offerPriceRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginTop: 8,
    },
    offerOriginalPrice: {
      color: "rgba(255,255,255,0.55)",
      fontFamily: fonts.bodyMedium,
      fontSize: 10,
      textDecorationLine: "line-through",
    },
    offerFinalPrice: {
      color: "#fff",
      fontFamily: fonts.bodyBold,
      fontSize: 17,
    },
    offerBookBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.38)",
    },
    offerBookBtnText: {
      color: "#fff",
      fontFamily: fonts.bodyBold,
      fontSize: 11,
    },

    whyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
    whyCard: {
      flex: 1,
      minWidth: 130,
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    whyIcon: {
      width: 46,
      height: 46,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    whyLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
      marginBottom: 3,
    },
    whySub: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 16,
    },

    loginCta: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 28,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    loginCtaIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.elevated,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    loginCtaTitle: {
      fontFamily: fonts.heading,
      fontSize: 22,
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: 6,
    },
    loginCtaSub: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 19,
      marginBottom: 20,
    },
    loginCtaRow: { flexDirection: "row", gap: 12, width: "100%" },
    loginBtn: {
      flex: 1,
      height: 48,
      backgroundColor: colors.primary,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    loginBtnTxt: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 14 },
    registerBtn: {
      flex: 1,
      height: 48,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: colors.textDisabled,
      alignItems: "center",
      justifyContent: "center",
    },
    registerBtnTxt: {
      color: colors.textPrimary,
      fontFamily: fonts.bodyBold,
      fontSize: 14,
    },

    feedbackCard: {
      width: width * 0.75,
      marginRight: 14,
      backgroundColor: colors.surface,
      padding: 18,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    feedbackHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { color: "#fff", fontFamily: fonts.bodyBold },
    feedbackName: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    feedbackText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
      fontStyle: "italic",
    },

    // ── Role-specific banner ──────────────────────────────────────────────────
    roleBanner: {
      borderRadius: 24,
      padding: 20,
      gap: 14,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
    },
    roleBannerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
    roleBannerIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    roleBannerTitle: { fontFamily: fonts.bodyBold, fontSize: 16 },
    roleBannerSub: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    roleBannerCta: { flexDirection: "row", alignItems: "center", gap: 4 },
    roleBannerCtaTxt: {
      fontFamily: fonts.bodyBold,
      fontSize: 12,
    },

    // Volunteer specific
    todayTourCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.elevated,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: "#BBF7D0",
    },
    todayTourLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 9,
      color: "#16A34A",
      letterSpacing: 2,
      marginBottom: 2,
    },
    todayTourName: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    todayTourMeta: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    todayTourBtn: {
      backgroundColor: "#16A34A",
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#BBF7D0",
    },
    todayTourBtnTxt: {
      fontFamily: fonts.bodyBold,
      fontSize: 12,
      color: "#fff",
    },
    volActionsRow: {
      flexDirection: "row",
      gap: 8,
    },
    volActionBtn: {
      flex: 1,
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.elevated,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#BBF7D0",
    },
    volActionTxt: { fontFamily: fonts.bodyBold, fontSize: 10 },

    // Admin specific
    adminStatsRow: {
      flexDirection: "row",
      gap: 8,
    },
    adminStatCard: {
      flex: 1,
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.elevated,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    adminStatValue: { fontFamily: fonts.bodyBold, fontSize: 18 },
    adminStatLabel: {
      fontFamily: fonts.body,
      fontSize: 10,
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    adminActionsGrid: { flexDirection: "row", gap: 8 },
    adminActionBtn: {
      flex: 1,
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.elevated,
      paddingVertical: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    adminActionTxt: { fontFamily: fonts.bodyBold, fontSize: 10 },

    mantra: {
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 40,
      paddingBottom: 12,
    },
    mantraText: {
      fontFamily: fonts.heading,
      fontSize: 22,
      color: "#D95D39",
      textAlign: "center",
    },
    mantraDivider: {
      width: 36,
      height: 2,
      backgroundColor: colors.primary,
      marginVertical: 12,
    },
    mantraEn: {
      fontFamily: fonts.bodyMedium,
      fontSize: 10,
      color: colors.textSecondary,
      letterSpacing: 2,
      textTransform: "uppercase",
      textAlign: "center",
    },
    sosFab: {
      position: "absolute",
      bottom: 16,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#DC2626",
      borderRadius: 28,
      paddingHorizontal: 16,
      paddingVertical: 10,
      shadowColor: "#DC2626",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
    },
    sosFabTxt: {
      fontFamily: fonts.bodyBold,
      fontSize: 13,
      color: "white",
      letterSpacing: 1,
    },

    // ── Search card ────────────────────────────────────────────────────────────
    searchCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.borderSubtle,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
    },
    chipRow: {
      paddingBottom: 4,
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1.5,
    },
    chipActive: {
      backgroundColor: "#D95D39",
      borderColor: "#D95D39",
    },
    chipInactive: {
      backgroundColor: colors.elevated,
      borderColor: "#E5C4B8",
    },
    chipText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
    },
    chipTextActive: {
      color: "#FFFFFF",
    },
    chipTextInactive: {
      color: "#5C1615",
    },
    searchInputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.elevated,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      gap: 10,
    },
    searchInputIconWrap: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    searchInput: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textPrimary,
      paddingVertical: 10,
    },
    swapRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    swapDivider: {
      flex: 1,
      height: 1,
      backgroundColor: colors.borderSubtle,
    },
    swapIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: "#E5C4B8",
      alignItems: "center",
      justifyContent: "center",
    },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.elevated,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      gap: 10,
    },
    dateText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.textPrimary,
    },
    quickDateBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "#E5C4B8",
      backgroundColor: colors.elevated,
    },
    quickDateBtnActive: {
      backgroundColor: "#D95D39",
      borderColor: "#D95D39",
    },
    quickDateTxt: {
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      color: "#5C1615",
    },
    quickDateTxtActive: {
      color: "#FFFFFF",
    },
    searchBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "#D95D39",
      borderRadius: 14,
      paddingVertical: 14,
      marginTop: 4,
    },
    searchBtnText: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: "#FFFFFF",
      letterSpacing: 0.3,
    },
  });
