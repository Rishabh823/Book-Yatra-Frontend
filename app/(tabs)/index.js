import { useEffect, useRef, useState, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { colors, fonts, radius, spacing, shadow } from "../../lib/theme";
import {
  tours as toursApi,
  feedback as feedbackApi,
  auth as authApi,
  publicSettings,
  publicStats,
  volunteerApi,
  walletApi,
  api,
} from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { resolveImageUrl } from "../../lib/utils";
import { useTheme } from "../../lib/ThemeContext";

const { width } = Dimensions.get("window");
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
  return (
    <View style={sectionHeaderStyles.container}>
      <View style={{ flex: 1 }}>
        <Text style={sectionHeaderStyles.title}>{title}</Text>
        {subtitle ? (
          <Text style={sectionHeaderStyles.subtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {onSeeAll ? (
        <TouchableOpacity
          onPress={onSeeAll}
          style={sectionHeaderStyles.seeAllBtn}
        >
          <Text style={sectionHeaderStyles.seeAllText}>See All</Text>
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
    color: colors.secondary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
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
    color: colors.primary,
  },
});

// ─── Shimmer placeholder ──────────────────────────────────────────────────────
function ShimmerCard({ width: w, height: h, borderRadius: br = radius.xl }) {
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
            color={filled || half ? color : "#D1D5DB"}
          />
        );
      })}
      {count != null && (
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: size - 1,
            color: "rgba(255,255,255,0.85)",
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
  return all
    .filter((t) => t.discountPercent > 0 || t.originalPrice > 0)
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
      const data = extractArray(res);
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
    const i = setInterval(
      () => setSlide((s) => (s + 1) % BANNERS.length),
      4500,
    );
    return () => clearInterval(i);
  }, []);

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
    const originalPrice =
      item.originalPrice || item.pricePerPerson || item.price || 0;
    const discountedPrice =
      item.discountedPrice ||
      (discountPct > 0
        ? Math.round(originalPrice * (1 - discountPct / 100))
        : null);

    return (
      <TouchableOpacity
        key={item._id || item.id}
        activeOpacity={0.88}
        style={styles.offerCard}
        onPress={() => router.push(`/tour/${item._id || item.id}`)}
      >
        <LinearGradient
          colors={gradient}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Discount badge */}
        {discountPct > 0 && (
          <View style={styles.offerDiscountBadge}>
            <Text style={styles.offerDiscountText}>{discountPct}% OFF</Text>
          </View>
        )}

        <View style={styles.offerCardContent}>
          <Text style={styles.offerTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {(item.source || item.destination) && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
              }}
            >
              <Ionicons
                name="location-outline"
                size={11}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={styles.offerRoute} numberOfLines={1}>
                {item.source || ""}
                {item.source && item.destination ? " → " : ""}
                {item.destination || ""}
              </Text>
            </View>
          )}
          {(item.startDate || item.endDate) && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
              }}
            >
              <Ionicons
                name="calendar-outline"
                size={11}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={styles.offerDate} numberOfLines={1}>
                {formatDate(item.startDate, item.endDate)}
              </Text>
            </View>
          )}
          <View style={styles.offerPriceRow}>
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
            <Ionicons name="arrow-forward" size={13} color="#fff" />
          </TouchableOpacity>
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
          backgroundColor: theme.bg,
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
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary} colors={[colors.primary]}
          />
        }
        testID="home-scroll"
      >
        {/* Announcement Banner */}
        {!!(appSettings.announcement?.trim()) && (
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
                    : t.jai}
            </Text>
            <Text style={styles.greetSub}>
              {userRole === "volunteer"
                ? "Volunteer Portal · Book Yatra"
                : userRole === "super_admin"
                  ? "Super Admin · Book Yatra"
                  : userRole === "admin" || userRole === "manager"
                    ? "Admin Panel · Book Yatra"
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
            <TouchableOpacity style={styles.langBtn} onPress={toggle}>
              <Text style={styles.langText}>{lang}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Banner */}
        <Animated.View style={[styles.banner, { opacity: fade }]}>
          {BANNERS.map((b, i) => (
            <Image
              key={i}
              source={{ uri: b }}
              resizeMode="cover"
              style={[
                StyleSheet.absoluteFillObject,
                { width: "100%", height: "100%", opacity: i === slide ? 1 : 0 },
              ]}
            />
          ))}
          <LinearGradient
            colors={[
              "rgba(0,0,0,0.08)",
              "rgba(0,0,0,0.25)",
              "rgba(0,0,0,0.75)",
            ]}
            style={StyleSheet.absoluteFillObject}
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
          style={{ marginTop: 20 }}
        >
          {QUICK_STATS.map((stat, i) => (
            <View
              key={i}
              style={[styles.statPill, { borderColor: stat.color + "33" }]}
            >
              <View
                style={[
                  styles.statIconWrap,
                  { backgroundColor: stat.color + "18" },
                ]}
              >
                <Ionicons name={stat.icon} size={14} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: stat.color }]}>
                {stat.value}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* ── Volunteer Home Section ──────────────────────────────────────── */}
        {isLoggedIn && userRole === "volunteer" && (
          <View style={styles.section}>
            <LinearGradient
              colors={["#064E3B", "#065F46"]}
              style={styles.roleBanner}
            >
              <View style={styles.roleBannerTop}>
                <View
                  style={[
                    styles.roleBannerIcon,
                    { backgroundColor: "rgba(255,255,255,0.15)" },
                  ]}
                >
                  <Ionicons name="shield-checkmark" size={22} color="#A7F3D0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleBannerTitle, { color: "#A7F3D0" }]}>
                    Volunteer Panel
                  </Text>
                  <Text style={styles.roleBannerSub}>
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
                    color: "#A7F3D0",
                    route: "/volunteer/checkin",
                  },
                  {
                    icon: "qr-code",
                    label: "Scan QR",
                    color: "#A7F3D0",
                    route: "/volunteer/checkin",
                  },
                  {
                    icon: "people",
                    label: "Passengers",
                    color: "#A7F3D0",
                    route: "/volunteer/passengers",
                  },
                  {
                    icon: "warning",
                    label: "Report",
                    color: "#FCA5A5",
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
            </LinearGradient>
          </View>
        )}

        {/* ── Admin / Manager Home Section ────────────────────────────────── */}
        {isLoggedIn && (userRole === "admin" || userRole === "manager") && (
          <View style={styles.section}>
            <LinearGradient
              colors={[colors.secondary, "#3D0D0C"]}
              style={styles.roleBanner}
            >
              <View style={styles.roleBannerTop}>
                <View
                  style={[
                    styles.roleBannerIcon,
                    { backgroundColor: "rgba(255,255,255,0.12)" },
                  ]}
                >
                  <Ionicons name="shield" size={22} color="#FFD700" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleBannerTitle, { color: "#FFD700" }]}>
                    Admin Dashboard
                  </Text>
                  <Text style={styles.roleBannerSub}>
                    Manage your tour operations
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.roleBannerCta}
                  onPress={() => router.push("/admin/dashboard")}
                >
                  <Text style={styles.roleBannerCtaTxt}>Full View</Text>
                  <Ionicons name="arrow-forward" size={12} color="#FFD700" />
                </TouchableOpacity>
              </View>
              <View style={styles.adminStatsRow}>
                {[
                  {
                    label: "Bookings",
                    value: adminStats?.totalBookings ?? "—",
                    icon: "ticket",
                    color: "#FCA5A5",
                  },
                  {
                    label: "Tours",
                    value: adminStats?.tourCount ?? "—",
                    icon: "bus",
                    color: "#86EFAC",
                  },
                  {
                    label: "Revenue",
                    value: adminStats?.monthRevenue
                      ? "₹" + Math.round(adminStats.monthRevenue / 1000) + "k"
                      : "—",
                    icon: "cash",
                    color: "#FDE68A",
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
                    color: "#86EFAC",
                  },
                  {
                    icon: "ticket",
                    label: "Bookings",
                    route: "/admin/bookings",
                    color: "#FCA5A5",
                  },
                  {
                    icon: "people",
                    label: "Volunteers",
                    route: "/admin/volunteer-management",
                    color: "#C4B5FD",
                  },
                  {
                    icon: "bar-chart",
                    label: "Analytics",
                    route: "/admin/analytics",
                    color: "#FDE68A",
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
            </LinearGradient>
          </View>
        )}

        {/* ── Super Admin Home Section ─────────────────────────────────────── */}
        {isLoggedIn && userRole === "super_admin" && (
          <View style={styles.section}>
            <LinearGradient
              colors={["#1E0A0A", "#3D0D0C"]}
              style={styles.roleBanner}
            >
              <View style={styles.roleBannerTop}>
                <View
                  style={[
                    styles.roleBannerIcon,
                    { backgroundColor: "rgba(255,215,0,0.12)" },
                  ]}
                >
                  <Ionicons name="planet" size={22} color="#FFD700" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleBannerTitle, { color: "#FFD700" }]}>
                    Super Admin
                  </Text>
                  <Text style={styles.roleBannerSub}>
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
                    color: "#FCA5A5",
                  },
                  {
                    label: "Users",
                    value: adminStats?.users ?? "—",
                    icon: "people",
                    color: "#93C5FD",
                  },
                  {
                    label: "Operators",
                    value: adminStats?.operators ?? "—",
                    icon: "business",
                    color: "#86EFAC",
                  },
                  {
                    label: "Bookings",
                    value: adminStats?.bookings ?? "—",
                    icon: "ticket",
                    color: "#FDE68A",
                  },
                ].map((st) => (
                  <View key={st.label} style={styles.adminStatCard}>
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
                    color: "#C4B5FD",
                  },
                  {
                    icon: "person",
                    label: "Users",
                    route: "/admin/super/users",
                    color: "#93C5FD",
                  },
                  {
                    icon: "bus",
                    label: "All Tours",
                    route: "/admin/super/tours",
                    color: "#86EFAC",
                  },
                  {
                    icon: "ticket",
                    label: "Bookings",
                    route: "/admin/super/bookings",
                    color: "#FCA5A5",
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
            </LinearGradient>
          </View>
        )}

        {/* Quick actions — hide for volunteer and super_admin (they have dedicated sections) */}
        {userRole !== "volunteer" && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.quickAccess}</Text>
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
                !isOp && authChecked && joinedOps.length === 0;
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
                    >
                      {visibleTours.map((tour, i) => (
                        <TouchableOpacity
                          key={tour._id || tour.id || i}
                          activeOpacity={0.9}
                          style={styles.tourCard}
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
                            colors={["transparent", "rgba(0,0,0,0.7)"]}
                            style={styles.tourGrad}
                          />
                          <View style={styles.tourBadge}>
                            <Text style={styles.tourBadgeText}>
                              {formatDate(tour.startDate, tour.endDate)}
                            </Text>
                          </View>
                          {/* Seats left urgency badge */}
                          {tour.availableSeats != null && tour.availableSeats <= 10 && (
                            <View style={[styles.seatsLeftBadge, tour.availableSeats <= 3 && { backgroundColor: "#EF4444" }]}>
                              <Ionicons name="people" size={9} color="#fff" />
                              <Text style={styles.seatsLeftTxt}>
                                {tour.availableSeats === 0 ? "Full" : `${tour.availableSeats} left`}
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
                            <View style={styles.tourFooter}>
                              <Text style={styles.tourPrice}>
                                {tour.price || "₹—"}
                              </Text>
                              <View style={styles.bookPill}>
                                <Text style={styles.bookPillText}>
                                  {t.bookNow}
                                </Text>
                                <Ionicons
                                  name="arrow-forward"
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
                <Text style={styles.loginCtaTitle}>Discover Sacred Yatras</Text>
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
                <ShimmerCard key={k} width={220} height={280} borderRadius={radius.xxl} />
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
                <ShimmerCard key={k} width={220} height={280} borderRadius={radius.xxl} />
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
                  borderRadius={radius.xxl}
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

const styles = StyleSheet.create({
  announcementBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: radius.md,
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
    color: colors.secondary,
    letterSpacing: -0.3,
  },
  greetSub: {
    fontSize: 12,
    fontFamily: fonts.accent,
    color: colors.textSecondary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 2,
  },
  bell: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    ...shadow.soft,
  },
  walletHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
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
    backgroundColor: colors.secondary,
    borderRadius: radius.pill,
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
    borderRadius: radius.xxl,
    overflow: "hidden",
    backgroundColor: colors.secondary,
    ...shadow.card,
  },
  bannerContent: { flex: 1, padding: 24, justifyContent: "flex-end" },
  bannerAccent: {
    color: "#FFE9C0",
    fontFamily: fonts.accent,
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
    borderRadius: radius.pill,
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
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    ...shadow.soft,
  },
  statIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
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
    borderRadius: radius.lg,
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
    fontFamily: fonts.accent,
    fontSize: 11,
    color: colors.textSecondary,
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
    color: colors.secondary,
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
    borderRadius: radius.xl,
    ...shadow.soft,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
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
    borderRadius: radius.xxl,
    overflow: "hidden",
    backgroundColor: colors.elevated,
    ...shadow.card,
  },
  tourImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  tourGrad: { ...StyleSheet.absoluteFillObject },
  tourBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  tourBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.secondary,
  },
  seatsLeftBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "#F97316",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
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
  tourRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  tourMeta: { color: "#FFE9C0", fontFamily: fonts.body, fontSize: 12, flex: 1 },
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
    borderRadius: radius.pill,
  },
  bookPillText: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 11 },

  // ── Discover cards (Trending / Top Rated) ──────────────────────────────────
  discoverCard: {
    width: 220,
    height: 280,
    marginRight: 14,
    borderRadius: radius.xxl,
    overflow: "hidden",
    backgroundColor: colors.elevated,
    ...shadow.card,
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
    borderRadius: radius.pill,
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
    width: 260,
    marginRight: 14,
    borderRadius: radius.xxl,
    overflow: "hidden",
    ...shadow.card,
  },
  offerDiscountBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    zIndex: 2,
  },
  offerDiscountText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: "#fff",
    letterSpacing: 0.3,
  },
  offerCardContent: {
    padding: 18,
    paddingTop: 52,
    paddingBottom: 18,
  },
  offerTitle: {
    color: "#fff",
    fontFamily: fonts.heading,
    fontSize: 17,
    lineHeight: 22,
  },
  offerRoute: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: fonts.body,
    fontSize: 11,
    flex: 1,
  },
  offerDate: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: fonts.body,
    fontSize: 11,
    flex: 1,
  },
  offerPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  offerOriginalPrice: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    textDecorationLine: "line-through",
  },
  offerFinalPrice: {
    color: "#fff",
    fontFamily: fonts.bodyBold,
    fontSize: 18,
  },
  offerBookBtn: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: radius.pill,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  offerBookBtnText: {
    color: "#fff",
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },

  whyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  whyCard: {
    flex: 1,
    minWidth: 130,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radius.xl,
    ...shadow.soft,
  },
  whyIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
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
    borderRadius: radius.xxl,
    padding: 28,
    alignItems: "center",
    ...shadow.soft,
  },
  loginCtaIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  loginCtaTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.secondary,
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
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtnTxt: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 14 },
  registerBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  registerBtnTxt: {
    color: colors.secondary,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },

  feedbackCard: {
    width: width * 0.75,
    marginRight: 14,
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: radius.xl,
    ...shadow.soft,
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
    borderRadius: radius.xxl,
    padding: 20,
    gap: 14,
    ...shadow.card,
  },
  roleBannerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  roleBannerIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  roleBannerTitle: { fontFamily: fonts.bodyBold, fontSize: 16 },
  roleBannerSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  roleBannerCta: { flexDirection: "row", alignItems: "center", gap: 4 },
  roleBannerCtaTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: "#FFD700",
  },

  // Volunteer specific
  todayTourCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(167,243,208,0.3)",
  },
  todayTourLabel: {
    fontFamily: fonts.accent,
    fontSize: 9,
    color: "#6EE7B7",
    letterSpacing: 2,
    marginBottom: 2,
  },
  todayTourName: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
  todayTourMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  todayTourBtn: {
    backgroundColor: "#065F46",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#6EE7B7",
  },
  todayTourBtnTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: "#6EE7B7",
  },
  volActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  volActionBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
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
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  adminStatValue: { fontFamily: fonts.bodyBold, fontSize: 18 },
  adminStatLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.5,
  },
  adminActionsGrid: { flexDirection: "row", gap: 8 },
  adminActionBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
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
    color: colors.secondary,
    textAlign: "center",
  },
  mantraDivider: {
    width: 36,
    height: 2,
    backgroundColor: colors.primary,
    marginVertical: 12,
  },
  mantraEn: {
    fontFamily: fonts.accent,
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
});
