import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../lib/api';
import ChatBubble from '../../components/ChatBubble';
import { fonts } from '../../lib/theme';
import { useColors } from '../../lib/ThemeContext';
import { useSocket } from '../../lib/hooks/useSocket';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const { id: chatId } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [myUserId, setMyUserId] = useState(null);
  const flatRef = useRef(null);
  const intervalRef = useRef(null);
  const { connect, disconnect, on } = useSocket('/chat');

  useEffect(() => {
    AsyncStorage.getItem('userId').then((id) => setMyUserId(id));
  }, []);

  const loadMessages = useCallback(async (p = 1, append = false) => {
    try {
      const res = await api.get('/chat/' + chatId + '/messages?page=' + p);
      const msgs = res.data || [];
      if (append) {
        setMessages((prev) => [...msgs, ...prev]);
      } else {
        setMessages(msgs);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
      }
      setHasMore(msgs.length === 30);
    } catch {}
    setLoading(false);
  }, [chatId]);

  // Mark messages as read when opening the chat
  const markRead = useCallback(() => {
    api.put('/chat/' + chatId + '/read').catch(() => {});
  }, [chatId]);

  useEffect(() => {
    loadMessages();
    markRead();

    // Fallback polling every 10s
    intervalRef.current = setInterval(() => loadMessages(1, false), 10000);

    // Socket.IO real-time
    let cleanup = () => {};
    connect().then((socket) => {
      socket.emit('join_chat', chatId);
      const off = on('new_message', (msg) => {
        setMessages((prev) => {
          // Replace temp message if it matches, otherwise append
          const hasTempMatch = prev.some(m => m._pending && m.text === msg.text);
          if (hasTempMatch) {
            return prev.map(m => (m._pending && m.text === msg.text) ? msg : m);
          }
          // Don't add duplicates
          if (prev.some(m => String(m._id) === String(msg._id))) return prev;
          return [...prev, msg];
        });
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
        // Mark as read when new message arrives while screen is open
        markRead();
      });
      cleanup = off;
    }).catch(() => {});

    return () => {
      clearInterval(intervalRef.current);
      cleanup();
      disconnect();
    };
  }, [loadMessages, chatId, markRead]);

  const sendMessage = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const tempId = 'temp_' + Date.now();
    const tempMsg = {
      _id: tempId,
      text: trimmed,
      type: 'text',
      chatId,
      createdAt: new Date().toISOString(),
      senderId: { _id: myUserId },
      _pending: true,
    };

    // Clear input FIRST before async work
    setText('');
    setSending(true);
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const res = await api.post('/chat/message', { chatId, text: trimmed, type: 'text' });
      const savedMsg = res.data || tempMsg;
      setMessages((prev) =>
        prev.map((m) => m._id === tempId ? savedMsg : m)
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setText(trimmed);
    }
    setSending(false);
  }, [text, chatId, sending, myUserId]);

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
      style={[s.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { backgroundColor: colors.elevated }]}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.chatName, { color: colors.textPrimary }]} numberOfLines={1}>Chat</Text>
        <TouchableOpacity style={[s.iconBtn, { backgroundColor: colors.elevated }]}>
          <Ionicons name="ellipsis-vertical" size={18} color={colors.textPrimary} />
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
            showName={!isOwn(item) && (index === 0 || messages[index - 1]?.senderId?._id !== item.senderId?._id)}
            senderName={item.senderId?.name}
          />
        )}
        contentContainerStyle={{ paddingVertical: 12 }}
        onStartReached={loadMore}
        onStartReachedThreshold={0.2}
        ListEmptyComponent={
          <View style={s.noMsg}>
            <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.textDisabled} />
            <Text style={[s.noMsgText, { color: colors.textSecondary }]}>No messages yet. Say hi!</Text>
          </View>
        }
      />

      {/* Input row — stays at bottom */}
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
          style={[s.input, { backgroundColor: colors.elevated, color: colors.textPrimary }]}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={2000}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="white" />
            : <Ionicons name="send" size={18} color="white" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatName: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 17 },
  noMsg: { alignItems: 'center', padding: 40, gap: 10 },
  noMsgText: { fontFamily: fonts.body, fontSize: 14 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
    backgroundColor: '#D95D39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#E5E7EB' },
});
