import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../lib/api";
import ChatBubble from "../../components/ChatBubble";
import { fonts } from "../../lib/theme";
import { useColors } from "../../lib/ThemeContext";
import { useSocket } from "../../lib/hooks/useSocket";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const { id: chatId } = useLocalSearchParams();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [myUserId, setMyUserId] = useState(null);

  const flatRef = useRef(null);
  const intervalRef = useRef(null);
  // Track tempIds currently in-flight to prevent duplicate sends
  const inFlightRef = useRef(new Set());
  const { connect, disconnect, on } = useSocket("/chat");

  useEffect(() => {
    AsyncStorage.getItem("userId").then((id) => setMyUserId(id));
  }, []);

  const loadMessages = useCallback(
    async (p = 1, append = false) => {
      try {
        const res = await api.get("/chat/" + chatId + "/messages?page=" + p);
        const msgs = res.data || [];
        if (append) {
          setMessages((prev) => [...msgs, ...prev]);
        } else {
          // Preserve any locally-inserted optimistic messages that haven't been confirmed yet
          setMessages((prev) => {
            const optimistic = prev.filter((m) => m._local);
            const serverIds = new Set(msgs.map((m) => String(m._id)));
            // Drop optimistic messages that the server already confirmed
            const stillPending = optimistic.filter(
              (m) => !serverIds.has(String(m._id)),
            );
            return [...msgs, ...stillPending];
          });
          setTimeout(
            () => flatRef.current?.scrollToEnd({ animated: false }),
            100,
          );
        }
        setHasMore(msgs.length === 30);
      } catch {}
      setLoading(false);
    },
    [chatId],
  );

  const markRead = useCallback(() => {
    api.put("/chat/" + chatId + "/read").catch(() => {});
  }, [chatId]);

  useEffect(() => {
    loadMessages();
    markRead();

    intervalRef.current = setInterval(() => loadMessages(1, false), 10000);

    let cleanup = () => {};
    connect()
      .then((socket) => {
        socket.emit("join_chat", chatId);
        const off = on("new_message", (msg) => {
          setMessages((prev) => {
            const incomingId = String(msg._id);
            // Already have the real message — skip
            if (prev.some((m) => !m._local && String(m._id) === incomingId))
              return prev;
            // Replace matching optimistic message (same text, still sending)
            const matchIdx = prev.findIndex(
              (m) => m._local && m._status === "sending" && m.text === msg.text,
            );
            if (matchIdx !== -1) {
              const next = [...prev];
              next[matchIdx] = { ...msg, _status: "sent" };
              return next;
            }
            return [...prev, { ...msg, _status: "sent" }];
          });
          setTimeout(
            () => flatRef.current?.scrollToEnd({ animated: true }),
            50,
          );
          markRead();
        });
        cleanup = off;
      })
      .catch(() => {});

    return () => {
      clearInterval(intervalRef.current);
      cleanup();
      disconnect();
    };
  }, [loadMessages, chatId, markRead]);

  // ── Core send logic (fire-and-forget after optimistic insert) ────────────────
  const dispatchSend = useCallback(
    (tempId, text) => {
      if (inFlightRef.current.has(tempId)) return; // guard: already in-flight
      inFlightRef.current.add(tempId);

      api
        .post("/chat/message", { chatId, text, type: "text" })
        .then((res) => {
          const savedMsg = res.data;
          setMessages((prev) =>
            prev.map((m) =>
              m._id === tempId ? { ...savedMsg, _status: "sent" } : m,
            ),
          );
        })
        .catch(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === tempId ? { ...m, _status: "failed" } : m,
            ),
          );
        })
        .finally(() => {
          inFlightRef.current.delete(tempId);
        });
    },
    [chatId],
  );

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    // 1. Clear input immediately — do NOT wait for API
    setInput("");

    // 2. Build optimistic message
    const tempId =
      "temp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    const optimisticMsg = {
      _id: tempId,
      _local: true, // marks this as client-only
      _status: "sending", // 'sending' | 'sent' | 'failed'
      text,
      type: "text",
      chatId,
      createdAt: new Date().toISOString(),
      senderId: { _id: myUserId },
    };

    // 3. Insert into list immediately
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 40);

    // 4. Fire API in background — no await here
    dispatchSend(tempId, text);
  }, [input, chatId, myUserId, dispatchSend]);

  // Retry a failed message
  const retryMessage = useCallback(
    (tempId, text) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, _status: "sending" } : m)),
      );
      dispatchSend(tempId, text);
    },
    [dispatchSend],
  );

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadMessages(nextPage, true);
  }, [hasMore, page, loadMessages]);

  const isOwn = (msg) => {
    const sid = msg.senderId?._id || msg.senderId;
    return myUserId && String(sid) === String(myUserId);
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color="#D95D39" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[
        s.container,
        { backgroundColor: colors.bg, paddingTop: insets.top },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        style={[
          s.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderSubtle,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.iconBtn, { backgroundColor: colors.elevated }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text
          style={[s.chatName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          Chat
        </Text>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.elevated }]}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={18}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item, idx) => String(item._id || idx)}
        renderItem={({ item, index }) => (
          <ChatBubble
            message={item}
            isOwn={isOwn(item)}
            showName={
              !isOwn(item) &&
              (index === 0 ||
                messages[index - 1]?.senderId?._id !== item.senderId?._id)
            }
            senderName={item.senderId?.name}
            onRetry={retryMessage}
          />
        )}
        contentContainerStyle={{ paddingVertical: 12 }}
        onStartReached={loadMore}
        onStartReachedThreshold={0.2}
        ListEmptyComponent={
          <View style={s.noMsg}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={40}
              color={colors.textDisabled}
            />
            <Text style={[s.noMsgText, { color: colors.textSecondary }]}>
              No messages yet. Say hi!
            </Text>
          </View>
        }
      />

      {/* Input row */}
      <View
        style={[
          s.inputRow,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderSubtle,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <TextInput
          style={[
            s.input,
            { backgroundColor: colors.elevated, color: colors.textPrimary },
          ]}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={2000}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        {/* Send button: only disabled when input is empty */}
        <TouchableOpacity
          style={[s.sendBtn, !input.trim() && s.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim()}
          activeOpacity={0.75}
        >
          <Ionicons name="send" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  chatName: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 17 },
  noMsg: { alignItems: "center", padding: 40, gap: 10 },
  noMsgText: { fontFamily: fonts.body, fontSize: 14 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#D95D39",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#E5E7EB" },
});
