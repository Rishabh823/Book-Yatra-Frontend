import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { fonts } from "../../lib/theme";

const fmtTime = (d) => {
  if (!d) return "";
  const diff = Date.now() - new Date(d);
  if (diff < 60000) return "now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

const getInitials = (name) =>
  (name || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [chats, setChats] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await api.get("/chat");
      setChats(res.data || []);
      setFiltered(res.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleSearch = useCallback(
    (text) => {
      setSearch(text);
      if (!text) {
        setFiltered(chats);
        return;
      }
      setFiltered(
        chats.filter(
          (c) =>
            (c.name || "").toLowerCase().includes(text.toLowerCase()) ||
            c.participants?.some((p) =>
              (p.name || "").toLowerCase().includes(text.toLowerCase()),
            ),
        ),
      );
    },
    [chats],
  );

  const getChatName = (chat) => {
    if (chat.name) return chat.name;
    const others = chat.participants?.filter((p) => p._id !== chat.myId) || [];
    return others.map((p) => p.name).join(", ") || "Chat";
  };

  const renderItem = ({ item }) => {
    const name = getChatName(item);
    const unread = item.unreadCounts?.get
      ? item.unreadCounts.get("me") || 0
      : 0;
    return (
      <TouchableOpacity
        style={styles.chatRow}
        onPress={() => router.push("/chat/" + item._id)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.chatTime}>
              {fmtTime(item.lastMessage?.timestamp)}
            </Text>
          </View>
          <View style={styles.chatFooter}>
            <Text
              style={[styles.lastMessage, unread > 0 && styles.unreadMsg]}
              numberOfLines={1}
            >
              {item.lastMessage?.text || "No messages yet"}
            </Text>
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity
          style={styles.composeBtn}
          onPress={() => router.push("/chat/new")}
        >
          <Ionicons name="create-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          value={search}
          onChangeText={handleSearch}
          placeholderTextColor="#6B7280"
        />
      </View>
      {loading ? (
        <ActivityIndicator color="#D95D39" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: 16,
            gap: 8,
            paddingBottom: insets.bottom + 20,
          }}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load(true);
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={48}
                color="#9CA3AF"
              />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>
                Start a conversation with someone!
              </Text>
              <TouchableOpacity
                style={styles.newChatBtn}
                onPress={() => router.push("/chat/new")}
              >
                <Text style={styles.newChatText}>New Message</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    flex: 1,
    fontFamily: "Philosopher_700Bold",
    fontSize: 20,
    color: "#111827",
  },
  composeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4F4F4",
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F2F0ED",
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
    margin: 12,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: "#111827",
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#D6E4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#1E3A5F" },
  chatHeader: { flexDirection: "row", alignItems: "center" },
  chatName: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: "#111827",
  },
  chatTime: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: "#6B7280",
  },
  chatFooter: { flexDirection: "row", alignItems: "center" },
  lastMessage: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#6B7280",
  },
  unreadMsg: { fontFamily: fonts.bodyBold, color: "#111827" },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#D95D39",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 10, color: "white" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: "#111827",
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "#6B7280",
  },
  newChatBtn: {
    backgroundColor: "#D95D39",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  newChatText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "white" },
});
