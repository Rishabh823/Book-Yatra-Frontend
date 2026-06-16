import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminShell } from '../../../lib/AdminScreen';
import { colors, fonts, radius, shadow } from '../../../lib/theme';
import { superAdmin as superApi } from '../../../lib/api';

const TARGETS = [
  { key: 'all',        label: 'Everyone',      icon: 'people',              color: '#0284C7' },
  { key: 'users',      label: 'Users Only',    icon: 'person',              color: '#16A34A' },
  { key: 'admin',      label: 'Admins Only',   icon: 'shield',              color: '#D97706' },
  { key: 'volunteer',  label: 'Volunteers',    icon: 'people-circle',       color: '#7C3AED' },
];

export default function SuperNotifications() {
  const [title,   setTitle]   = useState('');
  const [body,    setBody]    = useState('');
  const [target,  setTarget]  = useState('all');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const res = await superApi.notificationHistory(1);
      const list = Array.isArray(res) ? res : (res?.notifications || res?.data || []);
      setHistory(list);
    } catch { setHistory([]); }
    finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const send = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a notification title.'); return; }
    if (!body.trim())  { Alert.alert('Required', 'Please enter a message body.'); return; }

    Alert.alert(
      'Send Notification',
      `Send "${title}" to ${TARGETS.find(t => t.key === target)?.label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send', style: 'default',
          onPress: async () => {
            setSending(true);
            try {
              const TARGET_ROLE_MAP = { all: null, users: 'user', admin: 'admin', volunteer: 'volunteer' };
              const roleVal = TARGET_ROLE_MAP[target];
              const payload = { title: title.trim(), body: body.trim() };
              if (roleVal) payload.role = roleVal;
              await superApi.broadcastNotification(payload);
              Alert.alert('Sent!', 'Notification delivered successfully.');
              setTitle('');
              setBody('');
              loadHistory();
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to send notification.');
            } finally { setSending(false); }
          },
        },
      ],
    );
  };

  return (
    <AdminShell title="Broadcast Notification" subtitle="Send push alerts to users">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Compose ─────────────────────────────── */}
        <SectionLabel icon="create-outline" title="Compose" />

        <View style={s.card}>
          <Text style={s.fieldLabel}>Title</Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Tour Update: Kedarnath Yatra"
            placeholderTextColor={colors.textDisabled}
            maxLength={80}
          />
          <Text style={s.charCount}>{title.length}/80</Text>
        </View>

        <View style={s.card}>
          <Text style={s.fieldLabel}>Message</Text>
          <TextInput
            style={[s.input, s.textarea]}
            value={body}
            onChangeText={setBody}
            placeholder="Enter your message here..."
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={300}
          />
          <Text style={s.charCount}>{body.length}/300</Text>
        </View>

        {/* ── Target Audience ──────────────────────── */}
        <SectionLabel icon="funnel-outline" title="Target Audience" />
        <View style={s.targetGrid}>
          {TARGETS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.targetCard, target === t.key && { borderColor: t.color, backgroundColor: t.color + '12' }]}
              onPress={() => setTarget(t.key)}
              activeOpacity={0.8}
            >
              <View style={[s.targetIcon, { backgroundColor: t.color + '18' }]}>
                <Ionicons name={t.icon} size={20} color={t.color} />
              </View>
              <Text style={[s.targetLabel, target === t.key && { color: t.color, fontFamily: fonts.bodyBold }]}>
                {t.label}
              </Text>
              {target === t.key && (
                <Ionicons name="checkmark-circle" size={16} color={t.color} style={{ position: 'absolute', top: 8, right: 8 }} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Send Button ──────────────────────────── */}
        <TouchableOpacity style={[s.sendBtn, sending && { opacity: 0.6 }]} onPress={send} disabled={sending} activeOpacity={0.85}>
          {sending
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={s.sendTxt}>Send Notification</Text>
              </>
          }
        </TouchableOpacity>

        {/* ── History ──────────────────────────────── */}
        <SectionLabel icon="time-outline" title="Recent Broadcasts" />

        {loadingHistory ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : history.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="notifications-off-outline" size={32} color={colors.textDisabled} />
            <Text style={s.emptyTxt}>No notifications sent yet</Text>
          </View>
        ) : (
          history.map((n, i) => (
            <View key={i} style={s.historyCard}>
              <View style={s.historyTop}>
                <Text style={s.historyTitle} numberOfLines={1}>{n.title || n.notification?.title || 'Untitled'}</Text>
                <View style={[s.targetBadge, { backgroundColor: colors.primary + '18' }]}>
                  <Text style={[s.targetBadgeTxt, { color: colors.primary }]}>
                    {TARGETS.find(t => t.key === n.target)?.label || n.target || 'All'}
                  </Text>
                </View>
              </View>
              <Text style={s.historyBody} numberOfLines={2}>{n.body || n.notification?.body || ''}</Text>
              {n.createdAt && (
                <Text style={s.historyTime}>{new Date(n.createdAt).toLocaleString()}</Text>
              )}
            </View>
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </AdminShell>
  );
}

function SectionLabel({ icon, title }) {
  return (
    <View style={s.sectionRow}>
      <Ionicons name={icon} size={13} color={colors.textSecondary} />
      <Text style={s.sectionLabel}>{title}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  sectionRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 8 },
  sectionLabel: { fontFamily: fonts.accent, fontSize: 10, color: colors.textSecondary, letterSpacing: 2, textTransform: 'uppercase' },

  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16, marginBottom: 10, ...shadow.soft },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary, marginBottom: 8 },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSubtle, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  textarea: { height: 96, paddingTop: 12, textAlignVertical: 'top' },
  charCount: { fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled, textAlign: 'right', marginTop: 4 },

  targetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  targetCard: { flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.borderSubtle, padding: 14, alignItems: 'center', gap: 8, ...shadow.soft },
  targetIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  targetLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textPrimary, textAlign: 'center' },

  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20, height: 56, borderRadius: radius.pill, backgroundColor: colors.primary, ...shadow.card },
  sendTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#fff' },

  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 32, alignItems: 'center', gap: 10, ...shadow.soft },
  emptyTxt: { fontFamily: fonts.body, fontSize: 14, color: colors.textDisabled },

  historyCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 14, marginBottom: 10, ...shadow.soft },
  historyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  historyTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary, flex: 1 },
  historyBody: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  historyTime: { fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled, marginTop: 6 },
  targetBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  targetBadgeTxt: { fontFamily: fonts.bodyMedium, fontSize: 11 },
});
