import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  RefreshControl,
  ActivityIndicator,
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
} from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { resolveImageUrl } from "../../lib/utils";

const { width } = Dimensions.get("window");
const BANNERS = [
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  "https://images.unsplash.com/photo-1605649487212-47bdab064df7?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  "https://images.pexels.com/photos/11398067/pexels-photo-11398067.jpeg?auto=compress&cs=tinysrgb&w=1400",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
];

export default function Home() {
  const router = useRouter();
  const { lang, t, toggle } = useLang();
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

  useFocusEffect(
    useCallback(() => {
      const checkAuth = async () => {
        const ok = await authApi.isAuthenticated();
        setIsLoggedIn(ok);
        if (ok) {
          const role = await authApi.getRole();
          setUserRole(role || "user");
          const isOperator = ["admin", "super_admin", "manager"].includes(role);
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

  const load = async () => {
    try {
      const res = await toursApi.upcoming().catch(() => []);
      setUpcoming(Array.isArray(res) ? res : res?.data || []);
      const f = await feedbackApi.public(6).catch(() => ({ data: [] }));
      setFeedbacks(f?.data || []);
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
    load();
  }, []);
  useEffect(() => {
    const i = setInterval(
      () => setSlide((s) => (s + 1) % BANNERS.length),
      4500,
    );
    return () => clearInterval(i);
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

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        testID="home-scroll"
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t.jai}</Text>
            <Text style={styles.greetSub}>{t.appName}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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

        {/* Quick actions */}
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
                  style={[styles.quickIcon, { backgroundColor: q.tint + "1A" }]}
                >
                  <Ionicons name={q.icon} size={22} color={q.tint} />
                </View>
                <Text style={styles.quickLabel}>{q.label}</Text>
                <Text style={styles.quickSub}>{q.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upcoming Tours — logged-in only */}
        {isLoggedIn ? (
          (() => {
            const isOp = ["admin", "super_admin", "manager"].includes(userRole);
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
                      (typeof op === "object" ? String(op._id) : String(op)) ===
                      tid,
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
                          source={{ uri: resolveImageUrl(tour.coverPhotoUrl) }}
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
                Sign in to view upcoming tours, check availability and book your
                seat.
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    width: (width - 48 - 12) / 2,
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

  whyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  whyCard: {
    width: (width - 48 - 12) / 2,
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
});
