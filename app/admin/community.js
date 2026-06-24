import { useState, useCallback, useMemo } from "react";
import React from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { fonts, radius } from "../../lib/theme";
import { useColors } from "../../lib/ThemeContext";
import { communityApi } from "../../lib/api";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

function RejectSheet({ post, onClose, onReject }) {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const handleReject = async () => {
    setLoading(true);
    await onReject(post._id, reason.trim() || "Does not meet community guidelines");
    setLoading(false);
    onClose();
  };
  return (
    <View style={s.overlay}>
      <TouchableOpacity style={s.overlayBg} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHandle} />
        <Text style={s.sheetTitle}>Reject Post</Text>
        <Text style={s.sheetPostTitle} numberOfLines={2}>"{post.content?.slice(0, 80)}"</Text>
        <View style={s.fieldWrap}>
          <Text style={s.fieldLabel}>Rejection Reason (shown to author)</Text>
          <TextInput
            style={[s.fieldInput, { height: 80, textAlignVertical: "top" }]}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Inappropriate content, spam, off-topic..."
            placeholderTextColor={colors.textDisabled}
            multiline
          />
        </View>
        <View style={s.sheetBtns}>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelBtnTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.rejectConfirmBtn, loading && { opacity: 0.6 }]}
            onPress={handleReject}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.rejectConfirmTxt}>Reject Post</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function AdminCommunityScreen() {
  const router = useRouter();
  const colors = useColors();
  const { toast, showToast, hideToast } = useToast();

  const s = useMemo(() => makeStyles(colors), [colors]);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [actioning, setActioning] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  const load = useCallback(async (p = 1, reset = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await communityApi.pendingPosts(p);
      const data = res?.data || [];
      const total = res?.total || 0;
      if (reset || p === 1) setPosts(data); else setPosts((prev) => [...prev, ...data]);
      setHasMore(p * 20 < total);
      setPage(p);
    } catch (e) {
      showToast(e.message || "Failed to load", "error");
    }
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, []);

  useFocusEffect(useCallback(() => { load(1, true); }, []));

  const handleApprove = async (id) => {
    setActioning(id);
    try {
      await communityApi.approve(id);
      setPosts((prev) => prev.filter((p) => p._id !== id));
      showToast("Post approved and published", "success");
    } catch (e) {
      showToast(e.message || "Failed to approve", "error");
    }
    setActioning(null);
  };

  const handleReject = async (id, reason) => {
    setActioning(id);
    try {
      await communityApi.reject(id, reason);
      setPosts((prev) => prev.filter((p) => p._id !== id));
      showToast("Post rejected", "info");
    } catch (e) {
      showToast(e.message || "Failed to reject", "error");
    }
    setActioning(null);
  };

  const renderItem = ({ item }) => {
    const isActioning = actioning === item._id;
    return (
      <View style={s.card}>
        {/* Author row */}
        <View style={s.authorRow}>
          {item.authorId?.photoUrl
            ? <Image source={{ uri: item.authorId.photoUrl }} style={s.avatar} />
            : <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarTxt}>{(item.authorId?.name || "U").charAt(0).toUpperCase()}</Text>
              </View>
          }
          <View style={{ flex: 1 }}>
            <Text style={s.authorName}>{item.authorId?.name || "Unknown"}</Text>
            <Text style={s.postDate}>{fmtDate(item.createdAt)}</Text>
          </View>
          <View style={[s.typeBadge, { backgroundColor: item.type === "question" ? "#EFF6FF" : item.type === "alert" ? "#FEF2F2" : "#F0FDF4" }]}>
            <Text style={[s.typeTxt, { color: item.type === "question" ? "#2563EB" : item.type === "alert" ? "#DC2626" : "#16A34A" }]}>
              {item.type || "post"}
            </Text>
          </View>
        </View>

        {/* Content */}
        <Text style={s.postContent} numberOfLines={4}>{item.content}</Text>

        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={s.postImg} resizeMode="cover" />
        )}

        {/* Tags */}
        {item.tags?.length > 0 && (
          <View style={s.tagsRow}>
            {item.tags.slice(0, 4).map((tag) => (
              <View key={tag} style={s.tag}>
                <Text style={s.tagTxt}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action buttons */}
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.rejectBtn, isActioning && { opacity: 0.5 }]}
            onPress={() => setRejectTarget(item)}
            disabled={isActioning}
          >
            <Ionicons name="close-circle" size={16} color="#DC2626" />
            <Text style={s.rejectBtnTxt}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.approveBtn, isActioning && { opacity: 0.5 }]}
            onPress={() => handleApprove(item._id)}
            disabled={isActioning}
          >
            {isActioning
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={s.approveBtnTxt}>Approve</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.secondary} />
        </TouchableOpacity>
        <View>
          <Text style={s.title}>Community Moderation</Text>
          {posts.length > 0 && !loading && (
            <Text style={s.subtitle}>{posts.length} pending review</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1, true); }} tintColor={colors.primary} />}
          onEndReached={() => { if (!loadingMore && hasMore) load(page + 1); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} /> : null}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={56} color={colors.textDisabled} />
              <Text style={s.emptyTitle}>All Clear!</Text>
              <Text style={s.emptyTxt}>No posts waiting for review.</Text>
            </View>
          }
        />
      )}

      {rejectTarget && (
        <RejectSheet
          post={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onReject={handleReject}
        />
      )}

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle },
  title: { fontFamily: fonts.heading, fontSize: 18, color: colors.secondary },
  subtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.primary, marginTop: 1 },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.borderSubtle },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: { backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primary },
  authorName: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  postDate: { fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled, marginTop: 1 },
  typeBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  typeTxt: { fontFamily: fonts.bodyBold, fontSize: 10, textTransform: "capitalize" },
  postContent: { fontFamily: fonts.body, fontSize: 13, color: colors.textPrimary, lineHeight: 20 },
  postImg: { width: "100%", height: 160, borderRadius: 16 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  tagTxt: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary },
  actions: { flexDirection: "row", gap: 10, paddingTop: 4 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 999, padding: 11, backgroundColor: "#FEF2F2", borderWidth: 1.5, borderColor: "#DC2626" },
  rejectBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#DC2626" },
  approveBtn: { flex: 1.4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 999, padding: 11, backgroundColor: "#16A34A" },
  approveBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
  empty: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.secondary },
  emptyTxt: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  // Reject sheet
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, justifyContent: "flex-end" },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderSubtle, alignSelf: "center", marginBottom: 4 },
  sheetTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.secondary },
  sheetPostTitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, fontStyle: "italic" },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  fieldInput: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, fontFamily: fonts.body, fontSize: 13, color: colors.textPrimary, borderWidth: 1, borderColor: colors.borderSubtle },
  sheetBtns: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 999, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle },
  cancelBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  rejectConfirmBtn: { flex: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 999, padding: 12, backgroundColor: "#DC2626" },
  rejectConfirmTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
});
