import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../lib/api';
import { colors, fonts, radius, shadow } from '../lib/theme';

const TYPE_STYLES = {
  booking: { icon: 'calendar', bg: '#EDE9FE', color: '#7C3AED' },
  tour: { icon: 'map', bg: '#FEE8E2', color: '#D95D39' },
  payment: { icon: 'card', bg: '#DCFCE7', color: '#16A34A' },
  chat: { icon: 'chatbubble', bg: '#DBEAFE', color: '#2563EB' },
  community: { icon: 'people', bg: '#FEF3C7', color: '#D97706' },
  sos: { icon: 'alert-circle', bg: '#FEE2E2', color: '#DC2626' },
  system: { icon: 'settings', bg: '#F3F4F6', color: '#6B7280' },
  gamification: { icon: 'star', bg: '#FEF3C7', color: '#D97706' },
};

const DEFAULT_TYPE = { icon: 'notifications', bg: '#F3F4F6', color: '#6B7280' };

const fmtTime = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d);
  if (diff < 60000) return 'now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  if (diff < 2592000000) return Math.floor(diff / 86400000) + 'd ago';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const FILTERS = ['all','unread','tours','payments','system'];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (reset = false) => {
    if (reset) setLoading(true);
    try {
      const p = reset ? 1 : page;
      const params = new URLSearchParams({ page: p, limit: 20 });
      if (filter === 'unread') params.set('unreadOnly', 'true');
      else if (filter !== 'all') params.set('type', filter === 'tours' ? 'tour' : filter === 'payments' ? 'payment' : 'system');
      const res = await api.get('/notifications?' + params.toString());
      const notifs = res.data || [];
      setNotifications(prev => reset ? notifs : [...prev, ...notifs]);
      setHasMore(notifs.length === 20);
      if (!reset) setPage(p + 1);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [page, filter]);

  useFocusEffect(useCallback(() => { load(true); }, []));

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  const markRead = async (id) => {
    try {
      await api.put('/notifications/' + id + '/read', {});
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const renderItem = ({ item }) => {
    const ts = TYPE_STYLES[item.type] || DEFAULT_TYPE;
    return (
      <TouchableOpacity
        style={[styles.notifRow, shadow.soft, !item.isRead && styles.unreadRow]}
        onPress={() => { markRead(item._id); if (item.actionUrl) router.push(item.actionUrl); }}
      >
        {!item.isRead && <View style={styles.unreadDot} />}
        <View style={[styles.notifIcon, { backgroundColor: ts.bg }]}>
          <Ionicons name={ts.icon} size={18} color={ts.color} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.notifHeader}>
            <Text style={[styles.notifTitle, !item.isRead && styles.unreadTitle]} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.notifTime}>{fmtTime(item.createdAt)}</Text>
          </View>
          <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const changeFilter = (f) => { setFilter(f); setPage(1); };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1E0A0A', '#5C1615']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead} style={styles.readAllBtn}>
          <Text style={styles.readAllText}>Read all</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.filtersWrap}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterActive]} onPress={() => changeFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={notifications}
          keyExtractor={(item, i) => String(item._id || i)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: insets.bottom + 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} colors={[colors.primary]} />}
          onEndReached={() => hasMore && load()}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-outline" size={48} color={colors.textDisabled} />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySub}>No notifications here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: 'Philosopher_700Bold', fontSize: 22, color: 'white' },
  readAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.15)' },
  readAllText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: 'white' },
  filtersWrap: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E5E7EB' },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
  filterTextActive: { color: 'white' },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14 },
  unreadRow: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  unreadDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  notifIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifHeader: { flexDirection: 'row', alignItems: 'center' },
  notifTitle: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary },
  unreadTitle: { fontFamily: fonts.bodyBold, color: colors.textPrimary },
  notifTime: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  notifBody: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
});
