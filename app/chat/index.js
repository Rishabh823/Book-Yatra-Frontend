import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../lib/api";
import { fonts } from "../../lib/theme";
import { useColors } from "../../lib/ThemeContext";
import { useSocket } from "../../lib/hooks/useSocket";
import { DeviceEventEmitter } from "react-native";

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
  const themeColors = useColors();
  const styles = useMemo(() => makeStyles(themeColors), [themeColors]);
  const [chats, setChats] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myUserId, setMyUserId] = useState(null);

  const { connect, disconnect, on } = useSocket("/chat");
  const socketCleanupRef = useRef(() => {});

  useEffect(() => {
    AsyncStorage.getItem("userId").then((id) => setMyUserId(id));
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await api.get("/chat");
      const data = res.data || [];
      setChats(data);
      setFiltered(data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();

      // Socket: update unread counts + last message in real-time
      connect()
        .then((socket) => {
          const offNew = on("new_message", (msg) => {
            const isFromMe =
              String(msg.senderId?._id || msg.senderId) === String(myUserId);
            setChats((prev) => {
              const idx = prev.findIndex(
                (c) => String(c._id) === String(msg.chatId),
              );
              if (idx === -1) return prev;
              const updated = [...prev];
              const chat = { ...updated[idx] };
              if (!isFromMe) {
                const current = chat.unreadCounts?.[myUserId] || 0;
                chat.unreadCounts = {
                  ...(chat.unreadCounts || {}),
                  [myUserId]: current + 1,
                };
              }
              chat.lastMessage = {
                text: msg.text || msg.type,
                senderId: msg.senderId?._id || msg.senderId,
                timestamp: msg.createdAt,
                type: msg.type,
              };
              updated[idx] = chat;
              updated.splice(idx, 1);
              updated.unshift(chat);
              return updated;
            });
            // Let profile tab badge know
            if (!isFromMe) DeviceEventEmitter.emit("chat_new_message");
          });

          const offRead = on("messages_read", ({ chatId, readBy }) => {
            if (String(readBy) === String(myUserId)) {
              setChats((prev) =>
                prev.map((c) =>
                  String(c._id) === String(chatId)
                    ? {
                        ...c,
                        unreadCounts: {
                          ...(c.unreadCounts || {}),
                          [myUserId]: 0,
                        },
                      }
                    : c,
                ),
              );
              DeviceEventEmitter.emit("chat_messages_read");
            }
          });

          socketCleanupRef.current = () => {
            offNew();
            offRead();
          };
        })
        .catch(() => {});

      return () => {
        socketCleanupRef.current();
        disconnect();
      };
    }, [load, myUserId]),
  );

  // Keep filtered in sync when chats change
  useEffect(() => {
    if (!search) {
      setFiltered(chats);
    } else {
      setFiltered(
        chats.filter(
          (c) =>
            (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
            c.participants?.some((p) =>
              (p.name || "").toLowerCase().includes(search.toLowerCase()),
            ),
        ),
      );
    }
  }, [chats, search]);

  const handleSearch = useCallback((text) => {
    setSearch(text);
  }, []);

  const getChatName = useCallback(
    (chat) => {
      if (chat.name) return chat.name;
      const others = (chat.participants || []).filter(
        (p) => String(p._id) !== String(myUserId),
      );
      return others.map((p) => p.name).join(", ") || "Chat";
    },
    [myUserId],
  );

  const renderItem = useCallback(
    ({ item }) => {
      const name = getChatName(item);
      const unread = myUserId ? item.unreadCounts?.[myUserId] || 0 : 0;
      return (
        <TouchableOpacity
          style={styles.chatRow}
          onPress={() => router.push("/chat/" + item._id)}
          activeOpacity={0.75}
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
                  <Text style={styles.badgeText}>
                    {unread > 99 ? "99+" : unread}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [styles, getChatName, myUserId, router],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity
          style={styles.composeBtn}
          onPress={() => router.push("/chat/new")}
        >
          <Ionicons
            name="create-outline"
            size={22}
            color={themeColors.textPrimary}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={themeColors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          value={search}
          onChangeText={handleSearch}
          placeholderTextColor={themeColors.textSecondary}
        />
      </View>
      {loading ? (
        <ActivityIndicator color="#D95D39" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          // extraData ensures items re-render when myUserId loads from AsyncStorage
          extraData={myUserId}
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
                color={themeColors.textDisabled}
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

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderSubtle,
    },
    title: {
      flex: 1,
      fontFamily: "Philosopher_700Bold",
      fontSize: 20,
      color: colors.textPrimary,
    },
    composeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.elevated,
      alignItems: "center",
      justifyContent: "center",
    },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.elevated,
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
      color: colors.textPrimary,
    },
    chatRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
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
      color: colors.textPrimary,
    },
    chatTime: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textSecondary,
    },
    chatFooter: { flexDirection: "row", alignItems: "center" },
    lastMessage: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
    },
    unreadMsg: { fontFamily: fonts.bodyBold, color: colors.textPrimary },
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "#D95D39",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 5,
    },
    badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: "white" },
    empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
    emptyTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 18,
      color: colors.textPrimary,
    },
    emptySub: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textSecondary,
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
