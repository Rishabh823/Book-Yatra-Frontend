import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, fonts, radius, shadow } from "./theme";
import { auth as authApi } from "./api";

export function AdminShell({
  title,
  subtitle,
  children,
  rightIcon,
  onRightPress,
}) {
  const router = useRouter();
  const [role, setRole] = useState("user");

  useEffect(() => {
    authApi.getRole().then((r) => setRole(r || "user"));
  }, []);

  const isAdmin =
    role === "admin" || role === "manager" || role === "super_admin";
  const isSuperAdmin = role === "super_admin";

  if (!isAdmin) {
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
        <View style={sh.lockIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={32}
            color={colors.primary}
          />
        </View>
        <Text
          style={{
            fontFamily: fonts.heading,
            fontSize: 22,
            color: colors.secondary,
            marginTop: 14,
            marginBottom: 8,
          }}
        >
          Access Restricted
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          This section is for admins and managers only.
        </Text>
        <TouchableOpacity
          style={{
            marginTop: 24,
            backgroundColor: colors.primary,
            paddingHorizontal: 32,
            paddingVertical: 12,
            borderRadius: radius.pill,
          }}
          onPress={() => router.back()}
        >
          <Text style={{ color: "#fff", fontFamily: fonts.bodyBold }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      {/* Header */}
      <View style={sh.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={sh.backBtn}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color={colors.secondary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={sh.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={sh.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightIcon ? (
          <TouchableOpacity
            onPress={onRightPress}
            style={sh.rightBtn}
            hitSlop={8}
          >
            <Ionicons name={rightIcon} size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : isSuperAdmin ? (
          <View style={sh.superBadge}>
            <Ionicons name="shield-checkmark" size={11} color="#FFD700" />
            <Text style={sh.superBadgeTxt}>SA</Text>
          </View>
        ) : null}
      </View>

      {/* Divider */}
      <View style={sh.divider} />

      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}

export function StatCard({ label, value, icon, color, onPress, trend }) {
  const c = color || colors.primary;
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap
      style={[sh.statCard, { borderLeftColor: c }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[sh.statIcon, { backgroundColor: c + "18" }]}>
        <Ionicons name={icon} size={20} color={c} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={sh.statValue}>{value ?? "—"}</Text>
        <Text style={sh.statLabel}>{label}</Text>
      </View>
      {trend !== undefined && (
        <View
          style={[
            sh.trendBadge,
            { backgroundColor: trend >= 0 ? "#DCFCE7" : "#FEE2E2" },
          ]}
        >
          <Ionicons
            name={trend >= 0 ? "trending-up" : "trending-down"}
            size={12}
            color={trend >= 0 ? "#16A34A" : "#DC2626"}
          />
        </View>
      )}
      {onPress && (
        <Ionicons
          name="chevron-forward"
          size={14}
          color={colors.textDisabled}
        />
      )}
    </Wrap>
  );
}

export function StatusBadge({ status }) {
  const MAP = {
    confirmed: { color: "#16A34A", bg: "#F0FDF4", label: "Confirmed" },
    pending: { color: "#D97706", bg: "#FFFBEB", label: "Pending" },
    cancelled: { color: "#DC2626", bg: "#FEF2F2", label: "Cancelled" },
    approved: { color: "#16A34A", bg: "#F0FDF4", label: "Approved" },
    rejected: { color: "#DC2626", bg: "#FEF2F2", label: "Rejected" },
    resolved: { color: "#2563EB", bg: "#EFF6FF", label: "Resolved" },
    open: { color: "#D97706", bg: "#FFFBEB", label: "Open" },
  };
  const m = MAP[status?.toLowerCase()] || {
    color: colors.textSecondary,
    bg: colors.surface,
    label: status || "—",
  };
  return (
    <View style={[sh.badge, { backgroundColor: m.bg }]}>
      <View style={[sh.dot, { backgroundColor: m.color }]} />
      <Text style={[sh.badgeText, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={sh.sectionRow}>
      <Text style={sh.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={sh.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const sh = StyleSheet.create({
  lockIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadow.soft,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.secondary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rightBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
  },
  superBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1E0A0A",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  superBadgeTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: "#FFD700",
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: 16,
    marginBottom: 4,
  },

  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderLeftWidth: 3,
    ...shadow.soft,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.textPrimary,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  trendBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    textTransform: "uppercase",
  },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: fonts.accent,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  sectionAction: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.primary,
  },
});
