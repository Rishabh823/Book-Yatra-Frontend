import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { securityApi } from '../../lib/api';
import { colors, fonts, radius, shadow } from '../../lib/theme';

const ACTIVITY_ICON = {
  login:                   { icon: 'log-in',          color: '#16A34A', bg: '#DCFCE7' },
  logout:                  { icon: 'log-out',         color: '#6B7280', bg: '#F3F4F6' },
  password_changed:        { icon: 'key',             color: '#D97706', bg: '#FEF9C3' },
  profile_updated:         { icon: 'person',          color: '#2563EB', bg: '#DBEAFE' },
  booking_created:         { icon: 'calendar',        color: '#7C3AED', bg: '#EDE9FE' },
  booking_confirmed:       { icon: 'checkmark-circle',color: '#16A34A', bg: '#DCFCE7' },
  booking_cancelled:       { icon: 'close-circle',    color: '#DC2626', bg: '#FEE2E2' },
  tour_created:            { icon: 'map',             color: colors.primary, bg: colors.primaryLight },
  tour_updated:            { icon: 'map',             color: colors.primary, bg: colors.primaryLight },
  biometric_setup:         { icon: 'scan-circle',     color: '#2563EB', bg: '#DBEAFE' },
  pin_setup:               { icon: 'keypad',          color: '#7C3AED', bg: '#EDE9FE' },
  mfa_setup:               { icon: 'shield-checkmark',color: '#16A34A', bg: '#DCFCE7' },
  device_trusted:          { icon: 'phone-portrait',  color: '#2563EB', bg: '#DBEAFE' },
  session_revoked:         { icon: 'log-out',         color: '#DC2626', bg: '#FEE2E2' },
  security_settings_updated: { icon: 'settings',     color: '#6B7280', bg: '#F3F4F6' },
};

const DEFAULT_ACTIVITY = { icon: 'ellipse', color: colors.textSecondary, bg: '#F3F4F6' };

const fmtDate = (d) => {
  const date = new Date(d);
  const now  = new Date();
  const diff = (now - date) / 1000;
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(true);
  const [loadingMore,setLoadingMore]= useState(false);
  const [total,      setTotal]      = useState(0);

  const load = useCallback(async (reset = false) => {
    if (reset) { setLoading(true); setPage(1); }
    try {
      const p = reset ? 1 : page;
      const res = await securityApi.getActivity(p);
      setTotal(res.total);
      setHasMore(p < res.pages);
      setLogs(prev => reset ? (res.logs || []) : [...prev, ...(res.logs || [])]);
      if (!reset) setPage(p + 1);
    } catch {}
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, [page]);

  useFocusEffect(useCallback(() => { load(true); }, []));

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    load(false);
  }, [hasMore, loadingMore, load]);

  const renderItem = ({ item }) => {
    const style = ACTIVITY_ICON[item.activity] || DEFAULT_ACTIVITY;
    return (
      <View style={[styles.row, shadow.soft]}>
        <View style={[styles.iconWrap, { backgroundColor: style.bg }]}>
          <Ionicons name={style.icon} size={18} color={style.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actDesc} numberOfLines={2}>{item.description || item.activity.replace(/_/g, ' ')}</Text>
          {item.deviceName && item.deviceName !== 'unknown' && (
            <Text style={styles.actMeta}>{item.deviceName} · {item.ipAddress}</Text>
          )}
        </View>
        <Text style={styles.actTime}>{fmtDate(item.createdAt)}</Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={['#1E0A0A', '#5C1615']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.heroTitle}>Activity Log</Text>
        <Text style={styles.heroSub}>{total} events in the last 180 days</Text>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 32, gap: 8, maxWidth: 520, width: '100%', alignSelf: 'center' }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} colors={[colors.primary]} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={40} color={colors.textDisabled} />
              <Text style={styles.emptyText}>No activity recorded yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 28 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontFamily: fonts.heading, fontSize: 24, color: 'white' },
  heroSub:   { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 },

  row:      { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actDesc:  { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary, textTransform: 'capitalize' },
  actMeta:  { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  actTime:  { fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled, flexShrink: 0 },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText:  { fontFamily: fonts.body, fontSize: 14, color: colors.textDisabled },
});
