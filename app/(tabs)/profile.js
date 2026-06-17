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
  Alert,
} from "react-native";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts, radius, shadow } from "../../lib/theme";
import { auth as authApi } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { useTheme } from "../../lib/ThemeContext";

const getUserMenu = (t) => [
  {
    icon: "person-outline",
    label: t.editProfile,
    sub: "Manage personal info",
    action: "profile",
    color: "#D95D39",
  },
  {
    icon: "bus-outline",
    label: "My Operators",
    sub: "Change operators you follow",
    action: "select-operators",
    color: "#0284C7",
  },
  {
    icon: "people-outline",
    label: t.membership,
    sub: t.membershipSub,
    action: "membership",
    color: "#16A34A",
  },
  {
    icon: "images-outline",
    label: t.gallery,
    sub: "Photos & memories",
    action: "gallery",
    color: "#0891B2",
  },
  {
    icon: "heart-outline",
    label: "My Favorites",
    sub: "Saved tours & destinations",
    action: "favorites",
    color: "#EF4444",
  },
  {
    icon: "chatbubbles-outline",
    label: "Community",
    sub: "Travel stories & tips",
    action: "community",
    color: "#7C3AED",
  },
  {
    icon: "chatbubble-outline",
    label: "Chat",
    sub: "Messages & group chats",
    action: "chat",
    color: "#2563EB",
  },
  {
    icon: "star-outline",
    label: "Rewards",
    sub: "Points, badges & leaderboard",
    action: "rewards",
    color: "#D97706",
  },
  {
    icon: "lock-closed-outline",
    label: "Document Vault",
    sub: "Secure travel documents",
    action: "document-vault",
    color: "#0891B2",
  },
  {
    icon: "pricetag-outline",
    label: "Offers & Coupons",
    sub: "Discounts & voucher codes",
    action: "coupons",
    color: "#16A34A",
  },
  {
    icon: "heart-circle-outline",
    label: "Donate / Seva Daan",
    sub: "Support community causes",
    action: "donate",
    color: "#D95D39",
  },
  {
    icon: "color-palette-outline",
    label: "Appearance",
    sub: "Dark mode & color themes",
    action: "theme-settings",
    color: "#7C3AED",
  },
  {
    icon: "shield-checkmark-outline",
    label: "Security",
    sub: "PIN, biometrics, MFA & more",
    action: "security",
    color: "#5C1615",
  },
  {
    icon: "warning-outline",
    label: "Emergency SOS",
    sub: "Tap to send an emergency alert",
    action: "sos",
    color: "#DC2626",
  },
  {
    icon: "chatbubbles-outline",
    label: t.feedback,
    sub: "Share your experience",
    action: "feedback",
    color: "#D97706",
  },
  {
    icon: "call-outline",
    label: "Contact Us",
    sub: "+91 9958985187",
    action: "contact",
    color: "#EA580C",
  },
  {
    icon: "information-circle-outline",
    label: "About",
    sub: "About TripKart",
    action: "about",
    color: "#5C1615",
  },
];

const SUPER_ADMIN_GRID = [
  { icon: "planet",            label: "Overview",      action: "super-dashboard",     color: "#1E0A0A", bg: "#FEF2F2" },
  { icon: "business",          label: "Operators",     action: "super-operators",     color: "#7C3AED", bg: "#F5F3FF" },
  { icon: "people",            label: "Users",         action: "super-users",         color: "#0284C7", bg: "#EFF6FF" },
  { icon: "bus",               label: "Tours",         action: "super-tours",         color: "#16A34A", bg: "#F0FDF4" },
  { icon: "ticket",            label: "Bookings",      action: "super-bookings",      color: "#D95D39", bg: "#FDECE7" },
  { icon: "shield-checkmark",  label: "Roles",         action: "super-roles",         color: "#D97706", bg: "#FFFBEB" },
  { icon: "cash-outline",      label: "Finance",       action: "super-finance",       color: "#16A34A", bg: "#F0FDF4" },
  { icon: "arrow-up-circle",   label: "Withdrawals",   action: "super-withdrawals",   color: "#7C3AED", bg: "#F5F3FF" },
  { icon: "heart",             label: "Donations",     action: "super-donations",     color: "#DC2626", bg: "#FEF2F2" },
  { icon: "notifications",     label: "Notify All",    action: "super-notifications", color: "#0891B2", bg: "#ECFEFF" },
  { icon: "refresh-circle",    label: "Refunds",       action: "super-refunds",       color: "#D97706", bg: "#FFFBEB" },
  { icon: "settings",          label: "Settings",      action: "admin-settings",      color: "#6B7280", bg: "#F9FAFB" },
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
    bg: "#FDECE7",
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
    color: "#EA580C",
    bg: "#FFF7ED",
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
];

