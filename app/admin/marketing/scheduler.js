import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AdminShell } from "../../../lib/AdminScreen";
import { useColors } from "../../../lib/ThemeContext";
import { fonts, radius } from "../../../lib/theme";
import { marketing as mktApi } from "../../../lib/api";
import { useFocusEffect } from "expo-router";

const STATUS_COLORS = {
  scheduled: { bg: "#EFF6FF", text: "#1D4ED8", label: "Scheduled" },
  published: { bg: "#F0FDF4", text: "#15803D", label: "Published" },
  failed: { bg: "#FEF2F2", text: "#DC2626", label: "Failed" },
};

const PLATFORM_ICONS = {
  telegram: "paper-plane",
  whatsapp: "logo-whatsapp",
  facebook: "logo-facebook",
  instagram: "logo-instagram",
};

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    toggleRow: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: 4,
    },
    toggleBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 8,
      borderRadius: radius.sm,
    },
    toggleBtnActive: {
      backgroundColor: colors.primary,
    },
    toggleTxt: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textSecondary,
    },
    toggleTxtActive: { color: "#fff" },
    section: { marginHorizontal: 16, marginTop: 16 },
    sectionLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 11,
      color: colors.textSecondary,
      letterSpacing: 1.2,
      marginBottom: 10,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    cardTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
      flex: 1,
      marginRight: 8,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 50,
    },
    statusTxt: { fontFamily: fonts.bodyMedium, fontSize: 11 },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 6,
    },
    metaTxt: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
    },
    platformsRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
    platformChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 50,
    },
    platformTxt: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textSecondary,
      textTransform: "capitalize",
    },
    actionsRow: {
      flexDirection: "row",
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
    },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: 7,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionBtnPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    actionBtnDanger: {
      borderColor: "#DC2626",
    },
    actionTxt: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.textSecondary,
    },
    actionTxtPrimary: { color: "#fff" },
    actionTxtDanger: { color: "#DC2626" },
    emptyBox: {
      alignItems: "center",
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: colors.textPrimary,
      marginTop: 14,
      marginBottom: 6,
    },
    emptyTxt: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    fab: {
      position: "absolute",
      bottom: 24,
      right: 20,
      backgroundColor: colors.primary,
      borderRadius: 28,
      width: 56,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
  });
}

function PostCard({ post, colors, s, onEdit, onPublish, onDelete }) {
  const status = STATUS_COLORS[post.status] || STATUS_COLORS.scheduled;
  const scheduledDate = post.scheduledAt
    ? new Date(post.scheduledAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.cardTitle} numberOfLines={2}>
          {post.title || post.caption || "Untitled Post"}
        </Text>
        <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[s.statusTxt, { color: status.text }]}>
            {status.label}
          </Text>
        </View>
      </View>

      <View style={s.metaRow}>
        <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
        <Text style={s.metaTxt}>{scheduledDate}</Text>
      </View>

      {Array.isArray(post.platforms) && post.platforms.length > 0 && (
        <View style={s.platformsRow}>
          {post.platforms.map((p) => (
            <View key={p} style={s.platformChip}>
              <Ionicons
                name={PLATFORM_ICONS[p] || "share-social"}
                size={12}
                color={colors.textSecondary}
              />
              <Text style={s.platformTxt}>{p}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={s.actionsRow}>
        <TouchableOpacity style={s.actionBtn} onPress={onEdit}>
          <Ionicons name="create-outline" size={14} color={colors.textSecondary} />
          <Text style={s.actionTxt}>Edit</Text>
        </TouchableOpacity>
        {post.status === "scheduled" && (
          <TouchableOpacity
            style={[s.actionBtn, s.actionBtnPrimary]}
            onPress={onPublish}
          >
            <Ionicons name="send-outline" size={14} color="#fff" />
            <Text style={[s.actionTxt, s.actionTxtPrimary]}>Publish Now</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.actionBtn, s.actionBtnDanger]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={14} color="#DC2626" />
          <Text style={[s.actionTxt, s.actionTxtDanger]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SchedulerScreen() {
  const router = useRouter();
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [viewMode, setViewMode] = useState("list"); // "list" | "calendar"
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await mktApi.getPosts({ status: "scheduled,published,failed" });
      const arr = Array.isArray(res) ? res : res?.posts || res?.data || [];
      setPosts(arr);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handlePublish = useCallback(
    async (post) => {
      Alert.alert("Publish Now", `Publish "${post.title || "this post"}" immediately?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Publish",
          onPress: async () => {
            try {
              await mktApi.publishPost(post._id);
              load(true);
            } catch (e) {
              Alert.alert("Error", e?.message || "Failed to publish");
            }
          },
        },
      ]);
    },
    [load]
  );

  const handleDelete = useCallback(
    async (post) => {
      Alert.alert("Delete Post", "This action cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await mktApi.deletePost(post._id);
              load(true);
            } catch (e) {
              Alert.alert("Error", e?.message || "Failed to delete");
            }
          },
        },
      ]);
    },
    [load]
  );

  const scheduled = posts.filter((p) => p.status === "scheduled");
  const past = posts.filter((p) => p.status === "published" || p.status === "failed");

  return (
    <AdminShell title="Scheduled Posts" subtitle="Manage your content queue">
      <View style={s.container}>
        {/* View toggle */}
        <View style={s.toggleRow}>
          <TouchableOpacity
            style={[s.toggleBtn, viewMode === "list" && s.toggleBtnActive]}
            onPress={() => setViewMode("list")}
          >
            <Ionicons
              name="list"
              size={15}
              color={viewMode === "list" ? "#fff" : colors.textSecondary}
            />
            <Text
              style={[s.toggleTxt, viewMode === "list" && s.toggleTxtActive]}
            >
              List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, viewMode === "calendar" && s.toggleBtnActive]}
            onPress={() => setViewMode("calendar")}
          >
            <Ionicons
              name="calendar"
              size={15}
              color={viewMode === "calendar" ? "#fff" : colors.textSecondary}
            />
            <Text
              style={[
                s.toggleTxt,
                viewMode === "calendar" && s.toggleTxtActive,
              ]}
            >
              Calendar
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            color={colors.primary}
            size="large"
            style={{ marginTop: 60 }}
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load(true);
                }}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          >
            {/* Upcoming */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>
                UPCOMING ({scheduled.length})
              </Text>
              {scheduled.length === 0 ? (
                <View style={s.emptyBox}>
                  <Ionicons
                    name="calendar-outline"
                    size={48}
                    color={colors.border}
                  />
                  <Text style={s.emptyTitle}>No Scheduled Posts</Text>
                  <Text style={s.emptyTxt}>
                    Tap the + button to schedule a new post via the AI Generator.
                  </Text>
                </View>
              ) : (
                scheduled.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    colors={colors}
                    s={s}
                    onEdit={() =>
                      router.push({
                        pathname: "/admin/marketing/ai-generator",
                        params: { postId: post._id },
                      })
                    }
                    onPublish={() => handlePublish(post)}
                    onDelete={() => handleDelete(post)}
                  />
                ))
              )}
            </View>

            {/* Past */}
            {past.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionLabel}>PAST POSTS ({past.length})</Text>
                {past.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    colors={colors}
                    s={s}
                    onEdit={() =>
                      router.push({
                        pathname: "/admin/marketing/ai-generator",
                        params: { postId: post._id },
                      })
                    }
                    onPublish={() => handlePublish(post)}
                    onDelete={() => handleDelete(post)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* FAB */}
        <TouchableOpacity
          style={s.fab}
          onPress={() => router.push("/admin/marketing/ai-generator")}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </AdminShell>
  );
}
