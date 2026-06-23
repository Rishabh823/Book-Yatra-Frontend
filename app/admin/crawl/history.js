import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, useWindowDimensions, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { AdminShell, SectionHeader } from '../../../lib/AdminScreen';
import { colors, fonts } from '../../../lib/theme';
import { crawlApi } from '../../../lib/api';

const STATUS = {
  success:  { icon: 'checkmark-circle', color: '#16A34A', bg: '#F0FDF4' },
  failed:   { icon: 'close-circle',     color: '#DC2626', bg: '#FEF2F2' },
  running:  { icon: 'sync',             color: '#2563EB', bg: '#EFF6FF' },
  pending:  { icon: 'time',             color: '#D97706', bg: '#FFFBEB' },
  cancelled:{ icon: 'remove-circle',    color: '#6B7280', bg: '#F3F4F6' },
};

const FILTER_OPTS = ['all', 'success', 'failed', 'running', 'pending'];

function fmtDuration(ms) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

export default function CrawlHistory() {
  const { width } = useWindowDimensions();
  const px = width >= 600 ? 24 : 16;

  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [detailJob, setDetailJob] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async (p = 1, f = filter) => {
    try {
      const params = { page: p, limit: 20 };
      if (f !== 'all') params.status = f;
      const res = await crawlApi.getJobs(params);
      if (p === 1) setJobs(res.data || []);
      else setJobs(prev => [...prev, ...(res.data || [])]);
      setTotal(res.total || 0);
      setPage(p);
    } catch {}
    finally { setLoading(false); }
  }, [filter]);

  useFocusEffect(useCallback(() => { load(1, filter); }, [filter]));
  const onRefresh = async () => { setRefreshing(true); await load(1, filter); setRefreshing(false); };

  async function openDetail(job) {
    setDetailJob(job);
    setDetailLoading(true);
    try {
      const res = await crawlApi.getJob(job._id);
      setDetailJob(res.data);
    } catch {}
    finally { setDetailLoading(false); }
  }

  return (
    <AdminShell title="Crawl History" subtitle="All crawl job runs">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: px, paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: px }}>
            {FILTER_OPTS.map(f => (
              <TouchableOpacity
                key={f}
                style={[s.filterChip, filter === f && s.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: px }}>
          <SectionHeader title={`${total} jobs total`} />

          {loading ? (
            <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
          ) : jobs.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="time-outline" size={40} color="#D1D5DB" />
              <Text style={s.emptyTxt}>No crawl jobs yet</Text>
            </View>
          ) : (
            jobs.map((job) => {
              const st = STATUS[job.status] || STATUS.pending;
              return (
                <TouchableOpacity key={job._id} style={s.card} onPress={() => openDetail(job)} activeOpacity={0.82}>
                  <View style={s.cardHead}>
                    <View style={[s.statusIcon, { backgroundColor: st.bg }]}>
                      <Ionicons name={st.icon} size={18} color={st.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sourceName} numberOfLines={1}>
                        {job.sourceId?.name || job.sourceName || '—'}
                      </Text>
                      <Text style={s.timestamp}>{fmtDate(job.startedAt || job.createdAt)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 3 }}>
                      <View style={[s.badge, { backgroundColor: st.bg }]}>
                        <Text style={[s.badgeTxt, { color: st.color }]}>{job.status}</Text>
                      </View>
                      <Text style={s.duration}>{fmtDuration(job.durationMs)}</Text>
                    </View>
                  </View>

                  <View style={s.counts}>
                    <Count label="Found" value={job.totalFound ?? 0} color="#6B7280" />
                    <Count label="New" value={job.importedCount ?? 0} color="#16A34A" />
                    <Count label="Updated" value={job.updatedCount ?? 0} color="#0284C7" />
                    <Count label="Skipped" value={job.skippedCount ?? 0} color="#9CA3AF" />
                    <Count label="Failed" value={job.failedCount ?? 0} color="#DC2626" />
                  </View>

                  {job.status === 'failed' && job.errorMessage && (
                    <View style={s.errRow}>
                      <Ionicons name="warning-outline" size={12} color="#DC2626" />
                      <Text style={s.errTxt} numberOfLines={1}>{job.errorMessage}</Text>
                    </View>
                  )}

                  <View style={s.cardFoot}>
                    <View style={s.trigBadge}>
                      <Ionicons name={job.triggeredBy === 'manual' ? 'person-outline' : 'alarm-outline'} size={11} color="#6B7280" />
                      <Text style={s.trigTxt}>{job.triggeredBy}</Text>
                    </View>
                    <Text style={s.pagesScraped}>{job.pagesScraped ?? 0} pages</Text>
                    <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {jobs.length < total && !loading && (
            <TouchableOpacity style={s.loadMore} onPress={() => load(page + 1, filter)}>
              <Text style={s.loadMoreTxt}>Load more</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!detailJob} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={s.mHeader}>
            <TouchableOpacity onPress={() => setDetailJob(null)} style={s.mClose}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
            <Text style={s.mTitle}>Job Detail</Text>
          </View>

          {detailLoading ? (
            <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
          ) : detailJob && (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
              <View style={s.detailCard}>
                <DetailRow label="Source" value={detailJob.sourceId?.name || detailJob.sourceName || '—'} />
                <DetailRow label="Status" value={detailJob.status} />
                <DetailRow label="Triggered By" value={detailJob.triggeredBy} />
                <DetailRow label="Started" value={fmtDate(detailJob.startedAt)} />
                <DetailRow label="Completed" value={fmtDate(detailJob.completedAt)} />
                <DetailRow label="Duration" value={fmtDuration(detailJob.durationMs)} />
                <DetailRow label="Pages Scraped" value={String(detailJob.pagesScraped ?? 0)} />
                <DetailRow label="Found" value={String(detailJob.totalFound ?? 0)} />
                <DetailRow label="Imported" value={String(detailJob.importedCount ?? 0)} />
                <DetailRow label="Updated" value={String(detailJob.updatedCount ?? 0)} />
                <DetailRow label="Skipped" value={String(detailJob.skippedCount ?? 0)} />
                <DetailRow label="Failed" value={String(detailJob.failedCount ?? 0)} last />
              </View>

              {detailJob.logs?.length > 0 && (
                <>
                  <Text style={s.logsTitle}>Logs</Text>
                  <View style={s.logsBox}>
                    {detailJob.logs.map((log, i) => (
                      <View key={i} style={s.logLine}>
                        <Text style={[s.logLevel, { color: log.level === 'error' ? '#DC2626' : log.level === 'warn' ? '#D97706' : '#6B7280' }]}>
                          [{log.level?.toUpperCase()}]
                        </Text>
                        <Text style={s.logMsg}>{log.message}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </AdminShell>
  );
}

function Count({ label, value, color }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[s.countVal, { color }]}>{value}</Text>
      <Text style={s.countLabel}>{label}</Text>
    </View>
  );
}

function DetailRow({ label, value, last }) {
  return (
    <View style={[s.dRow, last && { borderBottomWidth: 0 }]}>
      <Text style={s.dLabel}>{label}</Text>
      <Text style={s.dValue}>{value || '—'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { paddingTop: 60, alignItems: 'center' },
  empty:  { paddingTop: 60, alignItems: 'center', gap: 12 },
  emptyTxt:{ fontFamily: fonts.body, fontSize: 14, color: '#9CA3AF' },

  filterChip:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  filterChipActive:{ backgroundColor: '#FEF3F0', borderColor: '#D95D39' },
  filterTxt:      { fontFamily: fonts.bodyMedium, fontSize: 12, color: '#6B7280', textTransform: 'capitalize' },
  filterTxtActive:{ color: '#D95D39', fontFamily: fonts.bodyBold },

  card:       { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, marginBottom: 10 },
  cardHead:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  statusIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sourceName: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#111827' },
  timestamp:  { fontFamily: fonts.body, fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeTxt:   { fontFamily: fonts.bodyBold, fontSize: 10, textTransform: 'capitalize' },
  duration:   { fontFamily: fonts.body, fontSize: 10, color: '#9CA3AF' },

  counts:     { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F2F2F2', paddingTop: 10, marginBottom: 8 },
  countVal:   { fontFamily: fonts.heading, fontSize: 16 },
  countLabel: { fontFamily: fonts.body, fontSize: 9, color: '#9CA3AF', marginTop: 1 },

  errRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8, marginBottom: 8 },
  errTxt:     { fontFamily: fonts.body, fontSize: 11, color: '#DC2626', flex: 1 },

  cardFoot:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#F2F2F2', paddingTop: 8 },
  trigBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  trigTxt:    { fontFamily: fonts.body, fontSize: 10, color: '#6B7280', textTransform: 'capitalize' },
  pagesScraped:{ fontFamily: fonts.body, fontSize: 10, color: '#9CA3AF', flex: 1 },

  loadMore:    { paddingVertical: 14, alignItems: 'center' },
  loadMoreTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },

  mHeader:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  mClose:   { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F4F4', alignItems: 'center', justifyContent: 'center' },
  mTitle:   { flex: 1, fontFamily: fonts.heading, fontSize: 18, color: '#111827', marginLeft: 12 },

  detailCard:{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  dRow:     { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  dLabel:   { fontFamily: fonts.bodyBold, fontSize: 12, color: '#6B7280' },
  dValue:   { fontFamily: fonts.body, fontSize: 12, color: '#111827', maxWidth: '60%', textAlign: 'right' },

  logsTitle:  { fontFamily: fonts.bodyBold, fontSize: 10, color: '#9CA3AF', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  logsBox:    { backgroundColor: '#0A0A0A', borderRadius: 10, padding: 12 },
  logLine:    { flexDirection: 'row', gap: 6, marginBottom: 4 },
  logLevel:   { fontFamily: 'monospace', fontSize: 10, width: 60 },
  logMsg:     { fontFamily: 'monospace', fontSize: 10, color: '#D1D5DB', flex: 1, flexWrap: 'wrap' },
});
