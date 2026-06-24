import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { securityApi } from "../../lib/api";
import { fonts, radius, shadow } from "../../lib/theme";
import { useColors } from "../../lib/ThemeContext";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";

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
  const { toast, showToast, hideToast } = useToast();
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null); // { id, name }

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
      showToast(e.message, "error");
    }
  }, [showToast]);

  const handleRemove = useCallback((id, name) => {
    setPendingRemove({ id, name });
    setShowRemoveConfirm(true);
  }, []);

  const handleRemoveConfirmed = useCallback(async () => {
    setShowRemoveConfirm(false);
    if (!pendingRemove) return;
    try {
      await securityApi.removeDevice(pendingRemove.id);
      setDevices((prev) => prev.filter((d) => d._id !== pendingRemove.id));
    } catch (e) {
      showToast(e.message, "error");
    }
    setPendingRemove(null);
  }, [pendingRemove, showToast]);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.headerTitle}>Trusted Devices</Text>
          <Text style={s.headerSub}>
            {devices.length} device{devices.length !== 1 ? 's' : ''} registered
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

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
            tintColor={colors.primary} colors={[colors.primary]}
          />
        }
      >
        {loading && <Text style={s.emptyText}>Loading devices…</Text>}
        {!loading && devices.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons
              name="phone-portrait-outline"
              size={40}
              color={colors.textDisabled}
            />
            <Text style={s.emptyText}>No devices found.</Text>
          </View>
        )}
        {devices.map((device) => (
          <View key={device._id} style={[s.card, shadow.soft]}>
            <View
              style={[
                s.iconWrap,
                {
                  backgroundColor: device.trusted
                    ? colors.primaryLight
                    : colors.elevated,
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
                <Text style={s.deviceName} numberOfLines={1}>
                  {device.deviceName}
                </Text>
                {device.trusted && (
                  <View style={s.trustedBadge}>
                    <Text style={s.trustedText}>Trusted</Text>
                  </View>
                )}
              </View>
              <Text style={s.deviceMeta}>
                {device.platform} · {device.ipAddress}
              </Text>
              <Text style={s.deviceDate}>
                Last seen {fmtDate(device.lastLoginAt)}
              </Text>
            </View>
            <View style={{ gap: 6 }}>
              {!device.trusted && (
                <TouchableOpacity
                  style={s.trustBtn}
                  onPress={() => handleTrust(device._id)}
                >
                  <Text style={s.trustBtnText}>Trust</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={s.removeBtn}
                onPress={() => handleRemove(device._id, device.deviceName)}
              >
                <Ionicons name="trash-outline" size={15} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={s.infoCard}>
          <Ionicons
            name="information-circle"
            size={18}
            color={colors.primary}
          />
          <Text style={s.infoText}>
            Devices are registered automatically when you log in. Trust a device
            to skip extra verification on future logins from that device.
          </Text>
        </View>
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmModal
        visible={showRemoveConfirm}
        title="Remove Device"
        message={pendingRemove ? `Remove "${pendingRemove.name}" from your trusted devices?` : ""}
        confirmText="Remove"
        onConfirm={handleRemoveConfirmed}
        onCancel={() => { setShowRemoveConfirm(false); setPendingRemove(null); }}
        onDismiss={() => { setShowRemoveConfirm(false); setPendingRemove(null); }}
        destructive={true}
      />
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Philosopher_700Bold', fontSize: 18, color: colors.textPrimary },
  headerSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 1 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
    backgroundColor: colors.elevated,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  infoText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
