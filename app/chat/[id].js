import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
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
  const [chatName, setChatName] = useState("");
  // Message long-press context menu
  const [deleteTarget, setDeleteTarget] = useState(null); // { _id, text, isMine }

  const flatRef = useRef(null);
  const intervalRef = useRef(null);
  const inFlightRef = useRef(new Set());
  const socketConfirmedRef = useRef(new Set()); // tempIds confirmed by socket before API catch fires
  const { connect, disconnect, on } = useSocket("/chat");

  useEffect(() => {
    AsyncStorage.getItem("userId").then((id) => setMyUserId(id));
  }, []);

  useEffect(() => {
    if (!myUserId) return;
    api
      .get("/chat/" + chatId)
      .then((res) => {
        const chat = res.data;
        if (!chat) return;
        const others = (chat.participants || []).filter(
          (p) => String(p._id || p) !== String(myUserId),
        );
        if (chat.type === "direct" && others.length === 1) {
          setChatName(others[0].name || "Chat");
        } else {
          setChatName(chat.name || "Group Chat");
        }
      })
      .catch(() => {});
  }, [chatId, myUserId]);

  const loadMessages = useCallback(
    async (p = 1, append = false) => {
      try {
        const res = await api.get("/chat/" + chatId + "/messages?page=" + p);
        const msgs = (res.data || []).map((m) => ({ ...m, _status: "sent" }));
        if (append) {
          setMessages((prev) => [...msgs, ...prev]);
        } else {
          setMessages((prev) => {
            const optimistic = prev.filter((m) => m._local);
            const stillPending = optimistic.filter((m) => {
              const serverHas = msgs.some(
                (s) =>
                  s.text === m.text &&
                  Math.abs(new Date(s.createdAt) - new Date(m.createdAt)) <
                    60000,
              );
              return !serverHas;
            });
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

        const offNew = on("new_message", (msg) => {
          setMessages((prev) => {
            const incomingId = String(msg._id);
            if (prev.some((m) => !m._local && String(m._id) === incomingId))
              return prev;
            const matchIdx = prev.findIndex(
              (m) =>
                m._local &&
                m.text === msg.text &&
                Math.abs(new Date(msg.createdAt) - new Date(m.createdAt)) <
                  60000,
            );
            if (matchIdx !== -1) {
              const next = [...prev];
              // Tell the catch handler this tempId was confirmed — prevents false "failed" state
              socketConfirmedRef.current.add(next[matchIdx]._id);
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

        const offRead = on("messages_read", ({ readBy }) => {
          setMessages((prev) =>
            prev.map((m) => {
              if (m._local || m._status === "failed" || m._status === "sending")
                return m;
              const senderId = String(m.senderId?._id || m.senderId);
              if (!myUserId || senderId !== String(myUserId)) return m;
              if (String(readBy) === String(myUserId)) return m;
              const alreadyRead = (m.readBy || []).some(
                (r) => String(r.userId) !== String(myUserId),
              );
              if (alreadyRead) return m;
              return {
                ...m,
                readBy: [
                  ...(m.readBy || []),
                  { userId: readBy, readAt: new Date().toISOString() },
                ],
              };
            }),
          );
        });

        // Mark message as deleted when someone deletes for everyone
        const offDel = on("message_deleted", ({ messageId }) => {
          setMessages((prev) =>
            prev.map((m) =>
              String(m._id) === String(messageId)
                ? { ...m, isDeleted: true, type: "deleted", text: undefined }
                : m,
            ),
          );
        });

        cleanup = () => {
          offNew();
          offRead();
          offDel();
        };
      })
      .catch(() => {});

    return () => {
      clearInterval(intervalRef.current);
      cleanup();
      disconnect();
    };
  }, [loadMessages, chatId, markRead, myUserId]);

  // ── Send logic ────────────────────────────────────────────────────────────────
  const dispatchSend = useCallback(
    (tempId, text) => {
      if (inFlightRef.current.has(tempId)) return;
      inFlightRef.current.add(tempId);

      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), 30000);

      api
        .post(
          "/chat/message",
          { chatId, text, type: "text" },
          { signal: controller.signal },
        )
        .then((res) => {
          clearTimeout(abortTimer);
          const savedMsg = res.data;
          if (!savedMsg?._id) return;
          setMessages((prev) =>
            prev.map((m) =>
              m._id === tempId ? { ...savedMsg, _status: "sent" } : m,
            ),
          );
        })
        .catch((error) => {
          clearTimeout(abortTimer);

          // Case A: socket already confirmed this message — skip marking failed entirely
          if (socketConfirmedRef.current.has(tempId)) {
            socketConfirmedRef.current.delete(tempId);
            return;
          }

          // Only mark failed for definitive failures:
          //   - AbortError (30s timeout)
          //   - Network error (device offline, no response at all)
          //   - 4xx (server explicitly rejected the request)
          // For 5xx the message was likely saved — socket or 10s poll will reconcile.
          const status = error?.status;
          const isAbort = error?.name === "AbortError";
          const isNetworkFailure = !status; // no HTTP status = never reached server
          const isClientRejection = status >= 400 && status < 500;

          if (isAbort || isNetworkFailure || isClientRejection) {
            setMessages((prev) => {
              const msg = prev.find((m) => m._id === tempId);
              if (!msg || !msg._local || msg._status === "sent") return prev;
              return prev.map((m) =>
                m._id === tempId ? { ...m, _status: "failed" } : m,
              );
            });
          }
          // 5xx: leave as "sending" — socket or periodic poll will confirm
        })
        .finally(() => inFlightRef.current.delete(tempId));
    },
    [chatId],
  );

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const tempId =
      "temp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    setMessages((prev) => [
      ...prev,
      {
        _id: tempId,
        _local: true,
        _status: "sending",
        text,
        type: "text",
        chatId,
        createdAt: new Date().toISOString(),
        senderId: { _id: myUserId },
        readBy: [],
      },
    ]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 40);
    dispatchSend(tempId, text);
  }, [input, chatId, myUserId, dispatchSend]);

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

  // ── Delete message ────────────────────────────────────────────────────────────
  const handleLongPress = useCallback(
    (msg) => {
      const isMine =
        String(msg.senderId?._id || msg.senderId) === String(myUserId);
      setDeleteTarget({ _id: msg._id, text: msg.text, isMine });
    },
    [myUserId],
  );

  const deleteMessage = useCallback(
    async (scope) => {
      if (!deleteTarget) return;
      const { _id } = deleteTarget;
      setDeleteTarget(null);

      if (scope === "me") {
        // "Delete for me" — vanishes only from your view, no placeholder
        setMessages((prev) =>
          prev.filter((m) => String(m._id) !== String(_id)),
        );
        api.del("/chat/message/" + _id + "?scope=me").catch(() => {});
      } else {
        // "Delete for everyone" — replace with deleted placeholder immediately;
        // socket pushes the same update to all other participants
        setMessages((prev) =>
          prev.map((m) =>
            String(m._id) === String(_id)
              ? { ...m, isDeleted: true, type: "deleted", text: undefined }
              : m,
          ),
        );
        api.del("/chat/message/" + _id + "?scope=everyone").catch(() => {
          loadMessages(1, false);
        });
      }
    },
    [deleteTarget, loadMessages],
  );

  const isOwn = (msg) => {
    const sid = msg.senderId?._id || msg.senderId;
    return myUserId && String(sid) === String(myUserId);
  };

  const isRead = (msg) =>
    (msg.readBy || []).some((r) => String(r.userId) !== String(myUserId));

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
          {chatName || "Chat"}
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
            isRead={isOwn(item) ? isRead(item) : false}
            showName={
              !isOwn(item) &&
              (index === 0 ||
                messages[index - 1]?.senderId?._id !== item.senderId?._id)
            }
            senderName={item.senderId?.name}
            onRetry={retryMessage}
            onLongPress={handleLongPress}
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
        <TouchableOpacity
          style={[s.sendBtn, !input.trim() && s.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim()}
          activeOpacity={0.75}
        >
          <Ionicons name="send" size={18} color="white" />
        </TouchableOpacity>
      </View>

      {/* ── Delete context menu (WhatsApp-style, no Alert) ─────────────────── */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setDeleteTarget(null)}>
          <View style={s.overlay}>
            <TouchableWithoutFeedback>
              <View
                style={[s.deleteSheet, { backgroundColor: colors.surface }]}
              >
                {/* Preview */}
                {deleteTarget?.text ? (
                  <View
                    style={[s.previewBox, { backgroundColor: colors.elevated }]}
                  >
                    <Text
                      style={[s.previewText, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {deleteTarget.text}
                    </Text>
                  </View>
                ) : null}

                <Text style={[s.sheetTitle, { color: colors.textPrimary }]}>
                  Delete message?
                </Text>

                {/* Delete for everyone — own messages only */}
                {deleteTarget?.isMine && (
                  <TouchableOpacity
                    style={s.sheetBtn}
                    onPress={() => deleteMessage("everyone")}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[s.sheetBtnIcon, { backgroundColor: "#FEE2E2" }]}
                    >
                      <Ionicons name="trash" size={18} color="#DC2626" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.sheetBtnLabel, { color: "#DC2626" }]}>
                        Delete for Everyone
                      </Text>
                      <Text
                        style={[s.sheetBtnSub, { color: colors.textSecondary }]}
                      >
                        Remove for all participants
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Delete for me — always available */}
                <TouchableOpacity
                  style={s.sheetBtn}
                  onPress={() => deleteMessage("me")}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      s.sheetBtnIcon,
                      { backgroundColor: colors.elevated },
                    ]}
                  >
                    <Ionicons
                      name="eye-off-outline"
                      size={18}
                      color={colors.textPrimary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[s.sheetBtnLabel, { color: colors.textPrimary }]}
                    >
                      Delete for Me
                    </Text>
                    <Text
                      style={[s.sheetBtnSub, { color: colors.textSecondary }]}
                    >
                      Only you won't see this message
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Cancel */}
                <TouchableOpacity
                  style={[s.cancelBtn, { borderTopColor: colors.borderSubtle }]}
                  onPress={() => setDeleteTarget(null)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.cancelText, { color: colors.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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

  // Delete sheet
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  deleteSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 28,
    overflow: "hidden",
  },
  previewBox: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 12,
    borderRadius: 10,
  },
  previewText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  sheetTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 4,
  },
  sheetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetBtnIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBtnLabel: { fontFamily: fonts.bodyBold, fontSize: 14 },
  sheetBtnSub: { fontFamily: fonts.body, fontSize: 12, marginTop: 1 },
  cancelBtn: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelText: { fontFamily: fonts.bodyBold, fontSize: 15 },
});
