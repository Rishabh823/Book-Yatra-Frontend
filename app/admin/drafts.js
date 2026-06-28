import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { tours as toursApi } from "../../lib/api";
import { colors, fonts } from "../../lib/theme";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";
import { useColors } from "../../lib/ThemeContext";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const stepLabel = (n) => {
  const steps = ["", "Basic Info", "Itinerary", "Route", "Bus", "Driver", "Volunteer", "Seats", "Pricing", "Facilities", "Documents", "Booking Rules", "Safety", "Notifications", "Review"];
  return steps[n] || `Step ${n}`;
};

export default function DraftsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useColors();
  const s = useMemo(() => makeStyles(themeColors), [themeColors]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const { toast, showToast, hideToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [publishTarget, setPublishTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await toursApi.drafts();
      const list = Array.isArray(res) ? res : res?.data || [];
      setDrafts(list);
    } catch (e) {
      showToast("Failed to load drafts", "error");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (item) => {
    setDeleteTarget(item);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setShowDeleteConfirm(false);
    setDeleting(deleteTarget._id);
    try {
      await toursApi.remove(deleteTarget._id);
      setDrafts((prev) => prev.filter((d) => d._id !== deleteTarget._id));
    } catch (e) {
      showToast(e.message || "Failed to delete draft", "error");
    }
    setDeleting(null);
    setDeleteTarget(null);
  };

  const handlePublish = (item) => {
    if (!item.title || !item.source || !item.destination) {
      showToast("Please complete Title, Source and Destination before publishing.", "error");
      return;
    }
    setPublishTarget(item);
    setShowPublishConfirm(true);
  };

  const handlePublishConfirmed = async () => {
    if (!publishTarget) return;
    setShowPublishConfirm(false);
    try {
      await toursApi.publish(publishTarget._id);
      setDrafts((prev) => prev.filter((d) => d._id !== publishTarget._id));
      showToast("Tour is now live for your followers.", "success");
    } catch (e) {
      showToast(e.message || "Failed to publish", "error");
    }
    setPublishTarget(null);
  };

  const progress = (item) => {
    const completed = item.completedSteps || 0;
    return Math.min(Math.round((completed / 14) * 100), 100);
  };

  const renderDraft = ({ item }) => {
    const pct = progress(item);
    const isDeleting = deleting === item._id;

    return (
      <View style={s.card}>
        {/* Main tappable area */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(`/admin/tour/create?id=${item._id}`)}
        >
          <View style={s.cardTop}>
            <View style={s.iconBox}>
              <Ionicons name="document-text" size={22} color={themeColors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.tourTitle} numberOfLines={1}>
                {item.title || "Untitled Tour"}
              </Text>
              {item.source || item.destination ? (
                <Text style={s.tourRoute} numberOfLines={1}>
                  {item.source || "—"} → {item.destination || "—"}
                </Text>
              ) : (
                <Text style={s.tourRouteDim}>Route not set</Text>
              )}
              <Text style={s.tourDate}>
                {item.startDate ? `Departs ${fmtDate(item.startDate)}` : "Start date not set"}
              </Text>
            </View>
            <View style={s.editChip}>
              <Ionicons name="pencil" size={12} color={themeColors.primary} />
              <Text style={s.editChipTxt}>Edit</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={s.progressSection}>
            <View style={s.progressHeader}>
              <Text style={s.progressLabel}>
                {item.completedSteps ? `Last: ${stepLabel(item.completedSteps)}` : "Not started"}
              </Text>
              <Text style={s.progressPct}>{pct}%</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${pct}%` }]} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Action row */}
        <View style={s.actionRow}>
          <Text style={s.savedDate}>Saved {fmtDate(item.updatedAt || item.createdAt)}</Text>
          <View style={s.actionBtns}>
            <TouchableOpacity
              style={s.publishBtn}
              onPress={() => handlePublish(item)}
            >
              <Ionicons name="rocket-outline" size={13} color="#16A34A" />
              <Text style={s.publishBtnTxt}>Publish</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.deleteBtn}
              onPress={() => handleDelete(item)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={themeColors.error} />
              ) : (
                <Ionicons name="trash-outline" size={14} color={themeColors.error} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Draft Tours</Text>
          <Text style={s.subtitle}>
            {loading ? "Loading…" : `${drafts.length} saved draft${drafts.length !== 1 ? "s" : ""}`}
          </Text>
        </View>
        <TouchableOpacity
          style={s.newBtn}
          onPress={() => router.push("/admin/tour/create")}
        >
          <Ionicons name="add" size={20} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={themeColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={drafts}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderDraft}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: insets.bottom + 24,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="document-outline" size={56} color={themeColors.textDisabled} />
              <Text style={s.emptyTitle}>No drafts yet</Text>
              <Text style={s.emptySub}>
                Start creating a tour and save it as a draft to continue later.
              </Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => router.push("/admin/tour/create")}
              >
                <Ionicons name="add-circle-outline" size={18} color="white" />
                <Text style={s.emptyBtnTxt}>Create New Tour</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Draft"
        message={`Delete "${deleteTarget?.title || "Untitled Tour"}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setShowDeleteConfirm(false)}
        onDismiss={() => setShowDeleteConfirm(false)}
        destructive
      />
      <ConfirmModal
        visible={showPublishConfirm}
        title="Publish Tour"
        message={`Publish "${publishTarget?.title}" and make it visible to travelers?`}
        confirmText="Publish"
        cancelText="Cancel"
        onConfirm={handlePublishConfirmed}
        onCancel={() => setShowPublishConfirm(false)}
        onDismiss={() => setShowPublishConfirm(false)}
      />
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.elevated,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  title: { fontFamily: "Philosopher_700Bold", fontSize: 20, color: colors.textPrimary },
  subtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  newBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.elevated,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.borderSubtle,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    paddingBottom: 10,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 16,
    backgroundColor: colors.primary + "18",
    alignItems: "center", justifyContent: "center",
  },
  tourTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  tourRoute: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary, marginTop: 2 },
  tourRouteDim: { fontFamily: fonts.body, fontSize: 12, color: colors.textDisabled, marginTop: 2 },
  tourDate: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  editChip: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: colors.primary + "18",
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 999,
  },
  editChipTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primary },

  progressSection: { paddingHorizontal: 14, paddingBottom: 12, gap: 6 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  progressPct: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primary },
  progressTrack: {
    height: 5, backgroundColor: colors.elevated, borderRadius: 3, overflow: "hidden",
  },
  progressFill: {
    height: "100%", backgroundColor: colors.primary, borderRadius: 3,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  savedDate: { fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled },
  actionBtns: { flexDirection: "row", alignItems: "center", gap: 8 },
  publishBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#16A34A18",
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999,
  },
  publishBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#16A34A" },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#DC262618",
    alignItems: "center", justifyContent: "center",
  },

  empty: { alignItems: "center", paddingVertical: 60, gap: 10, paddingHorizontal: 24 },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: "center" },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  emptyBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "white" },
});
