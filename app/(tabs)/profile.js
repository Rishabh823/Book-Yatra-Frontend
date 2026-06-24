import { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  DeviceEventEmitter,
} from "react-native";
import Toast from "../../components/Toast";
import ConfirmModal from "../../components/ConfirmModal";
import { useToast } from "../../lib/hooks/useToast";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts, radius } from "../../lib/theme";
import { auth as authApi } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { useTheme } from "../../lib/ThemeContext";

// ─── App primary color ────────────────────────────────────────────────────────
const PRIMARY = "#D95D39";

const getUserMenu = (t) => [
  {
    icon: "person-outline",
    label: t.editProfile || "Edit profile",
    sub: "Manage personal info",
    action: "profile",
    color: "#D95D39",
    bg: "#FFF0EB",
  },
  {
    icon: "bus-outline",
    label: "My Operators",
    sub: "Change operators you follow",
    action: "select-operators",
    color: "#0284C7",
    bg: "#EFF6FF",
  },
  {
    icon: "people-outline",
    label: t.membership || "Membership",
    sub: "Join Parivar",
    action: "membership",
    color: "#16A34A",
    bg: "#F0FDF4",
  },
  {
    icon: "images-outline",
    label: t.gallery || "Gallery",
    sub: "Photos and memories",
    action: "gallery",
    color: "#0891B2",
    bg: "#ECFEFF",
  },
  {
    icon: "heart-outline",
    label: "My Favorites",
    sub: "Saved tours and destinations",
    action: "favorites",
    color: "#EF4444",
    bg: "#FEF2F2",
  },
  {
    icon: "chatbubbles-outline",
    label: "Community",
    sub: "Travel stories and tips",
    action: "community",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    icon: "chatbubble-outline",
    label: "Chat",
    sub: "Messages and group chats",
    action: "chat",
    color: "#0284C7",
    bg: "#EFF6FF",
  },
  {
    icon: "star-outline",
    label: "Rewards",
    sub: "Points, badges & leaderboard",
    action: "rewards",
    color: "#D97706",
    bg: "#FFFBEB",
  },
  {
    icon: "lock-closed-outline",
    label: "Document Vault",
    sub: "Secure travel documents",
    action: "document-vault",
    color: "#0891B2",
    bg: "#ECFEFF",
  },
  {
    icon: "pricetag-outline",
    label: "Offers & Coupons",
    sub: "Discounts & voucher codes",
    action: "coupons",
    color: "#16A34A",
    bg: "#F0FDF4",
  },
  {
    icon: "heart-circle-outline",
    label: "Donate / Seva Daan",
    sub: "Support community causes",
    action: "donate",
    color: "#D95D39",
    bg: "#FFF0EB",
  },
  {
    icon: "color-palette-outline",
    label: "Appearance",
    sub: "Dark mode & color themes",
    action: "theme-settings",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    icon: "shield-checkmark-outline",
    label: "Account & Security",
    sub: "Password, PIN, biometrics & more",
    action: "security",
    color: "#5C1615",
    bg: "#FEF2F2",
  },
  {
    icon: "warning-outline",
    label: "Emergency SOS",
    sub: "Tap to send an emergency alert",
    action: "sos",
    color: "#DC2626",
    bg: "#FEF2F2",
  },
  {
    icon: "chatbubbles-outline",
    label: t.feedback || "Feedback",
    sub: "Share your experience",
    action: "feedback",
    color: "#D97706",
    bg: "#FFFBEB",
  },
  {
    icon: "call-outline",
    label: "Contact Us",
    sub: "+91 9958985187",
    action: "contact",
    color: "#D95D39",
    bg: "#FFF0EB",
  },
  {
    icon: "information-circle-outline",
    label: "About",
    sub: "About TripKart",
    action: "about",
    color: "#5C1615",
    bg: "#FEF2F2",
  },
];

