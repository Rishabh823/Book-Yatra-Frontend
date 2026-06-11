import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import ChatBubble from '../../components/ChatBubble';
import { colors, fonts, radius } from '../../lib/theme';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: chatId } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const flatRef = useRef(null);
  const intervalRef = useRef(null);

  const loadMessages = useCallback(async (p = 1, append = false) => {
    try {
      const res = await api.get('/chat/' + chatId + '/messages?page=' + p);
      const msgs = res.data || [];
      if (append) {
        setMessages(prev => [...msgs, ...prev]);
      } else {
        setMessages(msgs);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
      }
      setHasMore(msgs.length === 30);
    } catch {}
    setLoading(false);
  }, [chatId]);

  useEffect(() => {
    loadMessages();
    intervalRef.current = setInterval(() => loadMessages(1, false), 5000);
    return () => clearInterval(intervalRef.current);
  }, [loadMessages]);

  const sendMessage = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText('');
    setSending(true);
    try {
      const res = await api.post('/chat/message', { chatId, text: trimmed, type: 'text' });
      setMessages(prev => [...prev, res.data]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch { setText(trimmed); }
    setSending(false);
  }, [text, chatId, sending]);

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadMessages(nextPage, true);
  }, [hasMore, page, loadMessages]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.chatName} numberOfLines={1}>Chat</Text>
        <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
      </View>
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item, idx) => String(item._id || idx)}
        renderItem={({ item, index }) => (
          <ChatBubble
            message={item}
            isOwn={false}
            showName={index === 0 || messages[index - 1]?.senderId?._id !== item.senderId?._id}
            senderName={item.senderId?.name}
          />
        )}
        contentContainerStyle={{ paddingVertical: 12 }}
        onStartReached={loadMore}
        onStartReachedThreshold={0.2}
        ListEmptyComponent={<View style={styles.noMsg}><Text style={styles.noMsgText}>No messages yet. Say hi!</Text></View>}
      />
      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!text.trim() || sending}>
          {sending ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="send" size={18} color="white" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EBE8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  chatName: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textPrimary },
  noMsg: { alignItems: 'center', padding: 40 },
  noMsgText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary, backgroundColor: '#F3F4F6', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#E5E7EB' },
});
