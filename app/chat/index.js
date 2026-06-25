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
  Image,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Platform,
  PanResponder,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../lib/api";
import { fonts } from "../../lib/theme";
import { useColors } from "../../lib/ThemeContext";
import { useSocket } from "../../lib/hooks/useSocket";
import { eventBus } from "../../lib/eventBus";

const SWIPE_THRESHOLD = -70; // px to reveal delete button on native

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

// ── Swipeable chat row (native only) ─────────────────────────────────────────
function SwipeableChatRow({ children, onDelete, onLongPress, onPress }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 5 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        const x = Math.max(SWIPE_THRESHOLD * 1.2, Math.min(0, g.dx + (isOpen.current ? SWIPE_THRESHOLD : 0)));
        translateX.setValue(x);
      },
      onPanResponderRelease: (_, g) => {
        const finalX = g.dx + (isOpen.current ? SWIPE_THRESHOLD : 0);
        if (finalX < SWIPE_THRESHOLD / 2) {
          Animated.spring(translateX, { toValue: SWIPE_THRESHOLD, useNativeDriver: true }).start();
          isOpen.current = true;
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          isOpen.current = false;
        }
      },
    }),
  ).current;

  const close = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    isOpen.current = false;
  };

  return (
    <View style={{ overflow: "hidden" }}>
      {/* Red delete button underneath */}
      <View style={sw.deleteUnder}>
        <TouchableOpacity
          style={sw.deleteBtn}
          onPress={() => { close(); onDelete(); }}
          activeOpacity={0.8}
        >
          <Ionicons name="trash" size={20} color="#fff" />
          <Text style={sw.deleteTxt}>Delete</Text>
        </TouchableOpacity>
      </View>
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => { if (isOpen.current) { close(); } else { onPress(); } }}
          onLongPress={onLongPress}
          delayLongPress={500}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const sw = StyleSheet.create({
  deleteUnder: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: Math.abs(SWIPE_THRESHOLD),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    borderRadius: 12,
  },
  deleteBtn: { alignItems: "center", justifyContent: "center", gap: 3, padding: 8 },
  deleteTxt: { fontFamily: fonts.bodyBold, fontSize: 10, color: "#fff" },
});

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
  const [deleteTarget, setDeleteTarget] = useState(null); // { _id, name }

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
            if (!isFromMe) eventBus.emit("chat_new_message");
          });

          const offRead = on("messages_read", ({ chatId, readBy }) => {
            if (String(readBy) === String(myUserId)) {
              setChats((prev) =>
                prev.map((c) =>
                  String(c._id) === String(chatId)
                    ? { ...c, unreadCounts: { ...(c.unreadCounts || {}), [myUserId]: 0 } }
                    : c,
                ),
              );
              eventBus.emit("chat_messages_read");
            }
          });

          socketCleanupRef.current = () => { offNew(); offRead(); };
        })
        .catch(() => {});

      return () => {
        socketCleanupRef.current();
        disconnect();
      };
    }, [load, myUserId]),
  );

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

  const getChatPhoto = useCallback(
    (chat) => {
      if (chat.type === "direct") {
        const other = (chat.participants || []).find(
          (p) => String(p._id) !== String(myUserId),
        );
        return other?.photoUrl || other?.photo || null;
      }
      return null;
    },
    [myUserId],
  );

  // ── Delete chat ─────────────────────────────────────────────────────────────
  const confirmDelete = useCallback((chat, name) => {
    setDeleteTarget({ _id: String(chat._id), name });
  }, []);

  const doDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const { _id } = deleteTarget;
    setDeleteTarget(null);
    setChats((prev) => prev.filter((c) => String(c._id) !== _id));
    try {
      await api.del("/chat/" + _id);
    } catch {
      load(); // rollback on error
    }
  }, [deleteTarget, load]);

  // ── Render item ─────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }) => {
      const name = getChatName(item);
      const photo = getChatPhoto(item);
      const unread = myUserId ? item.unreadCounts?.[myUserId] || 0 : 0;

      const cardContent = (
        <View style={styles.chatRow}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(name)}</Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatName} numberOfLines={1}>{name}</Text>
              <Text style={styles.chatTime}>{fmtTime(item.lastMessage?.timestamp)}</Text>
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
                  <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      );

      // Web: long-press to show context menu
      if (Platform.OS === "web") {
        return (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push("/chat/" + item._id)}
            onLongPress={() => confirmDelete(item, name)}
            delayLongPress={500}
          >
            {cardContent}
          </TouchableOpacity>
        );
      }

      // Native: swipe left to reveal delete, long-press also works
      return (
        <SwipeableChatRow
          onPress={() => router.push("/chat/" + item._id)}
          onLongPress={() => confirmDelete(item, name)}
          onDelete={() => confirmDelete(item, name)}
        >
          {cardContent}
        </SwipeableChatRow>
      );
    },
    [styles, getChatName, getChatPhoto, myUserId, router, confirmDelete],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity
          style={styles.composeBtn}
          onPress={() => router.push("/chat/new")}
        >
          <Ionicons name="create-outline" size={22} color={themeColors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={themeColors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          value={search}
          onChangeText={setSearch}
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
          extraData={myUserId}
          contentContainerStyle={{
            padding: 16,
            gap: 8,
            paddingBottom: insets.bottom + 20,
          }}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(true); }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={themeColors.textDisabled} />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>Start a conversation with someone!</Text>
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

      {/* ── Delete confirmation modal ─────────────────────────────────────── */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setDeleteTarget(null)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.deleteSheet, { backgroundColor: themeColors.surface }]}>
                <View style={styles.deleteIconWrap}>
                  <Ionicons name="chatbubble-remove-outline" size={32} color="#DC2626" />
                </View>
                <Text style={[styles.deleteTitle, { color: themeColors.textPrimary }]}>
                  Delete conversation?
                </Text>
                <Text style={[styles.deleteSub, { color: themeColors.textSecondary }]}>
                  This will remove "{deleteTarget?.name}" from your chat list. The other person won't be notified.
                </Text>
                <TouchableOpacity style={styles.deleteConfirmBtn} onPress={doDelete} activeOpacity={0.85}>
                  <Ionicons name="trash-outline" size={17} color="#fff" />
                  <Text style={styles.deleteConfirmTxt}>Delete Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderTopColor: themeColors.borderSubtle }]}
                  onPress={() => setDeleteTarget(null)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelTxt, { color: themeColors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.elevated,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
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
    avatarImg: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: "#D95D39",
    },
    avatarText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#1E3A5F" },
    chatHeader: { flexDirection: "row", alignItems: "center" },
    chatName: {
      flex: 1,
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    chatTime: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
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
    emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
    emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
    newChatBtn: {
      backgroundColor: "#D95D39",
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
      marginTop: 8,
    },
    newChatText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "white" },

    // Delete modal
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    deleteSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 36,
      alignItems: "center",
    },
    deleteIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "#FEF2F2",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    deleteTitle: { fontFamily: fonts.bodyBold, fontSize: 18, marginBottom: 8, textAlign: "center" },
    deleteSub: {
      fontFamily: fonts.body,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 24,
    },
    deleteConfirmBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      width: "100%",
      backgroundColor: "#DC2626",
      borderRadius: 14,
      paddingVertical: 14,
      justifyContent: "center",
      marginBottom: 8,
    },
    deleteConfirmTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" },
    cancelBtn: {
      width: "100%",
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      alignItems: "center",
      marginTop: 4,
    },
    cancelTxt: { fontFamily: fonts.bodyBold, fontSize: 15 },
  });