const SUPER_ADMIN_GRID = [
  {
    icon: "planet",
    label: "Overview",
    action: "super-dashboard",
    color: "#1E0A0A",
    bg: "#FEF2F2",
  },
  {
    icon: "business",
    label: "Operators",
    action: "super-operators",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    icon: "people",
    label: "Users",
    action: "super-users",
    color: "#0284C7",
    bg: "#EFF6FF",
  },
  {
    icon: "bus",
    label: "Tours",
    action: "super-tours",
    color: "#16A34A",
    bg: "#F0FDF4",
  },
  {
    icon: "ticket",
    label: "Bookings",
    action: "super-bookings",
    color: "#D95D39",
    bg: "#FFF0EB",
  },
  {
    icon: "shield-checkmark",
    label: "Roles",
    action: "super-roles",
    color: "#D97706",
    bg: "#FFFBEB",
  },
  {
    icon: "cash-outline",
    label: "Finance",
    action: "super-finance",
    color: "#16A34A",
    bg: "#F0FDF4",
  },
  {
    icon: "arrow-up-circle",
    label: "Withdrawals",
    action: "super-withdrawals",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    icon: "heart",
    label: "Donations",
    action: "super-donations",
    color: "#DC2626",
    bg: "#FEF2F2",
  },
  {
    icon: "notifications",
    label: "Notify All",
    action: "super-notifications",
    color: "#0891B2",
    bg: "#ECFEFF",
  },
  {
    icon: "megaphone",
    label: "Marketing",
    action: "admin-marketing",
    color: "#8B5CF6",
    bg: "#F5F3FF",
  },
  {
    icon: "refresh-circle",
    label: "Refunds",
    action: "super-refunds",
    color: "#D97706",
    bg: "#FFFBEB",
  },
  {
    icon: "globe",
    label: "Aggregator",
    action: "super-crawl",
    color: "#0891B2",
    bg: "#ECFEFF",
  },
  {
    icon: "settings",
    label: "Settings",
    action: "admin-settings",
    color: "#6B7280",
    bg: "#F9FAFB",
  },
];

const ADMIN_GRID = [
  {
    icon: "grid",
    label: "Dashboard",
    action: "admin-dashboard",
    color: "#5C1615",
    bg: "#FEF2F2",
  },
  {
    icon: "ticket",
    label: "Bookings",
    action: "admin-bookings",
    color: "#D95D39",
    bg: "#FFF0EB",
  },
  {
    icon: "bus",
    label: "Tours",
    action: "admin-tours",
    color: "#16A34A",
    bg: "#F0FDF4",
  },
  {
    icon: "pulse",
    label: "Live Ops",
    action: "admin-live-dashboard",
    color: "#DC2626",
    bg: "#FEF2F2",
  },
  {
    icon: "bar-chart",
    label: "Analytics",
    action: "admin-analytics",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    icon: "car-sport",
    label: "Vehicles",
    action: "admin-vehicles",
    color: "#0284C7",
    bg: "#EFF6FF",
  },
  {
    icon: "person-circle",
    label: "Drivers",
    action: "admin-drivers",
    color: "#D97706",
    bg: "#FFFBEB",
  },
  {
    icon: "people",
    label: "Volunteers",
    action: "admin-volunteer-mgmt",
    color: "#16A34A",
    bg: "#F0FDF4",
  },
  {
    icon: "people",
    label: "Members",
    action: "admin-members",
    color: "#0284C7",
    bg: "#EFF6FF",
  },
  {
    icon: "person",
    label: "Users",
    action: "admin-users",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    icon: "chatbubble",
    label: "Enquiries",
    action: "admin-enquiries",
    color: "#D97706",
    bg: "#FFFBEB",
  },
  {
    icon: "star",
    label: "Feedback",
    action: "admin-feedback",
    color: "#D95D39",
    bg: "#FFF0EB",
  },
  {
    icon: "images",
    label: "Gallery",
    action: "admin-gallery",
    color: "#0891B2",
    bg: "#ECFEFF",
  },
  {
    icon: "settings",
    label: "Settings",
    action: "admin-settings",
    color: "#6B7280",
    bg: "#F9FAFB",
  },
  {
    icon: "pricetag",
    label: "Coupons",
    action: "admin-coupons",
    color: "#0891B2",
    bg: "#ECFEFF",
  },
  {
    icon: "star-half",
    label: "Reviews",
    action: "admin-reviews",
    color: "#F59E0B",
    bg: "#FFFBEB",
  },
  {
    icon: "megaphone",
    label: "Marketing",
    action: "admin-marketing",
    color: "#8B5CF6",
    bg: "#F5F3FF",
  },
];

