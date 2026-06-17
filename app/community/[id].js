import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../../lib/api";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";

const TYPE_COLORS = {
  post:        { bg: "#EDE9FE", color: "#7C3AED" },
  memory:      { bg: "#FEE8E2", color: "#D95D39" },
  travel_tip:  { bg: "#DBEAFE", color: "#2563EB" },
  experience:  { bg: "#DCFCE7", color: "#16A34A" },
  review:      { bg: "#FEF3C7", color: "#D97706" },
};

const fmtDate = (d) => {
  if (!d) return "";
  const diff = Date.now() - new Date(d);
  if (diff < 60000)      return "Just now";
  if (diff < 3600000)    return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000)   return Math.floor(diff / 3600000) + "h ago";
  if (diff < 604800000)  return Math.floor(diff / 86400000) + "d ago";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

function Avatar({ name, size = 38, bg = colors.primary }) {
  const letter = (name || "A")[0].toUpperCase();
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[s.avatarTxt, { fontSize: size * 0.42 }]}>{letter}</Text>
    </View>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const inputRef = useRef(null);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [commentLikes, setCommentLikes] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/community/" + id);
      const p = res.data || res;
      setPost(p);
      // backend now returns isLiked; fall back to likes array check
      setLiked(p.isLiked === true);
      setLikes(p.likeCount || (p.likes?.length ?? 0));
      // init comment likes map
      const initLikes = {};
      (p.comments || []).forEach(c => {
        initLikes[c._id] = { count: c.likes?.length || 0, liked: false };
      });
      setCommentLikes(initLikes);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleLike = async () => {
    setLiked(!liked);
    setLikes((l) => (liked ? l - 1 : l + 1));
    try {
      await api.post("/community/" + id + "/like", {});
    } catch {
      setLiked(liked);
      setLikes(likes);
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      // backend expects { text } field
      const res = await api.post("/community/" + id + "/comment", { text: comment.trim() });
      // backend returns { success, data: allComments[] }
      const updatedComments = res.data || res;
      setPost((p) => ({ ...p, comments: Array.isArray(updatedComments) ? updatedComments : p.comments }));
      setComment("");
    } catch {
      showToast("Failed to post comment", "error");
    }
    setSubmitting(false);
  };

  const handleCommentLike = async (commentId) => {
    const prev = commentLikes[commentId] || { count: 0, liked: false };
    setCommentLikes(m => ({
      ...m,
      [commentId]: { count: prev.liked ? prev.count - 1 : prev.count + 1, liked: !prev.liked },
    }));
    try {
      await api.post("/community/" + id + "/comment/" + commentId + "/like", {});
    } catch {
      setCommentLikes(m => ({ ...m, [commentId]: prev }));
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirmed = async () => {
    setShowDeleteConfirm(false);
    try { await api.del("/community/" + id); router.back(); }
    catch { showToast("Failed to delete", "error"); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!post) return null;

  // author can be in authorId (populated object) or author field
  const author = (typeof post.authorId === "object" ? post.authorId : null) || post.author;
  const authorName = author?.name || "Anonymous";
  const typeStyle = TYPE_COLORS[post.type] || { bg: "#F3F4F6", color: "#6B7280" };

  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <LinearGradient colors={["#1E0A0A", "#5C1615"]} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{post.title || "Post"}</Text>
        {post.isOwner && (
          <TouchableOpacity onPress={handleDelete} style={s.iconBtn}>
            <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
      >
        {/* Post card */}
        <View style={s.postCard}>
          {/* Author row */}
          <View style={s.authorRow}>
            <Avatar name={authorName} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={s.authorName}>{authorName}</Text>
              <Text style={s.postDate}>{fmtDate(post.createdAt)}</Text>
            </View>
            <View style={[s.typeBadge, { backgroundColor: typeStyle.bg }]}>
              <Text style={[s.typeText, { color: typeStyle.color }]}>{post.type?.replace("_", " ")}</Text>
            </View>
          </View>

          {/* Content */}
          {post.title && <Text style={s.postTitle}>{post.title}</Text>}
          <Text style={s.postContent}>{post.content}</Text>

          {/* Tags */}
          {post.tags?.length > 0 && (
            <View style={s.tagsRow}>
              {post.tags.map((t) => (
                <View key={t} style={s.tag}><Text style={s.tagText}>#{t}</Text></View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={s.actionsRow}>
            <TouchableOpacity style={s.action} onPress={handleLike}>
              <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? "#EF4444" : colors.textSecondary} />
              <Text style={[s.actionCount, liked && { color: "#EF4444" }]}>{likes}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.action} onPress={() => inputRef.current?.focus()}>
              <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
              <Text style={s.actionCount}>{post.comments?.length || 0}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <View style={s.viewsBadge}>
              <Ionicons name="eye-outline" size={13} color={colors.textDisabled} />
              <Text style={s.viewsText}>{post.views || 0} views</Text>
            </View>
          </View>
        </View>

        {/* Comments section */}
        <View style={s.commentsSection}>
          <Text style={s.commentsTitle}>Comments ({post.comments?.length || 0})</Text>

          {(post.comments || []).length === 0 && (
            <View style={s.noComments}>
              <Ionicons name="chatbubbles-outline" size={32} color={colors.textDisabled} />
              <Text style={s.noCommentsText}>No comments yet. Be the first!</Text>
            </View>
          )}

          {(post.comments || []).map((c, i) => {
            // backend stores: { userId: populated { name, photo }, text, createdAt }
            const commenter = (typeof c.userId === "object" ? c.userId : null) || c.author;
            const commenterName = commenter?.name || "Anonymous";
            const commentText = c.text || c.content || "";
            return (
              <View key={c._id || i} style={s.commentCard}>
                <Avatar name={commenterName} size={34} bg={colors.primaryLight || "#FEE8E2"} />
                <View style={{ flex: 1 }}>
                  <View style={s.commentHeader}>
                    <Text style={s.commentAuthor}>{commenterName}</Text>
                    <Text style={s.commentDate}>{fmtDate(c.createdAt)}</Text>
                  </View>
                  {commentText ? (
                    <Text style={s.commentContent}>{commentText}</Text>
                  ) : null}
                  {c._id && (
                    <TouchableOpacity style={s.commentLikeBtn} onPress={() => handleCommentLike(c._id)}>
                      <Ionicons
                        name={commentLikes[c._id]?.liked ? "heart" : "heart-outline"}
                        size={13}
                        color={commentLikes[c._id]?.liked ? "#EF4444" : colors.textDisabled}
                      />
                      {(commentLikes[c._id]?.count || 0) > 0 && (
                        <Text style={s.commentLikeCount}>{commentLikes[c._id].count}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Comment input */}
      <View style={[s.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <Avatar name="U" size={34} />
        <TextInput
          ref={inputRef}
          style={s.commentInput}
          value={comment}
          onChangeText={setComment}
          placeholder="Write a comment..."
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[s.sendBtn, !comment.trim() && s.sendBtnDisabled]}
          onPress={handleComment}
          disabled={!comment.trim() || submitting}
        >
          {submitting ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="send" size={16} color="white" />}
        </TouchableOpacity>
      </View>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Post"
        message="Are you sure you want to delete this post?"
        confirmText="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setShowDeleteConfirm(false)}
        onDismiss={() => setShowDeleteConfirm(false)}
        destructive={true}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontFamily: "Philosopher_700Bold", fontSize: 18, color: "white" },

  postCard: { backgroundColor: colors.surface, margin: 16, borderRadius: radius.xl, padding: 16, gap: 12, ...shadow?.card },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontFamily: fonts.bodyBold, color: "white" },
  authorName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  postDate: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  typeText: { fontFamily: fonts.bodyBold, fontSize: 11, textTransform: "capitalize" },
  postTitle: { fontFamily: "Philosopher_700Bold", fontSize: 20, color: colors.textPrimary },
  postContent: { fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary, lineHeight: 22 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { backgroundColor: "#FEE8E2", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  tagText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  action: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionCount: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  viewsBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  viewsText: { fontFamily: fonts.body, fontSize: 12, color: colors.textDisabled },

  commentsSection: { paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  commentsTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary, marginBottom: 4 },
  noComments: { alignItems: "center", paddingVertical: 24, gap: 8 },
  noCommentsText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  commentCard: { flexDirection: "row", gap: 10, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, alignItems: "flex-start" },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  commentAuthor: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  commentDate: { fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled },
  commentLikeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  commentLikeCount: { fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled },
  commentContent: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },

  inputBar: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: "#F3F4F6", alignItems: "flex-end" },
  commentInput: { flex: 1, backgroundColor: "#F9FAFB", borderRadius: 20, paddingHorizontal: 14, paddingVertical: Platform.OS === "web" ? 10 : 8, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, maxHeight: 100, borderWidth: 1, borderColor: "#E5E7EB" },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: "#D1D5DB" },
});
