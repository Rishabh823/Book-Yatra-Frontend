import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { colors, fonts } from '../../lib/theme';
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";

const fmtTime = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d);
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  return Math.floor(diff / 3600000) + 'h ago';
};

export default function LiveDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [trackings, setTrackings] = useState([]);
  const [activeSOS, setActiveSOS] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = React.useRef(null);
  const { toast, showToast, hideToast } = useToast();

  const load = useCallback(async () => {
    try {
      const [trackRes, sosRes] = await Promise.all([
        api.get('/tracking/active').catch(() => ({ data: [] })),
        api.get('/sos/active').catch(() => ({ data: [] })),
      ]);
      setTrackings(trackRes.data || []);
      setActiveSOS(sosRes.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 30000);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  const acknowledgeSOS = async (id) => {
    try {
      await api.put('/sos/' + id + '/acknowledge', {});
      setActiveSOS(prev => prev.map(s => s._id === id ? { ...s, status: 'acknowledged' } : s));
    } catch { showToast('Failed to acknowledge', "error"); }
  };

  const STATS = [
    { label: 'Active Tours', value: trackings.length, icon: 'bus', color: '#16A34A', bg: '#DCFCE7' },
    { label: 'Active SOS', value: activeSOS.filter(s => s.status === 'active').length, icon: 'alert-circle', color: '#DC2626', bg: '#FEE2E2' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Live Dashboard</Text>
          <Text style={styles.subtitle}>Auto-refreshes every 30s</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={load}>
          <Ionicons name="refresh" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 20 }}>
          <View style={styles.statsRow}>
            {STATS.map(s => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={24} color={s.color} />
                <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: s.color }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Active SOS Alerts */}
          {activeSOS.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>🚨 Active SOS Alerts ({activeSOS.length})</Text>
              {activeSOS.map(sos => (
                <View key={sos._id} style={styles.sosCard}>
                  <View style={styles.sosCardHeader}>
                    <View style={styles.sosIcon}><Ionicons name="alert-circle" size={20} color="white" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sosUser}>{sos.userId?.name || 'Unknown User'}</Text>
                      <Text style={styles.sosMeta}>{sos.type} • {fmtTime(sos.createdAt)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: sos.status === 'active' ? '#FEE2E2' : '#FEF3C7' }]}>
                      <Text style={[styles.statusText, { color: sos.status === 'active' ? '#DC2626' : '#D97706' }]}>{sos.status}</Text>
                    </View>
                  </View>
                  {sos.message && <Text style={styles.sosMsg} numberOfLines={2}>{sos.message}</Text>}
                  <View style={styles.sosActions}>
                    <TouchableOpacity style={styles.viewBtn} onPress={() => router.push('/sos/active?sosId=' + sos._id)}>
                      <Text style={styles.viewBtnText}>View</Text>
                    </TouchableOpacity>
                    {sos.status === 'active' && (
                      <TouchableOpacity style={styles.ackBtn} onPress={() => acknowledgeSOS(sos._id)}>
                        <Text style={styles.ackBtnText}>Acknowledge</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Active Trackings */}
          <View>
            <Text style={styles.sectionTitle}>🚌 Active Tours ({trackings.length})</Text>
            {trackings.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="bus-outline" size={32} color={colors.textDisabled} />
                <Text style={styles.emptyText}>No active tours right now</Text>
              </View>
            ) : trackings.map(t => (
              <View key={t._id} style={styles.trackCard}>
                <View style={styles.trackHeader}>
                  <View style={styles.trackIcon}><Ionicons name="bus" size={18} color="white" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trackTour} numberOfLines={1}>{t.tourId?.title || 'Tour'}</Text>
                    <Text style={styles.trackMeta}>{t.tourId?.source} → {t.tourId?.destination}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.statusText, { color: '#16A34A' }]}>Live</Text>
                  </View>
                </View>
                {t.currentLocation?.address && <Text style={styles.trackLocation} numberOfLines={1}>📍 {t.currentLocation.address}</Text>}
                <TouchableOpacity style={styles.viewMapBtn} onPress={() => router.push('/live-tracking?tourId=' + t.tourId?._id)}>
                  <Ionicons name="map" size={14} color={colors.primary} />
                  <Text style={styles.viewMapText}>View on Map</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: 'Philosopher_700Bold', fontSize: 20, color: colors.textPrimary },
  subtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statVal: { fontFamily: fonts.bodyBold, fontSize: 28 },
  statLabel: { fontFamily: fonts.body, fontSize: 12, textAlign: 'center' },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary, marginBottom: 10 },
  sosCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    gap: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  sosCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sosIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  sosUser: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  sosMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  sosMsg: { fontFamily: fonts.body, fontSize: 13, color: colors.textPrimary },
  sosActions: { flexDirection: 'row', gap: 8 },
  viewBtn: { flex: 1, paddingVertical: 8, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center' },
  viewBtnText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  ackBtn: { flex: 1, paddingVertical: 8, borderRadius: 16, backgroundColor: '#FFFBEB', alignItems: 'center' },
  ackBtnText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: '#D97706' },
  trackCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    gap: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  trackHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trackIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  trackTour: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  trackMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  trackLocation: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  viewMapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewMapText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
});