const VOLUNTEER_MENU = [
  {
    icon: "people-circle-outline",
    label: "Volunteer Hub",
    sub: "Dashboard & assigned tours",
    action: "volunteer-hub",
    color: "#16A34A",
    bg: "#F0FDF4",
  },
  {
    icon: "qr-code-outline",
    label: "Scan Check-In",
    sub: "Scan passenger QR codes",
    action: "volunteer-scan",
    color: "#0284C7",
    bg: "#EFF6FF",
  },
  {
    icon: "list-outline",
    label: "Passenger List",
    sub: "View and manage check-ins",
    action: "volunteer-list",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    icon: "warning-outline",
    label: "Report Incident",
    sub: "Log incidents & emergencies",
    action: "volunteer-incident",
    color: "#DC2626",
    bg: "#FEF2F2",
  },
];

const ROLE_ADMIN_ROUTES = {
  "admin-dashboard": "/admin/dashboard",
  "admin-bookings": "/admin/bookings",
  "admin-tours": "/admin/tours",
  "admin-members": "/admin/members",
  "admin-users": "/admin/users",
  "admin-enquiries": "/admin/enquiries",
  "admin-feedback": "/admin/feedback",
  "admin-donations": "/admin/donations",
  "admin-gallery": "/admin/gallery",
  "admin-settings": "/admin/settings",
  "admin-live-dashboard": "/admin/live-dashboard",
  "admin-analytics": "/admin/analytics",
  "admin-vehicles": "/admin/vehicles",
  "admin-drivers": "/admin/drivers",
  "admin-volunteer-mgmt": "/admin/volunteer-management",
  "admin-coupons": "/admin/coupons",
  "admin-reviews": "/admin/reviews",
  "admin-marketing": "/admin/marketing",
  "super-crawl": "/admin/crawl",
  "super-dashboard": "/admin/super/dashboard",
  "super-operators": "/admin/super/operators",
  "super-users": "/admin/super/users",
  "super-tours": "/admin/super/tours",
  "super-bookings": "/admin/super/bookings",
  "super-roles": "/admin/super/roles",
  "super-finance": "/admin/super/finance",
  "super-withdrawals": "/admin/super/withdrawals",
  "super-donations": "/admin/donations",
  "super-notifications": "/admin/super/notifications",
  "super-refunds": "/admin/super/refunds",
  "volunteer-hub": "/volunteer",
  "volunteer-scan": "/volunteer/checkin",
  "volunteer-list": "/volunteer/passengers",
  "volunteer-incident": "/volunteer/report-incident",
};

const AVATAR_BG = {
  super_admin: "#FEE9E3",
  admin: "#FEE9E3",
  manager: "#FFF0EB",
  volunteer: "#DCFCE7",
  user: "#DBEAFE",
  guest: "#F3F4F6",
};
const AVATAR_TEXT_COLOR = {
  super_admin: "#B45309",
  admin: "#D95D39",
  manager: "#EA580C",
  volunteer: "#16A34A",
  user: "#2563EB",
  guest: "#6B7280",
};
const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Tour Admin",
  manager: "Manager",
  volunteer: "Volunteer",
  user: "Standard user",
  guest: "Guest User",
};

