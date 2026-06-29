import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../lib/api";
import ChatBubble from "../../components/ChatBubble";
import UserProfileModal from "../../components/UserProfileModal";
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
  const [newMsgCount, setNewMsgCount] = useState(0);

  const [recipientUser, setRecipientUser] = useState(null);
  const [iBlocked, setIBlocked] = useState(false);
  const [blockedByThem, setBlockedByThem] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const flatRef = useRef(null);
  const intervalRef = useRef(null);
  const inFlightRef = useRef(new Set());
  const socketConfirmedRef = useRef(new Set());
  const recipientIdRef = useRef(null);
  const myUserIdRef = useRef(null);
  const isAtBottom = useRef(true);
  // Animated value tracks keyboard height — drives paddingBottom on content area
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  const { connect, disconnect, on } = useSocket("/chat");

  useEffect(() => {
    AsyncStorage.getItem("userId").then((id) => {
      setMyUserId(id);
      myUserIdRef.current = id;
    });
  }, []);

  // ── Keyboard animation ──────────────────────────────────────────────────────
  // No KAV. Instead, animate paddingBottom of the content area to keyboard height.
  // This gives zero residual gap when keyboard closes (Animated resets to 0 exactly).
  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height + 8,
        duration: Platform.OS === "ios" ? (e.duration ?? 250) : 250,
        useNativeDriver: false,
      }).start();
    };

    const onHide = (e) => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: Platform.OS === "ios" ? (e.duration ?? 250) : 250,
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvt, onShow);
    const hideSub = Keyboard.addListener(hideEvt, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeight]);

  // ── Load chat info ──────────────────────────────────────────────────────────
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
          const other = others[0];
          setChatName(other.name || "Chat");
          setRecipientUser(other);
          recipientIdRef.current = String(other._id || other);

          const rid = String(other._id || other);
          setProfileLoading(true);
          Promise.all([
            api.get(`/users/${rid}/chat-profile`).catch(() => null),
            api.get(`/users/${rid}/block-status`).catch(() => null),
          ])
            .then(([profileRes, blockRes]) => {
              if (profileRes?.data) setRecipientUser(profileRes.data);
              if (blockRes) {
                setIBlocked(blockRes.iBlocked || false);
                setBlockedByThem(blockRes.blockedByThem || false);
              }
            })
            .finally(() => setProfileLoading(false));
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
          // Older page prepended — appears at visual top (end of inverted list)
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
          // Inverted FlatList always shows index-0 (newest) at visual bottom.
          // No scrollToEnd needed — the position is correct by default.
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

    intervalRef.current = setInterval(() => loadMessages(1, false), 30000);

    let mounted = true;
    let socketOff = () => {};

    connect()
      .then((socket) => {
        if (!mounted) return;

        socket.emit("join_chat", chatId);

        const offNew = on("new_message", (msg) => {
          // Determine if incoming before setMessages (senderId available synchronously)
          const isIncoming =
            String(msg.senderId?._id || msg.senderId) !==
            String(myUserIdRef.current);

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
              socketConfirmedRef.current.add(next[matchIdx]._id);
              next[matchIdx] = { ...msg, _status: "sent" };
              return next;
            }
            return [...prev, { ...msg, _status: "sent" }];
          });

          // Smart scroll: auto-scroll to bottom only if user is already there.
          // If reading old messages, show a "new messages" badge instead.
          if (isIncoming) {
            if (isAtBottom.current) {
              setTimeout(
                () =>
                  flatRef.current?.scrollToOffset({
                    offset: 0,
                    animated: true,
                  }),
                50,
              );
            } else {
              setNewMsgCount((c) => c + 1);
            }
          }

          markRead();
        });

        const offRead = on("messages_read", ({ readBy }) => {
          const myId = myUserIdRef.current;
          setMessages((prev) =>
            prev.map((m) => {
              if (m._local || m._status === "failed" || m._status === "sending")
                return m;
              const senderId = String(m.senderId?._id || m.senderId);
              if (!myId || senderId !== String(myId)) return m;
              if (String(readBy) === String(myId)) return m;
              const alreadyRead = (m.readBy || []).some(
                (r) => String(r.userId) !== String(myId),
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

        const offDel = on("message_deleted", ({ messageId }) => {
          setMessages((prev) =>
            prev.map((m) =>
              String(m._id) === String(messageId)
                ? { ...m, isDeleted: true, type: "deleted", text: undefined }
                : m,
            ),
          );
        });

        socketOff = () => {
          offNew();
          offRead();
          offDel();
        };
      })
      .catch(() => {});

    return () => {
      mounted = false;
      clearInterval(intervalRef.current);
      socketOff();
      disconnect();
    };
  }, [loadMessages, chatId, markRead]);

  // ── Send ───────────────────────────────────────────────────────────────────
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

          if (error?.status === 403) {
            setBlockedByThem(true);
            setMessages((prev) => prev.filter((m) => m._id !== tempId));
            return;
          }

          if (socketConfirmedRef.current.has(tempId)) {
            socketConfirmedRef.current.delete(tempId);
            return;
          }

          const status = error?.status;
          const isAbort = error?.name === "AbortError";
          const isNetworkFailure = !status;
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
        })
        .finally(() => inFlightRef.current.delete(tempId));
    },
    [chatId],
  );

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || iBlocked || blockedByThem) return;
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
    // Always jump to own sent message (offset 0 = newest in inverted list)
    setTimeout(
      () => flatRef.current?.scrollToOffset({ offset: 0, animated: true }),
      40,
    );
    setNewMsgCount(0);
    dispatchSend(tempId, text);
  }, [input, chatId, myUserId, dispatchSend, iBlocked, blockedByThem]);

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

  // ── Block / Unblock ────────────────────────────────────────────────────────
  const handleBlock = useCallback(async () => {
    if (!recipientIdRef.current) return;
    setBlockLoading(true);
    try {
      await api.post(`/users/${recipientIdRef.current}/block`, {});
      setIBlocked(true);
    } catch {}
    setBlockLoading(false);
    setShowProfile(false);
  }, []);

  const handleUnblock = useCallback(async () => {
    if (!recipientIdRef.current) return;
    setBlockLoading(true);
    try {
      await api.post(`/users/${recipientIdRef.current}/unblock`, {});
      setIBlocked(false);
    } catch {}
    setBlockLoading(false);
    setShowProfile(false);
  }, []);

  // ── Delete message ─────────────────────────────────────────────────────────
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
        setMessages((prev) =>
          prev.filter((m) => String(m._id) !== String(_id)),
        );
        api.del("/chat/message/" + _id + "?scope=me").catch(() => {});
      } else {
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

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isOwn = useCallback(
    (msg) => {
      const sid = msg.senderId?._id || msg.senderId;
      return myUserId && String(sid) === String(myUserId);
    },
    [myUserId],
  );

  const isRead = useCallback(
    (msg) =>
      (msg.readBy || []).some((r) => String(r.userId) !== String(myUserId)),
    [myUserId],
  );

  // Newest message at index 0 — displayed at visual bottom by inverted FlatList
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const inputBlocked = iBlocked || blockedByThem;

  const initials = (chatName || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      {/* ── Header — top safe area applied here since KAV is gone ─────────── */}
      <View
        style={[
          s.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderSubtle,
            paddingTop: insets.top + 10,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.iconBtn, { backgroundColor: colors.elevated }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowProfile(true)}
          activeOpacity={0.8}
          style={s.headerAvatarWrap}
        >
          {recipientUser?.photoUrl ? (
            <Image
              source={{ uri: recipientUser.photoUrl }}
              style={s.headerAvatar}
            />
          ) : (
            <View
              style={[s.headerAvatarFallback, { backgroundColor: "#D6E4FF" }]}
            >
              <Text style={s.headerAvatarInitials}>{initials}</Text>
            </View>
          )}
          {blockedByThem && !iBlocked && (
            <View style={s.headerBlockDot}>
              <Ionicons name="ban" size={9} color="white" />
            </View>
          )}
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text
            style={[s.chatName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {chatName || "Chat"}
          </Text>
          {(iBlocked || blockedByThem) && (
            <Text style={s.headerBlockedSub}>
              {iBlocked ? "Blocked" : "Can't message"}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.elevated }]}
          onPress={() => setShowProfile(true)}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* ── Block banners ─────────────────────────────────────────────────── */}
      {blockedByThem && !iBlocked && (
        <View style={s.blockedBanner}>
          <Ionicons
            name="ban-outline"
            size={15}
            color="#6B7280"
            style={{ marginRight: 6 }}
          />
          <Text style={s.blockedBannerText}>
            You can't send messages to this user
          </Text>
        </View>
      )}
      {iBlocked && (
        <View style={[s.blockedBanner, { backgroundColor: "#FFF0EB" }]}>
          <Ionicons
            name="ban-outline"
            size={15}
            color="#D95D39"
            style={{ marginRight: 6 }}
          />
          <Text style={[s.blockedBannerText, { color: "#D95D39" }]}>
            You blocked this user ·{" "}
            <Text
              style={{ fontFamily: fonts.bodyBold }}
              onPress={handleUnblock}
            >
              Unblock
            </Text>
          </Text>
        </View>
      )}

      {/* ── Content area: shrinks above keyboard via animated paddingBottom ── */}
      <Animated.View style={[s.content, { paddingBottom: keyboardHeight }]}>
        {/* Message list */}
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color="#D95D39" />
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            inverted
            data={reversedMessages}
            keyExtractor={(item, idx) => String(item._id || idx)}
            extraData={myUserId}
            // "none" on Android keeps keyboard open while scrolling.
            // "interactive" on iOS lets the keyboard follow the finger.
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => (
              <ChatBubble
                message={item}
                isOwn={isOwn(item)}
                isRead={isOwn(item) ? isRead(item) : false}
                // With inverted list, index+1 is the older (visually above) message.
                // Show sender name at the top of each consecutive block.
                showName={
                  !isOwn(item) &&
                  (index === reversedMessages.length - 1 ||
                    reversedMessages[index + 1]?.senderId?._id !==
                      item.senderId?._id)
                }
                senderName={item.senderId?.name}
                onRetry={retryMessage}
                onLongPress={handleLongPress}
              />
            )}
            contentContainerStyle={{ paddingVertical: 12 }}
            // End = visual top = older messages → trigger pagination
            onEndReached={loadMore}
            onEndReachedThreshold={0.2}
            onScroll={(e) => {
              const atBottom = e.nativeEvent.contentOffset.y < 60;
              if (atBottom && !isAtBottom.current) setNewMsgCount(0);
              isAtBottom.current = atBottom;
            }}
            scrollEventThrottle={100}
            ListEmptyComponent={
              // Counter-rotate to cancel the inverted scaleY(-1) applied to the list
              <View style={[s.noMsg, { transform: [{ scaleY: -1 }] }]}>
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
        )}

        {/* New messages badge — appears when user is reading old messages */}
        {newMsgCount > 0 && (
          <TouchableOpacity
            style={s.newMsgBadge}
            onPress={() => {
              flatRef.current?.scrollToOffset({ offset: 0, animated: true });
              setNewMsgCount(0);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-down" size={14} color="white" />
            <Text style={s.newMsgText}>
              {newMsgCount} new {newMsgCount === 1 ? "message" : "messages"}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Input row ─────────────────────────────────────────────────── */}
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
          {inputBlocked ? (
            <View
              style={[s.blockedInput, { backgroundColor: colors.elevated }]}
            >
              <Ionicons
                name="ban-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text
                style={[s.blockedInputText, { color: colors.textSecondary }]}
              >
                {iBlocked
                  ? "You blocked this user"
                  : "You can't reply to this conversation"}
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                style={[
                  s.input,
                  {
                    backgroundColor: colors.elevated,
                    color: colors.textPrimary,
                  },
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
            </>
          )}
        </View>
      </Animated.View>

      {/* ── User profile modal ─────────────────────────────────────────────── */}
      <UserProfileModal
        visible={showProfile}
        user={recipientUser}
        iBlocked={iBlocked}
        blockedByThem={blockedByThem}
        onBlock={handleBlock}
        onUnblock={handleUnblock}
        onClose={() => setShowProfile(false)}
        loading={profileLoading || blockLoading}
      />

      {/* ── Delete context menu ────────────────────────────────────────────── */}
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
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarWrap: { position: "relative" },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#D95D39",
  },
  headerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#D95D39",
  },
  headerAvatarInitials: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: "#1E3A5F",
  },
  headerBlockDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#6B7280",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "white",
  },
  chatName: { fontFamily: fonts.bodyBold, fontSize: 16 },
  headerBlockedSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1,
  },

  // Block banners
  blockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  blockedBannerText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },

  noMsg: { alignItems: "center", padding: 40, gap: 10 },
  noMsgText: { fontFamily: fonts.body, fontSize: 14 },

  // New messages badge
  newMsgBadge: {
    position: "absolute",
    bottom: 70,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D95D39",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  newMsgText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: "white",
  },

  // Input
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
  blockedInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  blockedInputText: { fontFamily: fonts.body, fontSize: 14, flex: 1 },

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