const VOLUNTEER_MENU = [
  {
    icon: "people-circle-outline",
    label: "Volunteer Hub",
    sub: "Dashboard & assigned tours",
    action: "volunteer-hub",
    color: "#16A34A",
  },
  {
    icon: "qr-code-outline",
    label: "Scan Check-In",
    sub: "Scan passenger QR codes",
    action: "volunteer-scan",
    color: "#0284C7",
  },
  {
    icon: "list-outline",
    label: "Passenger List",
    sub: "View and manage check-ins",
    action: "volunteer-list",
    color: "#7C3AED",
  },
  {
    icon: "warning-outline",
    label: "Report Incident",
    sub: "Log incidents & emergencies",
    action: "volunteer-incident",
    color: "#DC2626",
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
  "super-dashboard":     "/admin/super/dashboard",
  "super-operators":     "/admin/super/operators",
  "super-users":         "/admin/super/users",
  "super-tours":         "/admin/super/tours",
  "super-bookings":      "/admin/super/bookings",
  "super-roles":         "/admin/super/roles",
  "super-finance":       "/admin/super/finance",
  "super-withdrawals":   "/admin/super/withdrawals",
  "super-donations":     "/admin/donations",
  "super-notifications": "/admin/super/notifications",
  "super-refunds":       "/admin/super/refunds",
  "volunteer-hub": "/volunteer",
  "volunteer-scan": "/volunteer/checkin",
  "volunteer-list": "/volunteer/passengers",
  "volunteer-incident": "/volunteer/report-incident",
};

const ROLE_COLORS = {
  super_admin: { bg: "#1E0A0A", text: "#FFD700", icon: "shield-checkmark" },
  admin: { bg: "#FEF2F2", text: "#DC2626", icon: "shield" },
  manager: { bg: "#FFF7ED", text: "#EA580C", icon: "briefcase" },
  volunteer: { bg: "#F0FDF4", text: "#16A34A", icon: "people" },
  user: { bg: "rgba(255,255,255,0.12)", text: "#FFE9C0", icon: "person" },
  guest: {
    bg: "rgba(255,255,255,0.12)",
    text: "#FFE9C0",
    icon: "person-outline",
  },
};

export default function Profile() {
  const router = useRouter();
  const { lang, t, toggle: toggleLang } = useLang();
  const { theme, isDark } = useTheme();
  const colors = theme;
  const { width } = useWindowDimensions();
  const gridCols = width >= 500 ? 4 : 3;
  const gridCardW = (width - 48 - 12 * (gridCols - 1)) / gridCols;
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [user, setUser] = useState(null);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Immediately reflect photo changes made on the edit-profile screen
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
  const roleStyle = ROLE_COLORS[user?.role || "user"];
  const initial = (user?.name || "?").charAt(0).toUpperCase();

  // ── Not-logged-in gate (same style as Bookings tab) ─────────────────────
  if (!loading && !authed) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.bg }}
        edges={["top"]}
      >
        <LinearGradient
          colors={[colors.secondary, "#3D0D0C"]}
          style={s.heroGate}
        >
          <TouchableOpacity style={s.langToggle} onPress={toggleLang}>
            <Text style={s.langToggleTxt}>{lang}</Text>
          </TouchableOpacity>
          <Ionicons name="person-circle-outline" size={52} color="rgba(255,233,192,0.9)" style={{ marginBottom: 6 }} />
          <Text style={s.gateHeroTitle}>My Profile</Text>
          <Text style={s.gateHeroSub}>
            Your sacred journey, all in one place
          </Text>
        </LinearGradient>
        <View style={s.gateBody}>
          <View style={s.gateIconWrap}>
            <Ionicons name="person-outline" size={36} color={colors.primary} />
          </View>
          <Text style={s.gateTitle}>Login to continue</Text>
          <Text style={s.gateSub}>
            Sign in to manage bookings, track yatras, and access your seva
            history.
          </Text>
          <TouchableOpacity
            style={s.gateLoginBtn}
            onPress={() => router.push("/auth/login")}
            testID="profile-login-btn"
          >
            <Ionicons name="log-in-outline" size={18} color="#fff" />
            <Text style={s.gateLoginTxt}>Login / Register</Text>
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.heroWrap}>
          <LinearGradient
            colors={[colors.secondary, "#3D0D0C"]}
            style={s.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={s.heroDecor1} />
            <View style={s.heroDecor2} />
            <TouchableOpacity style={s.langToggle} onPress={toggleLang}>
              <Text style={s.langToggleTxt}>{lang}</Text>
            </TouchableOpacity>

            {loading ? (
              <ActivityIndicator
                color="#FFE9C0"
                size="large"
                style={{ marginVertical: 24 }}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={s.avatarWrap}
                  onPress={() => router.push("/edit-profile")}
                  testID="profile-avatar-btn"
                >
                  {user?.photoUrl ? (
                    <Image
                      source={{ uri: user.photoUrl }}
                      style={s.avatarImg}
                    />
                  ) : (
                    <View style={s.avatar}>
                      <Text style={s.avatarTxt}>{initial}</Text>
                    </View>
                  )}
                  <View style={s.avatarEdit}>
                    <Ionicons name="camera" size={12} color="#fff" />
                  </View>
                </TouchableOpacity>
                <Text style={s.name}>{user?.name || "—"}</Text>
                <Text style={s.email}>
                  {isGuest
                    ? "Guest User · Temporary Session"
                    : user?.email || user?.phone || "TripKart devotee"}
                </Text>
                <View style={s.badges}>
                  <View
                    style={[
                      s.badge,
                      isAdmin && s.badgeAdmin,
                      isSuperAdmin && s.badgeSA,
                    ]}
                  >
                    <Ionicons
                      name={roleStyle.icon}
                      size={12}
                      color={isSuperAdmin ? "#FFD700" : "#FFE9C0"}
                    />
                    <Text
                      style={[s.badgeTxt, isSuperAdmin && { color: "#FFD700" }]}
                    >
                      {(user?.role || "user").charAt(0).toUpperCase() +
                        (user?.role || "user").slice(1).replace("_", " ")}
                    </Text>
                  </View>
                  <View style={s.badge}>
                    <Ionicons name="star" size={12} color="#FFE9C0" />
                    <Text style={s.badgeTxt}>Devotee</Text>
                  </View>
                </View>
              </>
            )}
          </LinearGradient>
        </View>

        {/* ── Super Admin Grid ─────────────────────────── */}
        {isSuperAdmin && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Ionicons name="shield-checkmark" size={13} color="#FFD700" />
              <Text style={[s.sectionLabel, { color: "#BFA000" }]}>
                · Super Admin ·
              </Text>
            </View>
            <View style={[s.iconGrid, { gap: 12 }]}>
              {SUPER_ADMIN_GRID.map((m, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.iconCard,
                    {
                      width: gridCardW,
                      backgroundColor: isDark ? theme.elevated : m.bg,
                    },
                  ]}
                  onPress={() => handleAction(m.action)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[s.iconCircle, { backgroundColor: m.color + "1A" }]}
                  >
                    <Ionicons name={m.icon} size={22} color={m.color} />
                  </View>
                  <Text
                    style={[
                      s.iconLabel,
                      isDark && { color: theme.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Volunteer Menu ───────────────────────────── */}
        {isVolunteer && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Ionicons name="people" size={13} color="#16A34A" />
              <Text style={[s.sectionLabel, { color: "#16A34A" }]}>
                · Volunteer Panel ·
              </Text>
            </View>
            {VOLUNTEER_MENU.map((m, i) => (
              <MenuItem
                key={i}
                item={m}
                onPress={() => handleAction(m.action)}
              />
            ))}
          </View>
        )}

        {/* ── Admin Grid ───────────────────────────────── */}
        {isAdmin && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Ionicons
                name="shield-checkmark"
                size={13}
                color={colors.primary}
              />
              <Text style={s.sectionLabel}>· Admin Panel ·</Text>
            </View>
            <View style={[s.iconGrid, { gap: 12 }]}>
              {ADMIN_GRID.map((m, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.iconCard,
                    {
                      width: gridCardW,
                      backgroundColor: isDark ? theme.elevated : m.bg,
                    },
                  ]}
                  onPress={() => handleAction(m.action)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[s.iconCircle, { backgroundColor: m.color + "1A" }]}
                  >
                    <Ionicons name={m.icon} size={22} color={m.color} />
                  </View>
                  <Text
                    style={[
                      s.iconLabel,
                      isDark && { color: theme.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── User menu ────────────────────────────────── */}
        {authed && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={s.sectionLabel}>· Services & Support ·</Text>
            </View>
            {getUserMenu(t)
              .filter((m) => {
                if (isAdmin || isSuperAdmin) {
                  return !["select-operators", "favorites"].includes(m.action);
                }
                if (isVolunteer) {
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
                }
                return true;
              })
              .map((m, i) => (
                <MenuItem
                  key={i}
                  item={m}
                  onPress={() => handleAction(m.action)}
                />
              ))}

            <TouchableOpacity
              style={s.logout}
              onPress={logout}
              testID="logout-btn"
            >
              <View style={s.logoutIcon}>
                <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              </View>
              <Text style={s.logoutTxt}>
                {isGuest ? "Exit Guest Session" : t.logout}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#DC262644" />
            </TouchableOpacity>

            {!isGuest && (
              <TouchableOpacity
                style={s.deleteAccBtn}
                onPress={() =>
                  Alert.alert(
                    "Delete Account",
                    "This will permanently delete your account, all bookings, and tour data. This cannot be undone.\n\nAre you sure?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete Permanently",
                        style: "destructive",
                        onPress: async () => {
                          try {
                            await authApi.deleteAccount();
                          } catch {}
                          await authApi.logout();
                          DeviceEventEmitter.emit("userPhotoChanged", null);
                          setAuthed(false);
                          setUser(null);
                          router.replace("/auth/login");
                        },
                      },
                    ],
                  )
                }
                testID="delete-account-btn"
              >
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text style={s.deleteAccTxt}>Delete My Account</Text>
              </TouchableOpacity>
            )}

            {isGuest && (
              <View style={s.guestNote}>
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={s.guestNoteTxt}>
                  Guest session — your bookings are saved but your account will
                  be deleted on sign out.
                </Text>
              </View>
            )}

            <Text style={s.footer}>{t.mantra}</Text>
            <Text style={s.version}>v1.0.0 · TripKart</Text>
          </View>
        )}
      </ScrollView>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

function MenuItem({ item, onPress }) {
  const { theme } = useTheme();
  const colors = theme;
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[s.menuItem, { backgroundColor: theme.surface }]}
      onPress={onPress}
      testID={`menu-${item.action}`}
    >
      <View
        style={[
          s.menuIcon,
          { backgroundColor: (item.color || colors.primary) + "14" },
        ]}
      >
        <Ionicons
          name={item.icon}
          size={20}
          color={item.color || colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[s.menuLabel, { color: theme.textPrimary }]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        <Text
          style={[s.menuSub, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {item.sub}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
    </TouchableOpacity>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  // Hero
  heroWrap: { paddingHorizontal: 16, paddingTop: 8 },
  hero: {
    borderRadius: radius.xxl,
    padding: 28,
    alignItems: "center",
    overflow: "hidden",
  },
  heroDecor1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.04)",
    top: -60,
    right: -50,
  },
  heroDecor2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.03)",
    bottom: -30,
    left: -30,
  },
  langToggle: {
    position: "absolute",
    top: 14,
    right: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radius.pill,
    zIndex: 10,
  },
  langToggleTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: "#fff",
    letterSpacing: 1,
  },

  avatarWrap: { position: "relative", marginBottom: 4 },
  avatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "#FFE9C0",
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFE9C0",
  },
  avatarTxt: { color: "#fff", fontFamily: fonts.heading, fontSize: 38 },
  avatarEdit: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  name: {
    color: "#fff",
    fontFamily: fonts.heading,
    fontSize: 24,
    marginTop: 14,
  },
  email: {
    color: "#FFE9C0",
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 4,
  },
  badges: { flexDirection: "row", gap: 8, marginTop: 14 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,233,192,0.25)",
  },
  badgeAdmin: {
    backgroundColor: "rgba(255,165,0,0.2)",
    borderColor: "#D97706",
  },
  badgeSA: { backgroundColor: "rgba(30,10,10,0.9)", borderColor: "#FFD700" },
  badgeTxt: { color: "#FFE9C0", fontFamily: fonts.bodyMedium, fontSize: 11 },

  // Not-logged-in gate styles (matches Bookings tab gate)
  heroGate: {
    paddingTop: 40,
    paddingBottom: 32,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  gateHeroTitle: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: "#fff",
    letterSpacing: -0.3,
  },
  gateHeroSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "#FFE9C0",
    marginTop: 4,
  },
  gateBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 10,
    paddingTop: 60,
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
  gateLoginBtn: {
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
  gateLoginTxt: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 14 },

  // Sections
  section: { marginTop: 20, paddingHorizontal: 24 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 14,
  },
  sectionLabel: {
    fontFamily: fonts.accent,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 3,
    textAlign: "center",
  },

  // Icon grid
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  iconCard: {
    alignItems: "center",
    gap: 7,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 6,
    marginBottom: 12,
    ...shadow.soft,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textPrimary,
    textAlign: "center",
  },

  // Menu items
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: radius.lg,
    gap: 14,
    marginBottom: 10,
    ...shadow.soft,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  menuSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  logout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 14,
    borderRadius: radius.lg,
    gap: 14,
    marginTop: 10,
    ...shadow.soft,
  },
  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutTxt: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    color: "#DC2626",
    fontSize: 14,
  },

  guestNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 8,
  },
  guestNoteTxt: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  footer: {
    textAlign: "center",
    marginTop: 36,
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.secondary,
  },
  version: {
    textAlign: "center",
    marginTop: 8,
    fontFamily: fonts.accent,
    fontSize: 10,
    color: colors.textDisabled,
    letterSpacing: 2,
  },
  deleteAccBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#DC262633",
    marginBottom: 10,
    justifyContent: "center",
    marginTop: 20,
  },
  deleteAccTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: "#DC2626",
  },
});
