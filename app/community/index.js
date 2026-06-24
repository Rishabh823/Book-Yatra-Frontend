import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { fonts } from "../../lib/theme";
import { useColors } from "../../lib/ThemeContext";

const PRIMARY = "#D95D39";

const TYPES = [
  { k: "all", label: "All" },
  { k: "post", label: "Post" },
  { k: "memory", label: "Memory" },
  { k: "travel_tip", label: "Travel tip" },
  { k: "experience", label: "Experience" },
  { k: "review", label: "Review" },
];

const TYPE_COLORS = {
  post: { bg: "#EDE9FE", color: "#7C3AED" },
  memory: { bg: "#FEE8E2", color: "#D95D39" },
  travel_tip: { bg: "#DBEAFE", color: "#2563EB" },
  experience: { bg: "#DCFCE7", color: "#16A34A" },
  review: { bg: "#FEF3C7", color: "#D97706" },
};

const fmtTime = (d) => {
  if (!d) return "";
  const diff = Date.now() - new Date(d);
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  if (diff < 2592000000) return Math.floor(diff / 86400000) + "d ago";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

function Avatar({ name, size = 38 }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: PRIMARY,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bodyBold,
          fontSize: size * 0.42,
          color: "white",
        }}
      >
        {(name || "U")[0].toUpperCase()}
      </Text>
    </View>
  );
}

const PostCard = ({ post, onLike, onPress, s, colors }) => {
  const authorName =
    (typeof post.authorId === "object" ? post.authorId?.name : null) ||
    post.author?.name ||
    "Anonymous";
  const tc = TYPE_COLORS[post.type] || { bg: colors.elevated, color: colors.textSecondary };
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.92}>
      <View style={s.authorRow}>
        <Avatar name={authorName} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={s.authorName}>{authorName}</Text>
          <Text style={s.postTime}>{fmtTime(post.createdAt)}</Text>
        </View>
        <View style={[s.typeBadge, { backgroundColor: tc.bg }]}>
          <Text style={[s.typeText, { color: tc.color }]}>
            {post.type?.replace("_", " ")}
          </Text>
        </View>
      </View>

      {post.title && (
        <Text style={s.postTitle} numberOfLines={2}>
          {post.title}
        </Text>
      )}
      <Text style={s.postContent} numberOfLines={3}>
        {post.content}
      </Text>

      <View style={s.actionsRow}>
        <TouchableOpacity style={s.action} onPress={() => onLike(post._id)}>
          <Ionicons name="heart-outline" size={16} color="#EF4444" />
          <Text style={s.actionText}>{post.likeCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.action} onPress={onPress}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.textDisabled} />
          <Text style={s.actionText}>
            {post.commentCount || post.comments?.length || 0}
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {post.tags?.slice(0, 2).map((tag) => (
          <View key={tag} style={s.tag}>
            <Text style={s.tagText}>#{tag}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
};

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const [posts, setPosts] = useState([]);
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const s = useMemo(() => makeStyles(colors), [colors]);

  const fetchPosts = useCallback(
    async (reset = false, postType = type) => {
      if (reset) {
        setLoading(true);
        setPosts([]);
      }
      try {
        const p = reset ? 1 : page;
        const res = await api.get(
          "/community?page=" + p + "&type=" + postType + "&limit=10",
        );
        const newPosts = Array.isArray(res) ? res : res.data || [];
        setPosts((prev) => (reset ? newPosts : [...prev, ...newPosts]));
        setHasMore(newPosts.length === 10);
        if (!reset) setPage(p + 1);
        else setPage(2);
      } catch {}
      setLoading(false);
      setRefreshing(false);
    },
    [page, type],
  );

  useFocusEffect(
    useCallback(() => {
      fetchPosts(true, "all");
      setType("all");
    }, []),
  );

  const changeType = (t) => {
    setType(t);
    setPage(1);
    fetchPosts(true, t);
  };

  const handleLike = async (postId) => {
    try {
      await api.post("/community/" + postId + "/like", {});
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId ? { ...p, likeCount: (p.likeCount || 0) + 1 } : p,
        ),
      );
    } catch {}
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Clean header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Community</Text>
          <Text style={s.subtitle}>Share your journey</Text>
        </View>
        <TouchableOpacity
          style={s.createBtn}
          onPress={() => router.push("/community/create")}
        >
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={s.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filtersContent}
        >
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t.k}
              style={[s.filterChip, type === t.k && s.filterChipActive]}
              onPress={() => changeType(t.k)}
            >
              <Text style={[s.filterText, type === t.k && s.filterTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item._id)}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onLike={handleLike}
              onPress={() => router.push("/community/" + item._id)}
              s={s}
              colors={colors}
            />
          )}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: insets.bottom + 20,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPosts(true);
              }}
              tintColor={PRIMARY}
            />
          }
          onEndReached={() => hasMore && !loading && fetchPosts()}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconCircle}>
                <Ionicons name="people-outline" size={32} color={colors.textDisabled} />
              </View>
              <Text style={s.emptyTitle}>No posts yet</Text>
              <Text style={s.emptySub}>
                Be the first to share your journey!
              </Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => router.push("/community/create")}
              >
                <Ionicons name="add" size={16} color="white" />
                <Text style={s.emptyBtnText}>Create Post</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    // borderBottomWidth: StyleSheet.hairlineWidth,
    // borderBottomColor: colors.borderSubtle,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textDisabled,
    marginTop: 2,
  },
  createBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },

  filtersWrapper: {
    backgroundColor: colors.surface,
    // borderBottomWidth: StyleSheet.hairlineWidth,
    // borderBottomColor: colors.borderSubtle,
  },
  filtersContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 50,
    backgroundColor: colors.elevated,
  },
  filterChipActive: { backgroundColor: PRIMARY },
  filterText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  filterTextActive: { color: "white", fontFamily: fonts.bodyBold },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorName: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  postTime: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textDisabled,
    marginTop: 1,
  },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50 },
  typeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    textTransform: "capitalize",
  },
  postTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  postContent: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.elevated,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontFamily: fonts.body, fontSize: 13, color: colors.textDisabled },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 50,
    backgroundColor: "#FEE8E2",
  },
  tagText: { fontFamily: fonts.body, fontSize: 11, color: PRIMARY },

  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textDisabled,
    textAlign: "center",
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  emptyBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "white" },
});
