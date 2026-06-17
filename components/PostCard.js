import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const TYPE_COLORS = {
  post: { bg: "#EDE9FE", color: "#7C3AED" },
  memory: { bg: "#FEE8E2", color: "#D95D39" },
  travel_tip: { bg: "#DBEAFE", color: "#2563EB" },
  experience: { bg: "#DCFCE7", color: "#16A34A" },
  review: { bg: "#FEF3C7", color: "#D97706" },
};

const fmtDate = (d) => {
  if (!d) return "";
  const diff = Date.now() - new Date(d);
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  if (diff < 604800000) return Math.floor(diff / 86400000) + "d ago";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

export default function PostCard({ post, onLike, cardShadow }) {
  const router = useRouter();
  const typeStyle = TYPE_COLORS[post.type] || {
    bg: "#F3F4F6",
    color: "#6B7280",
  };

  return (
    <TouchableOpacity
      style={[styles.card, cardShadow]}
      onPress={() => router.push("/community/" + post._id)}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(post.author?.name || "A")[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>
            {post.author?.name || "Anonymous"}
          </Text>
          <Text style={styles.date}>{fmtDate(post.createdAt)}</Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg }]}>
          <Text style={[styles.typeText, { color: typeStyle.color }]}>
            {(post.type || "").replace("_", " ")}
          </Text>
        </View>
      </View>
      {post.title ? (
        <Text style={styles.title} numberOfLines={2}>
          {post.title}
        </Text>
      ) : null}
      <Text style={styles.content} numberOfLines={3}>
        {post.content}
      </Text>
      {post.tags?.length > 0 && (
        <View style={styles.tagsRow}>
          {post.tags.slice(0, 3).map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>#{t}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.action}
          onPress={() => onLike?.(post._id)}
        >
          <Ionicons
            name={post.isLiked ? "heart" : "heart-outline"}
            size={16}
            color={post.isLiked ? "#EF4444" : "#6B7280"}
          />
          <Text
            style={[styles.actionCount, post.isLiked && { color: "#EF4444" }]}
          >
            {post.likes || 0}
          </Text>
        </TouchableOpacity>
        <View style={styles.action}>
          <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
          <Text style={styles.actionCount}>{post.comments?.length || 0}</Text>
        </View>
        <View style={styles.action}>
          <Ionicons name="eye-outline" size={16} color="#6B7280" />
          <Text style={styles.actionCount}>{post.views || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D95D39",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Manrope_700Bold", fontSize: 14, color: "white" },
  authorName: { fontFamily: "Manrope_700Bold", fontSize: 13, color: "#1A1A1A" },
  date: { fontFamily: "Manrope_400Regular", fontSize: 11, color: "#6B7280" },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  typeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    textTransform: "capitalize",
  },
  title: { fontFamily: "Philosopher_700Bold", fontSize: 16, color: "#1A1A1A" },
  content: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  tag: {
    backgroundColor: "#FEE8E2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tagText: { fontFamily: "Manrope_500Medium", fontSize: 11, color: "#D95D39" },
  footer: {
    flexDirection: "row",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 8,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionCount: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    color: "#6B7280",
  },
});
