import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../lib/api';
import { colors, fonts, radius, shadow } from '../../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const fmtCurrency = (v) => {
  if (!v) return '₹0';
  if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '₹' + (v / 1000).toFixed(1) + 'K';
  return '₹' + v;
};

const pct = (v) => {
  if (!v && v !== 0) return '';
  const sign = v >= 0 ? '+' : '';
  return sign + v.toFixed(1) + '%';
};

function BarChart({ data = [], color = colors.primary }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={styles.chart}>
      <View style={styles.bars}>
        {data.map((d, i) => (
          <View key={i} style={styles.barItem}>
            <View
              style={[
                styles.bar,
                { height: Math.max(4, (d.value / max) * 120), backgroundColor: color },
              ]}
            />
            <Text style={styles.barLabel} numberOfLines={1}>{d.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [topTours, setTopTours] = useState([]);

  const load = useCallback(async (p) => {
    const activePeriod = p || period;
    try {
      const [sumRes, chartRes, occRes, toursRes] = await Promise.all([
        api.get('/analytics/dashboard-summary'),
        api.get('/analytics/revenue?period=' + activePeriod),
        api.get('/analytics/occupancy'),
        api.get('/analytics/tours?limit=5'),
      ]);
      setSummary(sumRes.data || sumRes);
      setChartData(
        (chartRes.data || chartRes || []).map(d => ({ label: d._id || d.label, value: d.revenue || d.total || 0 }))
      );
      setOccupancy((occRes.data || occRes || []).slice(0, 8));
      setTopTours((toursRes.data || toursRes || []).slice(0, 5));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [period]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const changePeriod = (p) => {
    setPeriod(p);
    setLoading(true);
    load(p);
  };

  const KPIS = [
    {
      label: 'Total Revenue',
      value: fmtCurrency(summary?.totalRevenue),
      sub: 'This month: ' + fmtCurrency(summary?.monthRevenue),
      icon: 'cash',
      color: '#16A34A',
      bg: '#DCFCE7',
    },
    {
      label: 'Bookings',
      value: summary?.totalBookings || 0,
      sub: summary?.monthlyGrowth != null ? pct(Number(summary.monthlyGrowth)) + ' MoM' : '',
      icon: 'calendar',
      color: '#2563EB',
      bg: '#DBEAFE',
    },
    {
      label: 'Tours',
      value: summary?.tourCount || 0,
      sub: 'Total created',
      icon: 'bus',
      color: '#7C3AED',
      bg: '#EDE9FE',
    },
    {
      label: 'This Month',
      value: fmtCurrency(summary?.monthRevenue),
      sub: 'Revenue',
      icon: 'trending-up',
      color: '#D97706',
      bg: '#FEF3C7',
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1E0A0A', '#5C1615']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Analytics</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 20 }}
        >
          {/* KPI Cards 2x2 */}
          <View style={styles.kpiGrid}>
            {KPIS.map(k => (
              <View key={k.label} style={[styles.kpiCard, shadow.soft, { backgroundColor: k.bg }]}>
                <View style={[styles.kpiIconWrap, { backgroundColor: k.color + '22' }]}>
                  <Ionicons name={k.icon} size={18} color={k.color} />
                </View>
                <Text style={[styles.kpiValue, { color: k.color }]}>{String(k.value)}</Text>
                <Text style={styles.kpiLabel}>{k.label}</Text>
                {k.sub ? <Text style={styles.kpiGrowth}>{k.sub}</Text> : null}
              </View>
            ))}
          </View>

          {/* Revenue chart */}
          <View style={[styles.section, shadow.soft]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Revenue Trend</Text>
              <View style={styles.periodTabs}>
                {['week', 'month', 'year'].map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodTab, period === p && styles.periodTabActive]}
                    onPress={() => changePeriod(p)}
                  >
                    <Text style={[styles.periodTabText, period === p && styles.periodTabTextActive]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {chartData.length > 0 ? (
              <BarChart data={chartData} color={colors.primary} />
            ) : (
              <View style={styles.noData}>
                <Text style={styles.noDataText}>No data for this period</Text>
              </View>
            )}
          </View>

          {/* Top tours by occupancy */}
          {occupancy.length > 0 && (
            <View style={[styles.section, shadow.soft]}>
              <Text style={styles.sectionTitle}>Tour Occupancy</Text>
              {occupancy.map((t, i) => (
                <View key={t._id || i} style={styles.occRow}>
                  <Text style={styles.occRank}>#{i + 1}</Text>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.occTour} numberOfLines={1}>{t.title || 'Tour'}</Text>
                    <View style={styles.occBarBg}>
                      <View
                        style={[
                          styles.occBarFill,
                          {
                            width: (t.occupancyRate || 0) + '%',
                            backgroundColor:
                              t.occupancyRate > 80
                                ? '#16A34A'
                                : t.occupancyRate > 50
                                ? '#D97706'
                                : '#DC2626',
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.occPct}>{(t.occupancyRate || 0).toFixed(0)}%</Text>
                </View>
              ))}
            </View>
          )}

          {/* Top performing tours */}
          {topTours.length > 0 && (
            <View style={[styles.section, shadow.soft]}>
              <Text style={styles.sectionTitle}>Top Tours by Revenue</Text>
              {topTours.map((t, i) => (
                <View key={t._id || i} style={styles.tourRow}>
                  <View style={[styles.tourRankBadge, { backgroundColor: i === 0 ? '#FDE68A' : colors.borderSubtle }]}>
                    <Text style={[styles.tourRankTxt, { color: i === 0 ? '#D97706' : colors.textSecondary }]}>#{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tourRowTitle} numberOfLines={1}>{t.title || 'Tour'}</Text>
                    <Text style={styles.tourRowMeta}>{t.totalBookings || 0} bookings · {fmtCurrency(t.revenue || t.totalRevenue || 0)}</Text>
                  </View>
                  <Text style={[styles.occPct, { color: colors.primary }]}>{fmtCurrency(t.revenue || t.totalRevenue || 0)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Quick actions */}
          <View style={[styles.section, shadow.soft]}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: 'All Bookings', icon: 'ticket', route: '/admin/bookings', color: '#2563EB', bg: '#DBEAFE' },
                { label: 'My Tours', icon: 'bus', route: '/admin/tours', color: '#7C3AED', bg: '#EDE9FE' },
                { label: 'Members', icon: 'people', route: '/admin/members', color: '#16A34A', bg: '#DCFCE7' },
                { label: 'Enquiries', icon: 'chatbubble', route: '/admin/enquiries', color: '#D97706', bg: '#FEF3C7' },
              ].map(a => (
                <TouchableOpacity
                  key={a.label}
                  style={[styles.actionBtn, { backgroundColor: a.bg }]}
                  onPress={() => router.push(a.route)}
                >
                  <Ionicons name={a.icon} size={16} color={a.color} />
                  <Text style={[styles.actionBtnTxt, { color: a.color }]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
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
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontFamily: 'Philosopher_700Bold', fontSize: 22, color: 'white' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: { width: '47%', borderRadius: radius.xl, padding: 14, gap: 6 },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: { fontFamily: fonts.bodyBold, fontSize: 24 },
  kpiLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  kpiGrowth: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  section: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16, gap: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  periodTabs: { flexDirection: 'row', gap: 4 },
  periodTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: '#F3F4F6',
  },
  periodTabActive: { backgroundColor: colors.primary },
  periodTabText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  periodTabTextActive: { color: 'white' },
  chart: { paddingTop: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 140 },
  barItem: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '70%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barLabel: { fontFamily: fonts.body, fontSize: 9, color: colors.textSecondary },
  noData: { alignItems: 'center', paddingVertical: 24 },
  noDataText: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  occRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  occRank: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textSecondary,
    width: 24,
  },
  occTour: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  occBarBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  occBarFill: { height: '100%', borderRadius: 3 },
  occPct: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
    width: 36,
    textAlign: 'right',
  },
  tourRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  tourRankBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tourRankTxt: { fontFamily: fonts.bodyBold, fontSize: 12 },
  tourRowTitle: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  tourRowMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg },
  actionBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 13 },
});
