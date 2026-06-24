import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminShell } from "../../../lib/AdminScreen";
import { fonts } from "../../../lib/theme";
import { useColors } from "../../../lib/ThemeContext";
import { superAdmin as superApi } from "../../../lib/api";
import ConfirmModal from "../../../components/ConfirmModal";
import Toast from "../../../components/Toast";
import { useToast } from "../../../lib/hooks/useToast";

const TARGETS = [
  { key: "all", label: "Everyone", icon: "people", color: "#0284C7" },
  { key: "users", label: "Users Only", icon: "person", color: "#16A34A" },
  { key: "admin", label: "Admins Only", icon: "shield", color: "#D97706" },
  {
    key: "volunteer",
    label: "Volunteers",
    icon: "people-circle",
    color: "#7C3AED",
  },
];

export default function SuperNotifications() {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { toast, showToast, hideToast } = useToast();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("all");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const res = await superApi.notificationHistory(1);
      const list = Array.isArray(res)
        ? res
        : res?.notifications || res?.data || [];
      setHistory(list);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const validate = () => {
    if (!title.trim()) {
      showToast("Please enter a notification title.");
      return false;
    }
    if (!body.trim()) {
      showToast("Please enter a message body.");
      return false;
    }
    return true;
  };

  const handleSendPress = () => {
    if (validate()) setShowConfirm(true);
  };

  const confirmSend = async () => {
    setShowConfirm(false);
    setSending(true);
    try {
      const TARGET_ROLE_MAP = {
        all: null,
        users: "user",
        admin: "admin",
        volunteer: "volunteer",
      };
      const roleVal = TARGET_ROLE_MAP[target];
      const payload = { title: title.trim(), body: body.trim() };
      if (roleVal) payload.role = roleVal;
      await superApi.broadcastNotification(payload);
      showToast("Notification sent successfully!", "success");
      setTitle("");
      setBody("");
      loadHistory();
    } catch (e) {
      showToast(e.message || "Failed to send notification.");
    } finally {
      setSending(false);
    }
  };

  const selectedTarget = TARGETS.find((t) => t.key === target);

  return (
    <AdminShell
      title="Broadcast Notification"
      subtitle="Send push alerts to users"
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Compose ─────────────────────────────── */}
        <SectionLabel
          icon="create-outline"
          title="Compose"
          colors={colors}
          s={s}
        />

        <View style={s.card}>
          <Text style={s.fieldLabel}>Title</Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Tour Update: Kedarnath Yatra"
            placeholderTextColor={colors.textDisabled}
            maxLength={80}
          />
          <Text style={s.charCount}>{title.length}/80</Text>
        </View>

        <View style={s.card}>
          <Text style={s.fieldLabel}>Message</Text>
          <TextInput
            style={[s.input, s.textarea]}
            value={body}
            onChangeText={setBody}
            placeholder="Enter your message here..."
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={300}
          />
          <Text style={s.charCount}>{body.length}/300</Text>
        </View>

        {/* ── Target Audience ──────────────────────── */}
        <SectionLabel
          icon="funnel-outline"
          title="Target Audience"
          colors={colors}
          s={s}
        />
        <View style={s.targetGrid}>
          {TARGETS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                s.targetCard,
                target === t.key && {
                  borderColor: t.color,
                  backgroundColor: t.color + "18",
                },
              ]}
              onPress={() => setTarget(t.key)}
              activeOpacity={0.8}
            >
              <View style={[s.targetIcon, { backgroundColor: t.color + "20" }]}>
                <Ionicons name={t.icon} size={20} color={t.color} />
              </View>
              <Text
                style={[
                  s.targetLabel,
                  target === t.key && {
                    color: t.color,
                    fontFamily: fonts.bodyBold,
                  },
                ]}
              >
                {t.label}
              </Text>
              {target === t.key && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={t.color}
                  style={{ position: "absolute", top: 8, right: 8 }}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Send Button ──────────────────────────── */}
        <TouchableOpacity
          style={[s.sendBtn, sending && { opacity: 0.6 }]}
          onPress={handleSendPress}
          disabled={sending}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={s.sendTxt}>Send Notification</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── History ──────────────────────────────── */}
        <SectionLabel
          icon="time-outline"
          title="Recent Broadcasts"
          colors={colors}
          s={s}
        />

        {loadingHistory ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : history.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons
              name="notifications-off-outline"
              size={32}
              color={colors.textDisabled}
            />
            <Text style={s.emptyTxt}>No notifications sent yet</Text>
          </View>
        ) : (
          history.map((n, i) => (
            <View key={i} style={s.historyCard}>
              <View style={s.historyTop}>
                <Text style={s.historyTitle} numberOfLines={1}>
                  {n.title || n.notification?.title || "Untitled"}
                </Text>
                <View
                  style={[
                    s.targetBadge,
                    { backgroundColor: colors.primary + "18" },
                  ]}
                >
                  <Text style={[s.targetBadgeTxt, { color: colors.primary }]}>
                    {TARGETS.find((t) => t.key === n.target)?.label ||
                      n.target ||
                      "All"}
                  </Text>
                </View>
              </View>
              <Text style={s.historyBody} numberOfLines={2}>
                {n.body || n.notification?.body || ""}
              </Text>
              {n.createdAt && (
                <Text style={s.historyTime}>
                  {new Date(n.createdAt).toLocaleString()}
                </Text>
              )}
            </View>
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <ConfirmModal
        visible={showConfirm}
        icon="send-outline"
        title="Send Notification?"
        message={`Send "${title}" to ${selectedTarget?.label || "Everyone"}?`}
        confirmText="Send"
        cancelText="Cancel"
        onConfirm={confirmSend}
        onCancel={() => setShowConfirm(false)}
        onDismiss={() => setShowConfirm(false)}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </AdminShell>
  );
}

function SectionLabel({ icon, title, colors, s }) {
  return (
    <View style={s.sectionRow}>
      <Ionicons name={icon} size={13} color={colors.textSecondary} />
      <Text style={s.sectionLabel}>{title}</Text>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

    sectionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 20,
      marginBottom: 8,
    },
    sectionLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 10,
      color: colors.textSecondary,
      letterSpacing: 2,
      textTransform: "uppercase",
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    fieldLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textPrimary,
    },
    textarea: { height: 96, paddingTop: 12, textAlignVertical: "top" },
    charCount: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textDisabled,
      textAlign: "right",
      marginTop: 4,
    },

    targetGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 4,
    },
    targetCard: {
      flex: 1,
      minWidth: "45%",
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: 14,
      alignItems: "center",
      gap: 8,
    },
    targetIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    targetLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textPrimary,
      textAlign: "center",
    },

    sendBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginTop: 20,
      height: 56,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    sendTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" },

    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 32,
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    emptyTxt: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textDisabled,
    },

    historyCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    historyTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    historyTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
      flex: 1,
    },
    historyBody: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    historyTime: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textDisabled,
      marginTop: 6,
    },
    targetBadge: {
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginLeft: 8,
    },
    targetBadgeTxt: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  });
