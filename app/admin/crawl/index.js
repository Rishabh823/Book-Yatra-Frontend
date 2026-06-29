import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { AdminShell, SectionHeader } from '../../../lib/AdminScreen';
import { fonts } from '../../../lib/theme';
import { crawlApi } from '../../../lib/api';
import { useColors } from '../../../lib/ThemeContext';

const STATUS_COLOR = {
  success:  { bg: '#16A34A18', text: '#16A34A' },
  failed:   { bg: '#DC262618', text: '#DC2626' },
  running:  { bg: '#2563EB18', text: '#2563EB' },
  pending:  { bg: '#D9770618', text: '#D97706' },
  cancelled:{ bg: '#6B728018', text: '#6B7280' },
};

export default function CrawlDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const px = width >= 600 ? 24 : 16;
  const themeColors = useColors();
  const s = useMemo(() => makeStyles(themeColors), [themeColors]);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await crawlApi.getStats();
      setStats(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const QUICK = [
    { icon: 'globe-outline',    label: 'Sources',        route: '/admin/crawl/sources',  color: '#7C3AED' },
    { icon: 'time-outline',     label: 'History',        route: '/admin/crawl/history',  color: '#0284C7' },
    { icon: 'layers-outline',   label: 'Review Tours',   route: '/admin/crawl/imported', color: '#D95D39' },
  ];

  return (
    <AdminShell title="Tour Aggregator" subtitle="Auto crawling dashboard">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{ paddingHorizontal: px, paddingTop: 4 }}>
          <View style={s.hero}>
            <View style={s.heroRow}>
              <View style={s.heroLeft}>
                <Text style={s.heroLabel}>ACTIVE SOURCES</Text>
                {loading ? (
                  <ActivityIndicator color={themeColors.primary} />
                ) : (
                  <Text style={s.heroValue}>{stats?.sources?.active ?? 0}</Text>
                )}
                <Text style={s.heroSub}>of {stats?.sources?.total ?? 0} total sources</Text>
              </View>
              <View style={s.heroRight}>
                <View style={s.heroPill}>
                  <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                  <Text style={[s.heroPillTxt, { color: '#16A34A' }]}>{stats?.jobs?.success ?? 0} jobs done</Text>
                </View>
                <View style={[s.heroPill, { backgroundColor: '#D9770618' }]}>
                  <Ionicons name="time" size={13} color="#D97706" />
                  <Text style={[s.heroPillTxt, { color: '#D97706' }]}>{stats?.tours?.pending ?? 0} pending review</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        {!loading && stats && (
          <View style={{ paddingHorizontal: px, marginTop: 16 }}>
            <View style={s.statRow}>
              <StatCard icon="globe" label="Total Sources" value={stats.sources.total} color="#7C3AED" />
              <StatCard icon="layers" label="Imported Tours" value={stats.tours.imported} color="#16A34A" />
              <StatCard icon="alert-circle" label="Pending Review" value={stats.tours.pending} color="#D95D39" />
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: px, marginTop: 20 }}>
          <SectionHeader title="Quick Access" action="All Sources" onAction={() => router.push('/admin/crawl/sources')} />
          <View style={s.quickRow}>
            {QUICK.map((q, i) => (
              <TouchableOpacity key={i} style={s.quickCard} onPress={() => router.push(q.route)} activeOpacity={0.8}>
                <View style={[s.quickIcon, { backgroundColor: q.color + '18' }]}>
                  <Ionicons name={q.icon} size={24} color={q.color} />
                </View>
                <Text style={s.quickLabel}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Jobs */}
        {!loading && stats?.recentJobs?.length > 0 && (
          <View style={{ paddingHorizontal: px, marginTop: 20 }}>
            <SectionHeader title="Recent Crawl Jobs" action="View all" onAction={() => router.push('/admin/crawl/history')} />
            {stats.recentJobs.map((job, i) => {
              const sc = STATUS_COLOR[job.status] || STATUS_COLOR.pending;
              return (
                <TouchableOpacity
                  key={job._id || i}
                  style={s.jobRow}
                  onPress={() => router.push(`/admin/crawl/history?jobId=${job._id}`)}
                  activeOpacity={0.82}
                >
                  <View style={[s.jobDot, { backgroundColor: sc.bg }]}>
                    <Ionicons
                      name={job.status === 'success' ? 'checkmark' : job.status === 'failed' ? 'close' : 'time'}
                      size={14}
                      color={sc.text}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.jobName} numberOfLines={1}>{job.sourceId?.name || job.sourceName || '—'}</Text>
                    <Text style={s.jobMeta}>
                      {job.importedCount ?? 0} new · {job.updatedCount ?? 0} updated · {job.triggeredBy}
                    </Text>
                  </View>
                  <View style={[s.jobStatus, { backgroundColor: sc.bg }]}>
                    <Text style={[s.jobStatusTxt, { color: sc.text }]}>{job.status}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* How It Works */}
        <View style={{ paddingHorizontal: px, marginTop: 24 }}>
          <SectionHeader title="How It Works" />
          {[
            { icon: 'globe-outline',      color: '#7C3AED', title: 'Add Sources',    desc: 'Configure websites to crawl with CSS selectors' },
            { icon: 'sync-outline',       color: '#0284C7', title: 'Auto Crawl',     desc: 'BullMQ + cron runs scraper every hour automatically' },
            { icon: 'shield-checkmark',   color: '#D95D39', title: 'Review & Approve', desc: 'Admin reviews found tours before they go live' },
            { icon: 'link-outline',       color: '#16A34A', title: 'External Booking', desc: 'Users redirect to partner site — your platform aggregates' },
          ].map((item, i) => (
            <View key={i} style={s.howRow}>
              <View style={[s.howIcon, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.howTitle}>{item.title}</Text>
                <Text style={s.howDesc}>{item.desc}</Text>
              </View>
              <View style={s.howNum}>
                <Text style={s.howNumTxt}>{i + 1}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </AdminShell>
  );
}

function StatCard({ icon, label, value, color }) {
  const themeColors = useColors();
  const s = useMemo(() => makeStyles(themeColors), [themeColors]);
  return (
    <View style={[s.statCard, { borderLeftColor: color }]}>
      <View style={[s.statIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[s.statValue, { color }]}>{value ?? 0}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  hero: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 16,
    padding: 18,
  },
  heroRow:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLeft: { flex: 1 },
  heroRight:{ alignItems: 'flex-end', gap: 6 },
  heroLabel:{ fontFamily: fonts.bodyBold, fontSize: 10, color: colors.textDisabled, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  heroValue:{ fontFamily: fonts.heading, fontSize: 48, color: colors.textPrimary, letterSpacing: -1 },
  heroSub:  { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#16A34A18', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  heroPillTxt:{ fontFamily: fonts.bodyBold, fontSize: 11 },

  statRow:  { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.borderSubtle, borderLeftWidth: 3, gap: 4 },
  statIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue:{ fontFamily: fonts.heading, fontSize: 20 },
  statLabel:{ fontFamily: fonts.body, fontSize: 10, color: colors.textSecondary },

  quickRow: { flexDirection: 'row', gap: 10 },
  quickCard:{ flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle, padding: 16, gap: 8 },
  quickIcon:{ width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel:{ fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textPrimary, textAlign: 'center' },

  jobRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle, padding: 12, marginBottom: 8 },
  jobDot:   { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  jobName:  { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  jobMeta:  { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  jobStatus:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  jobStatusTxt:{ fontFamily: fonts.bodyBold, fontSize: 10, textTransform: 'capitalize' },

  howRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle, padding: 14, marginBottom: 8 },
  howIcon:  { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  howTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  howDesc:  { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  howNum:   { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  howNumTxt:{ fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textSecondary },
});
