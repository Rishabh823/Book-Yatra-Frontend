import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { securityApi } from "../../lib/api";
import { colors, fonts, radius, shadow } from "../../lib/theme";

const PLATFORM_ICON = (p) => {
  const pl = (p || "").toLowerCase();
  if (pl === "ios") return "logo-apple";
  if (pl === "android") return "logo-android";
  return "phone-portrait";
};

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function DevicesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await securityApi.getDevices();
      setDevices(res.devices || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleTrust = useCallback(async (id) => {
    try {
      await securityApi.trustDevice(id);
      setDevices((prev) =>
        prev.map((d) => (d._id === id ? { ...d, trusted: true } : d)),
      );
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  }, []);

  const handleRemove = useCallback((id, name) => {
    Alert.alert(
      "Remove Device",
      `Remove "${name}" from your trusted devices?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await securityApi.removeDevice(id);
              setDevices((prev) => prev.filter((d) => d._id !== id));
            } catch (e) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ],
    );
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={["#1E0A0A", "#5C1615"]}
        style={[styles.hero, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.heroTitle}>Trusted Devices</Text>
        <Text style={styles.heroSub}>
          {devices.length} device{devices.length !== 1 ? "s" : ""} registered
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
          paddingTop: 16,
          gap: 10,
          maxWidth: 520, width: '100%', alignSelf: 'center',
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            tintColor={colors.primary}
          />
        }
      >
        {loading && <Text style={styles.emptyText}>Loading devices…</Text>}
        {!loading && devices.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name="phone-portrait-outline"
              size={40}
              color={colors.textDisabled}
            />
            <Text style={styles.emptyText}>No devices found.</Text>
          </View>
        )}
        {devices.map((device) => (
          <View key={device._id} style={[styles.card, shadow.soft]}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: device.trusted
                    ? colors.primaryLight
                    : "#F3F4F6",
                },
              ]}
            >
              <Ionicons
                name={PLATFORM_ICON(device.platform)}
                size={22}
                color={device.trusted ? colors.primary : colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Text style={styles.deviceName} numberOfLines={1}>
                  {device.deviceName}
                </Text>
                {device.trusted && (
                  <View style={styles.trustedBadge}>
                    <Text style={styles.trustedText}>Trusted</Text>
                  </View>
                )}
              </View>
              <Text style={styles.deviceMeta}>
                {device.platform} · {device.ipAddress}
              </Text>
              <Text style={styles.deviceDate}>
                Last seen {fmtDate(device.lastLoginAt)}
              </Text>
            </View>
            <View style={{ gap: 6 }}>
              {!device.trusted && (
                <TouchableOpacity
                  style={styles.trustBtn}
                  onPress={() => handleTrust(device._id)}
                >
                  <Text style={styles.trustBtnText}>Trust</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemove(device._id, device.deviceName)}
              >
                <Ionicons name="trash-outline" size={15} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle"
            size={18}
            color={colors.primary}
          />
          <Text style={styles.infoText}>
            Devices are registered automatically when you log in. Trust a device
            to skip extra verification on future logins from that device.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 28 },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: { fontFamily: fonts.heading, fontSize: 24, color: "white" },
  heroSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  deviceMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deviceDate: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textDisabled,
    marginTop: 1,
  },

  trustedBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  trustedText: { fontFamily: fonts.bodyBold, fontSize: 10, color: "#16A34A" },

  trustBtn: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: "center",
  },
  trustBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.primary,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyState: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textDisabled,
    textAlign: "center",
  },

  infoCard: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: 12,
  },
  infoText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondary,
    lineHeight: 18,
  },
});