export default function Profile() {
  const router = useRouter();
  const { lang, t, toggle: toggleLang } = useLang();
  const { theme, isDark } = useTheme();
  const colors = theme;
  const { width } = useWindowDimensions();
  const gridCols = width >= 500 ? 4 : 3;
  const gridCardW = (width - 40 - 10 * (gridCols - 1)) / gridCols;

  const [user, setUser] = useState(null);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const load = useCallback(async () => {
    const ok = await authApi.isAuthenticated();
    setAuthed(ok);
    if (ok) {
      try {
        const res = await authApi.getProfile();
        const profile = res?.data || res?.user || res;
        if (profile && typeof profile === "object") {
          const cachedRaw = await AsyncStorage.getItem("user");
          const prev = cachedRaw ? JSON.parse(cachedRaw) : {};
          const merged = {
            ...prev,
            ...profile,
            joinedOperators:
              Array.isArray(profile.joinedOperators) &&
              profile.joinedOperators.length > 0
                ? profile.joinedOperators
                : prev.joinedOperators || [],
          };
          setUser(merged);
          await AsyncStorage.setItem("user", JSON.stringify(merged));
        }
      } catch {
        const cached = await authApi.getUser();
        setUser(cached);
      }
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("userPhotoChanged", (url) => {
      setUser((prev) => (prev ? { ...prev, photoUrl: url || "" } : prev));
    });
    return () => sub.remove();
  }, []);

  const { toast, showToast, hideToast } = useToast();

  const handleAction = (a) => {
    if (a === "gallery") return router.push("/gallery");
    if (a === "profile") return router.push("/edit-profile");
    if (a === "membership") return router.push("/membership");
    if (a === "feedback") return router.push("/feedback");
    if (a === "contact") return router.push("/contact");
    if (a === "about") return router.push("/about");
    if (a === "members") return router.push("/members");
    if (a === "select-operators") return router.push("/select-operators");
    if (a === "favorites") return router.push("/favorites");
    if (a === "donate") return router.push("/donate");
    if (a === "theme-settings") return router.push("/theme-settings");
    if (a === "security") return router.push("/security");
    if (a === "sos") return router.push("/sos");
    if (a === "community") return router.push("/community");
    if (a === "chat") return router.push("/chat");
    if (a === "rewards") return router.push("/rewards");
    if (a === "document-vault") return router.push("/document-vault");
    if (a === "coupons") return router.push("/coupons");
    if (ROLE_ADMIN_ROUTES[a]) return router.push(ROLE_ADMIN_ROUTES[a]);
    showToast("This feature opens shortly.", "info");
  };

  const logout = async () => {
    const wasGuest = user?.role === "guest";
    await authApi.logout();
    setAuthed(false);
    setUser(null);
    DeviceEventEmitter.emit("userPhotoChanged", null);
    showToast(
      wasGuest ? "Guest session ended." : "Logged out successfully.",
      "success",
    );
    setTimeout(() => router.replace("/profile"), 800);
  };

  const isGuest = user?.role === "guest";
  const isSuperAdmin = user?.role === "super_admin";
  const isVolunteer = user?.role === "volunteer";
  const isAdmin =
    user?.role &&
    !["user", "guest", "super_admin", "volunteer"].includes(user.role);

  const initials = (user?.name || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const avatarBg = AVATAR_BG[user?.role || "user"] || "#DBEAFE";
  const avatarTextColor = AVATAR_TEXT_COLOR[user?.role || "user"] || "#2563EB";
  const roleLabel = ROLE_LABELS[user?.role || "user"] || "Standard user";

  const trips = user?.bookingCount ?? user?.stats?.trips ?? 0;
  const points = user?.loyalty?.points ?? user?.points ?? 0;
  const rating = user?.averageRating ?? user?.rating ?? 0;

  // ─── page bg ──────────────────────────────────────────────────────────────
  const pageBg = isDark ? colors.bg : "#FFFFFF";

  // ── Not-logged-in gate ────────────────────────────────────────────────────
  if (!loading && !authed) {
    return (
      <SafeAreaView
        style={[s.root, { backgroundColor: pageBg }]}
        edges={["top"]}
      >
        <View style={s.topBar}>
          <TouchableOpacity
            onPress={() => router.canGoBack() && router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={isDark ? "#fff" : "#1A1A1A"}
            />
          </TouchableOpacity>
          {/* <TouchableOpacity style={s.langBtn} onPress={toggleLang}>
            <Text style={s.langBtnTxt}>{lang}</Text>
          </TouchableOpacity> */}
        </View>
        <View style={s.gateBody}>
          <View
            style={[
              s.avatarCircle,
              {
                backgroundColor: "#FFF0EB",
                width: 80,
                height: 80,
                borderRadius: 40,
              },
            ]}
          >
            <Ionicons name="person-outline" size={36} color={PRIMARY} />
          </View>
          <Text style={[s.name, { marginTop: 16, color: colors.textPrimary }]}>
            Sign in to TripKart
          </Text>
          <Text style={s.gateSub}>
            Sign in to manage bookings, track tours, and access your seva
            history.
          </Text>
          <TouchableOpacity
            style={s.loginBtn}
            onPress={() => router.push("/auth/login")}
          >
            <Ionicons name="log-in-outline" size={18} color="#fff" />
            <Text style={s.loginBtnTxt}>Login / Register</Text>
          </TouchableOpacity>
        </View>
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={hideToast}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: pageBg }]} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* ── Top Bar ───────────────────────────────────────────────────────── */}
        <View style={s.topBar}>
          <TouchableOpacity
            onPress={() => router.canGoBack() && router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={isDark ? "#fff" : "#1A1A1A"}
            />
          </TouchableOpacity>
          {/* <TouchableOpacity style={s.langBtn} onPress={toggleLang}>
            <Text style={s.langBtnTxt}>{lang}</Text>
          </TouchableOpacity> */}
        </View>

        {loading ? (
          <ActivityIndicator
            color={PRIMARY}
            size="large"
            style={{ marginTop: 80 }}
          />
        ) : (
          <>
            {/* ── Avatar ──────────────────────────────────────────────────── */}
            <TouchableOpacity
              style={s.avatarWrap}
              onPress={() => router.push("/edit-profile")}
              activeOpacity={0.85}
            >
              {user?.photoUrl ? (
                <Image source={{ uri: user.photoUrl }} style={s.avatarImg} />
              ) : (
                <View style={[s.avatarCircle, { backgroundColor: avatarBg }]}>
                  <Text style={[s.avatarTxt, { color: avatarTextColor }]}>
                    {initials}
                  </Text>
                </View>
              )}
              <View
                style={[s.cameraBadge, { backgroundColor: avatarTextColor }]}
              >
                <Ionicons name="camera" size={10} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* ── Name ────────────────────────────────────────────────────── */}
            <Text style={[s.name, { color: colors.textPrimary }]}>
              {user?.name || "—"}
            </Text>

            {/* ── Role (icon + text, no pill) ──────────────────────────────── */}
            <View style={s.roleRow}>
              <Ionicons
                name="person-outline"
                size={13}
                color={isDark ? "#888" : "#9CA3AF"}
              />
              <Text style={[s.roleTxt, isDark && { color: "#888" }]}>
                {roleLabel}
              </Text>
            </View>

            {/* ── Email ───────────────────────────────────────────────────── */}
            {!isGuest && (
              <View style={s.emailRow}>
                <Ionicons
                  name="mail-outline"
                  size={13}
                  color={isDark ? "#888" : "#9CA3AF"}
                />
                <Text
                  style={[s.emailTxt, isDark && { color: "#888" }]}
                  numberOfLines={1}
                >
                  {user?.email || user?.phone || "TripKart member"}
                </Text>
              </View>
            )}
            {isGuest && (
              <View style={s.emailRow}>
                <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                <Text style={s.emailTxt}>Guest · Temporary Session</Text>
              </View>
            )}

            {/* ── Stats Row ───────────────────────────────────────────────── */}
            <View style={s.statsRow}>
              {[
                { value: trips, label: "Trips" },
                { value: points, label: "Points" },
                {
                  value: rating ? Number(rating).toFixed(1) : "—",
                  label: "Rating",
                },
              ].map((stat, i) => (
                <View
                  key={i}
                  style={[
                    s.statBox,
                    isDark && {
                      backgroundColor: colors.elevated,
                      borderColor: colors.border,
                    },
                    i === 1 && s.statBoxMid,
                  ]}
                >
                  <Text style={[s.statNum, isDark && { color: "#fff" }]}>
                    {stat.value}
                  </Text>
                  <Text style={[s.statLabel, isDark && { color: "#aaa" }]}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* ── Gray band separator ─────────────────────────────────────── */}
            {/* <View style={s.grayBand} /> */}

            {/* ── Super Admin Grid ────────────────────────────────────────── */}
            {isSuperAdmin && (
              <View style={s.section}>
                <Text style={[s.sectionLabel, { color: "#B45309" }]}>
                  ⚡ SUPER ADMIN
                </Text>
                <View style={s.iconGrid}>
                  {SUPER_ADMIN_GRID.map((m, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[s.iconCard, { width: gridCardW }, isDark && { backgroundColor: colors.elevated, borderColor: colors.borderSubtle }]}
                      onPress={() => handleAction(m.action)}
                      activeOpacity={0.8}
                    >
                      <View style={[s.iconCircle, { backgroundColor: isDark ? colors.surface : m.bg }]}>
                        <Ionicons name={m.icon} size={22} color={m.color} />
                      </View>
                      <Text
                        style={[s.iconLabel, isDark && { color: "#eee" }]}
                        numberOfLines={1}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* ── Volunteer Panel ──────────────────────────────────────────── */}
            {isVolunteer && (
              <View style={s.section}>
                <Text style={[s.sectionLabel, { color: "#16A34A" }]}>
                  🙋 VOLUNTEER PANEL
                </Text>
                {VOLUNTEER_MENU.map((m, i) => (
                  <FlatMenuItem
                    key={i}
                    item={m}
                    onPress={() => handleAction(m.action)}
                    isLast={i === VOLUNTEER_MENU.length - 1}
                  />
                ))}
              </View>
            )}

            {/* ── Admin Grid ──────────────────────────────────────────────── */}
            {isAdmin && (
              <View style={s.section}>
                <Text style={[s.sectionLabel, { color: PRIMARY }]}>
                  🛡 ADMIN PANEL
                </Text>
                <View style={s.iconGrid}>
                  {ADMIN_GRID.map((m, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[s.iconCard, { width: gridCardW }, isDark && { backgroundColor: colors.elevated, borderColor: colors.borderSubtle }]}
                      onPress={() => handleAction(m.action)}
                      activeOpacity={0.8}
                    >
                      <View style={[s.iconCircle, { backgroundColor: isDark ? colors.surface : m.bg }]}>
                        <Ionicons name={m.icon} size={22} color={m.color} />
                      </View>
                      <Text
                        style={[s.iconLabel, isDark && { color: "#eee" }]}
                        numberOfLines={1}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* ── User Menu ───────────────────────────────────────────────── */}
            {authed && (
              <View style={s.section}>
                <Text style={s.sectionLabel}>SERVICES & SUPPORT</Text>

                {/* Menu items */}
                {(() => {
                  const menu = getUserMenu(t).filter((m) => {
                    if (isAdmin || isSuperAdmin)
                      return !["select-operators", "favorites"].includes(
                        m.action,
                      );
                    if (isVolunteer)
                      return ![
                        "select-operators",
                        "membership",
                        "gallery",
                        "favorites",
                        "community",
                        "chat",
                        "rewards",
                        "document-vault",
                        "coupons",
                        "feedback",
                      ].includes(m.action);
                    return true;
                  });
                  return menu.map((m, i) => (
                    <FlatMenuItem
                      key={i}
                      item={m}
                      onPress={() => handleAction(m.action)}
                      isLast={i === menu.length - 1}
                    />
                  ));
                })()}

                {/* Logout */}
                <View style={{ marginTop: 16 }}>
                  <TouchableOpacity
                    style={s.logoutRow}
                    onPress={() => setShowLogoutConfirm(true)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[s.menuIconBox, { backgroundColor: "#FEE2E2" }]}
                    >
                      <Ionicons
                        name="log-out-outline"
                        size={20}
                        color="#DC2626"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.logoutTxt}>
                        {isGuest ? "Exit Guest Session" : t.logout || "Logout"}
                      </Text>
                      <Text style={s.menuSub}>
                        {isGuest
                          ? "End temporary session"
                          : "Sign out of your account"}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#E5E7EB"
                    />
                  </TouchableOpacity>
                </View>

                {isGuest && (
                  <View style={s.guestNote}>
                    <Ionicons
                      name="information-circle-outline"
                      size={13}
                      color="#9CA3AF"
                    />
                    <Text style={s.guestNoteTxt}>
                      Guest session — bookings are saved but account deletes on
                      sign out.
                    </Text>
                  </View>
                )}

                <Text style={s.mantra}>{t.mantra}</Text>
                <Text style={s.version}>v1.0.0 · TripKart</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      <ConfirmModal
        visible={showLogoutConfirm}
        icon="log-out-outline"
        title={isGuest ? "Exit Guest Session?" : "Logout?"}
        message={
          isGuest
            ? "Your guest session will end."
            : "You will be signed out of your account."
        }
        confirmText={isGuest ? "Exit" : "Logout"}
        cancelText="Stay"
        destructive
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
        onDismiss={() => setShowLogoutConfirm(false)}
      />
    </SafeAreaView>
  );
}

// ─── Flat menu item — no shadow, separator line between items ─────────────────
function FlatMenuItem({ item, onPress, isLast }) {
  const { isDark, theme } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      style={[
        s.menuRow,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: isDark ? "#333" : "#F3F4F6",
        },
      ]}
      onPress={onPress}
      testID={`menu-${item.action}`}
    >
      <View style={[s.menuIconBox, { backgroundColor: item.bg || "#F3F4F6" }]}>
        <Ionicons name={item.icon} size={20} color={item.color || PRIMARY} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[s.menuTitle, isDark && { color: "#fff" }]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        <Text
          style={[s.menuSub, isDark && { color: "#888" }]}
          numberOfLines={1}
        >
          {item.sub}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={isDark ? "#555" : "#D1D5DB"}
      />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  // ── Gray band separator (iOS Settings style) ─────────────────────────────
  grayBand: {
    height: 10,
    backgroundColor: "#F2F2F2",
    marginTop: 4,
  },

  // ── Top bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  langBtnTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: "#374151",
    letterSpacing: 0.5,
  },

  // ── Avatar ───────────────────────────────────────────────────────────────
  avatarWrap: {
    alignSelf: "center",
    position: "relative",
    marginTop: 20,
    marginBottom: 14,
  },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontFamily: fonts.heading, fontSize: 32, fontWeight: "700" },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  // ── Name / role / email ──────────────────────────────────────────────────
  name: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: "#111827",
    textAlign: "center",
    marginBottom: 6,
    paddingHorizontal: 20,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginBottom: 6,
  },
  roleTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12, // meta level
    color: "#9CA3AF",
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginBottom: 20,
  },
  emailTxt: {
    fontFamily: fonts.body,
    fontSize: 12, // meta level
    color: "#9CA3AF",
  },

  // ── Stats row ────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 4,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: "#FAFAFA",
  },
  statBoxMid: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#E5E7EB",
  },
  statNum: {
    fontFamily: fonts.bodyBold,
    fontSize: 22, // same as amountTxt in bookings
    color: "#111827",
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12, // meta level
    color: "#9CA3AF",
  },

  // ── Section ──────────────────────────────────────────────────────────────
  section: { paddingHorizontal: 20, paddingTop: 16, marginBottom: 12 },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11, // small badge level
    color: "#9CA3AF",
    letterSpacing: 1.5,
    marginBottom: 12,
    paddingLeft: 2,
  },

  // ── Icon grid (admin/super admin) ────────────────────────────────────────
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  iconCard: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11, // small badge level
    color: "#374151",
    textAlign: "center",
  },

  // ── Flat menu row ─────────────────────────────────────────────────────────
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    gap: 14,
  },
  menuIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15, // primary label — matches bookings cardTitle
    color: "#111827",
    marginBottom: 2,
  },
  menuSub: {
    fontFamily: fonts.body,
    fontSize: 13, // sub text — matches bookings cardSubTitle
    color: "#9CA3AF",
  },

  // ── Logout row ────────────────────────────────────────────────────────────
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    gap: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#F3F4F6",
  },
  logoutTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 15, // same as menuTitle
    color: "#DC2626",
    marginBottom: 2,
  },

  // ── Delete button ─────────────────────────────────────────────────────────
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    justifyContent: "center",
    marginTop: 6,
  },
  deleteTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14, // button-level
    color: "#DC2626",
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  mantra: {
    textAlign: "center",
    marginTop: 32,
    fontFamily: fonts.heading,
    fontSize: 18,
    color: "#D95D39",
  },
  version: {
    textAlign: "center",
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 10,
    color: "#D1D5DB",
    letterSpacing: 2,
    marginBottom: 4,
  },

  // ── Gate (not logged in) ──────────────────────────────────────────────────
  gateBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingTop: 40,
    gap: 10,
  },
  gateSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 6,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    backgroundColor: PRIMARY,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 50,
  },
  loginBtnTxt: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 14 }, // button level

  // ── Guest note ────────────────────────────────────────────────────────────
  guestNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  guestNoteTxt: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 11,
    color: "#9CA3AF",
    lineHeight: 16,
  },
});
