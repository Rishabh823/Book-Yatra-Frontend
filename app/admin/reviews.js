import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, ScrollView, TextInput,
  Animated, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, fonts, radius, shadow } from '../../lib/theme';
import { reviews as reviewsApi, auth as authApi } from '../../lib/api';
import { fmtDate } from '../../lib/utils';

const FILTERS = ['all', 'pending', 'approved', 'rejected'];

const STATUS_CONFIG = {
  pending:  { color: '#D97706', bg: '#FFFBEB', label: 'Pending'  },
  approved: { color: '#16A34A', bg: '#F0FDF4', label: 'Approved' },
  rejected: { color: '#DC2626', bg: '#FEF2F2', label: 'Rejected' },
};

// ─── Utility helpers ──────────────────────────────────────────────────────────

function StarRow({ rating, size = 13 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Ionicons
          key={n}
          name="star"
          size={size}
          color={n <= (rating || 0) ? '#F59E0B' : colors.borderSubtle}
        />
      ))}
    </View>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { color: colors.textSecondary, bg: colors.surface, label: status || '—' };
  return (
    <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
      <View style={[s.statusDot, { backgroundColor: cfg.color }]} />
      <Text style={[s.statusTxt, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({ item, onApprove, onReject, onViewTour }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  const tourName    = item.tour?.name || item.tourName || 'Unknown Tour';
  const operator    = item.tour?.operatorName || item.operatorName || '';
  const reviewerName = item.user?.name || item.reviewerName || 'Anonymous';
  const initial     = reviewerName.charAt(0).toUpperCase();
  const status      = item.status || 'pending';

  const toggleReject = () => {
    const toVal = rejecting ? 0 : 1;
    setRejecting(!rejecting);
    Animated.timing(expandAnim, {
      toValue: toVal,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleApprove = async () => {
    setBusy(true);
    await onApprove(item._id);
    setBusy(false);
  };

  const handleConfirmReject = async () => {
    setBusy(true);
    await onReject(item._id, note.trim());
    setBusy(false);
    setRejecting(false);
    setNote('');
    Animated.timing(expandAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };

  const expandHeight = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 110] });

  return (
    <View style={s.card}>
      {/* Tour info */}
      <View style={s.cardTourRow}>
        <View style={s.tourIconWrap}>
          <Ionicons name="bus" size={14} color={colors.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.tourName} numberOfLines={1}>{tourName}</Text>
          {!!operator && <Text style={s.operatorTxt} numberOfLines={1}>{operator}</Text>}
        </View>
        <StatusBadge status={status} />
      </View>

      {/* Reviewer row */}
      <View style={s.reviewerRow}>
        <View style={s.avatarCircle}>
          <Text style={s.avatarLetter}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.reviewerName}>{reviewerName}</Text>
          <StarRow rating={item.rating} />
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {item.isVerifiedBooking && (
            <View style={s.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={10} color="#16A34A" />
              <Text style={s.verifiedTxt}>Verified Booking</Text>
            </View>
          )}
          <Text style={s.dateTxt}>{fmtDate(item.createdAt)}</Text>
        </View>
      </View>

      {/* Review content */}
      {!!item.title && <Text style={s.reviewTitle}>{item.title}</Text>}
      {!!item.body && (
        <Text style={s.reviewBody} numberOfLines={2}>{item.body}</Text>
      )}

      {/* Admin note (if previously rejected) */}
      {status === 'rejected' && !!item.adminNote && (
        <View style={s.adminNoteWrap}>
          <Ionicons name="information-circle-outline" size={12} color="#DC2626" />
          <Text style={s.adminNoteTxt} numberOfLines={2}>{item.adminNote}</Text>
        </View>
      )}

      {/* Rejection input (expandable) */}
      <Animated.View style={[s.rejectExpand, { height: expandHeight, overflow: 'hidden' }]}>
        <TextInput
          style={s.noteInput}
          placeholder="Reason for rejection (optional)..."
          placeholderTextColor={colors.textDisabled}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={300}
        />
        <View style={s.rejectConfirmRow}>
          <TouchableOpacity style={s.cancelBtn} onPress={toggleReject} disabled={busy}>
            <Text style={s.cancelBtnTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.confirmRejectBtn} onPress={handleConfirmReject} disabled={busy}>
            {busy
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.confirmRejectTxt}>Confirm Reject</Text>
            }
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Action buttons */}
      <View style={s.actionRow}>
        {status !== 'approved' && (
          <TouchableOpacity
            style={[s.actionBtn, s.approveBtn]}
            onPress={handleApprove}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                  <Text style={s.actionBtnTxt}>Approve</Text>
                </>
            }
          </TouchableOpacity>
        )}
        {status !== 'rejected' && !rejecting && (
          <TouchableOpacity
            style={[s.actionBtn, s.rejectBtn]}
            onPress={toggleReject}
            disabled={busy}
          >
            <Ionicons name="close" size={14} color="#fff" />
            <Text style={s.actionBtnTxt}>Reject</Text>
          </TouchableOpacity>
        )}
        {item.tourId || item.tour?._id ? (
          <TouchableOpacity
            style={[s.actionBtn, s.viewTourBtn]}
            onPress={() => onViewTour(item.tourId || item.tour?._id)}
          >
            <Ionicons name="eye-outline" size={14} color={colors.secondary} />
            <Text style={[s.actionBtnTxt, { color: colors.secondary }]}>View Tour</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminReviews() {
  const router = useRouter();
  const [role, setRole]           = useState('user');
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [error, setError]         = useState(null);

  // Auth guard
  useEffect(() => { authApi.getRole().then(r => setRole(r || 'user')); }, []);

  const isAdmin = role === 'admin' || role === 'manager' || role === 'super_admin';

  const load = async () => {
    setError(null);
    try {
      const res = await reviewsApi.adminList({ status: 'all', limit: 100 });
      // Backend may return { data: [...] } or array directly
      const arr = Array.isArray(res) ? res : (res?.data || res?.reviews || []);
      setItems(arr);
    } catch (e) {
      if (e?.status === 404) {
        setError('The reviews admin endpoint is not available yet.\nPlease check back after the backend is updated.');
      } else {
        setError(e?.message || 'Failed to load reviews. Pull down to retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  // Client-side filter
  const filtered = useMemo(() => {
    if (activeFilter === 'all') return items;
    return items.filter(it => (it.status || 'pending') === activeFilter);
  }, [items, activeFilter]);

  // Stats
  const stats = useMemo(() => {
    const pending  = items.filter(it => (it.status || 'pending') === 'pending').length;
    const approved = items.filter(it => it.status === 'approved').length;
    const rejected = items.filter(it => it.status === 'rejected').length;
    return { total: items.length, pending, approved, rejected };
  }, [items]);

  // Optimistic update helpers
  const handleApprove = useCallback(async (id) => {
    const prev = [...items];
    setItems(cur => cur.map(it => it._id === id ? { ...it, status: 'approved' } : it));
    try {
      await reviewsApi.moderate(id, { status: 'approved' });
    } catch {
      setItems(prev);
    }
  }, [items]);

  const handleReject = useCallback(async (id, adminNote) => {
    const prev = [...items];
    setItems(cur => cur.map(it => it._id === id ? { ...it, status: 'rejected', adminNote } : it));
    try {
      await reviewsApi.moderate(id, { status: 'rejected', adminNote });
    } catch {
      setItems(prev);
    }
  }, [items]);

  const handleViewTour = useCallback((tourId) => {
    if (tourId) router.push(`/tour/${tourId}`);
  }, [router]);

  // ── Access denied ─────────────────────────────────────────────────────────
  if (!loading && !isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }} edges={['top']}>
        <View style={s.lockIcon}>
          <Ionicons name="lock-closed-outline" size={32} color={colors.primary} />
        </View>
        <Text style={s.lockTitle}>Access Restricted</Text>
        <Text style={s.lockSub}>This section is for admins and managers only.</Text>
        <TouchableOpacity style={s.lockBack} onPress={() => router.back()}>
          <Text style={s.lockBackTxt}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Header gradient ────────────────────────────────────────────────────────
  const headerEl = (
    <LinearGradient colors={['#1E0A0A', '#5C1615']} style={s.header}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
        <Ionicons name="arrow-back" size={20} color="#FFE9C0" />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={s.headerTitle}>Reviews</Text>
        <Text style={s.headerSubtitle}>
          {loading ? 'Loading…' : `${items.length} review${items.length !== 1 ? 's' : ''}`}
        </Text>
      </View>
      <View style={s.headerBadge}>
        <Ionicons name="star-half" size={13} color="#F59E0B" />
        <Text style={s.headerBadgeTxt}>Moderation</Text>
      </View>
    </LinearGradient>
  );

  // ── Stats banner ───────────────────────────────────────────────────────────
  const statsEl = !loading && !error && items.length > 0 && (
    <View style={s.statsBanner}>
      {[
        { label: 'Total',    value: stats.total,    color: colors.secondary },
        { label: 'Pending',  value: stats.pending,  color: '#D97706' },
        { label: 'Approved', value: stats.approved, color: '#16A34A' },
        { label: 'Rejected', value: stats.rejected, color: '#DC2626' },
      ].map(({ label, value, color }) => (
        <View key={label} style={s.statItem}>
          <Text style={[s.statValue, { color }]}>{value}</Text>
          <Text style={s.statLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );

  // ── Filter tabs ────────────────────────────────────────────────────────────
  const filtersEl = !loading && !error && (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ paddingHorizontal: 16, marginBottom: 8 }}
      contentContainerStyle={{ gap: 8 }}
    >
      {FILTERS.map(f => {
        const isActive = activeFilter === f;
        const cfg = STATUS_CONFIG[f];
        return (
          <TouchableOpacity
            key={f}
            style={[s.filterPill, isActive && { backgroundColor: (cfg?.color || colors.secondary) + '18', borderColor: cfg?.color || colors.secondary }]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[s.filterTxt, isActive && { color: cfg?.color || colors.secondary, fontFamily: fonts.bodyBold }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
            {f !== 'all' && (
              <View style={[s.filterCount, { backgroundColor: (cfg?.color || colors.secondary) + (isActive ? '22' : '12') }]}>
                <Text style={[s.filterCountTxt, { color: cfg?.color || colors.secondary }]}>
                  {f === 'pending' ? stats.pending : f === 'approved' ? stats.approved : stats.rejected}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {headerEl}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={s.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textDisabled} />
          <Text style={s.errorTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => { setLoading(true); load(); }}>
            <Text style={s.retryBtnTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {statsEl}
          {filtersEl}

          <FlatList
            data={filtered}
            keyExtractor={it => String(it._id)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Ionicons name="star-outline" size={52} color={colors.textDisabled} />
                <Text style={s.emptyTitle}>No {activeFilter !== 'all' ? activeFilter : ''} reviews</Text>
                <Text style={s.emptySub}>
                  {activeFilter === 'pending'
                    ? 'All caught up! No reviews awaiting moderation.'
                    : 'No reviews match this filter.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <ReviewCard
                item={item}
                onApprove={handleApprove}
                onReject={handleReject}
                onViewTour={handleViewTour}
              />
            )}
          />
        </>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Access denied
  lockIcon:    { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  lockTitle:   { fontFamily: fonts.heading, fontSize: 22, color: colors.secondary, marginTop: 14, marginBottom: 8 },
  lockSub:     { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  lockBack:    { marginTop: 24, backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: radius.pill },
  lockBackTxt: { color: '#fff', fontFamily: fonts.bodyBold },

  // Header
  header:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 12 : 8, paddingBottom: 16 },
  backBtn:       { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,233,192,0.2)' },
  headerTitle:   { fontFamily: fonts.heading, fontSize: 22, color: '#fff', letterSpacing: -0.3 },
  headerSubtitle:{ fontFamily: fonts.body, fontSize: 12, color: '#FFE9C0', marginTop: 2 },
  headerBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  headerBadgeTxt:{ fontFamily: fonts.bodyBold, fontSize: 10, color: '#F59E0B', letterSpacing: 0.5 },

  // Stats banner
  statsBanner: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 12, backgroundColor: colors.surface, borderRadius: radius.xl, paddingVertical: 14, ...shadow.soft },
  statItem:    { flex: 1, alignItems: 'center' },
  statValue:   { fontFamily: fonts.heading, fontSize: 22, letterSpacing: -0.5 },
  statLabel:   { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  // Filter pills
  filterPill:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle },
  filterTxt:       { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  filterCount:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill },
  filterCountTxt:  { fontFamily: fonts.bodyBold, fontSize: 11 },

  // Review card
  card:           { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 14, ...shadow.soft },

  cardTourRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  tourIconWrap:   { width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.secondary + '15', alignItems: 'center', justifyContent: 'center' },
  tourName:       { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  operatorTxt:    { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 1 },

  reviewerRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatarCircle:   { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
  avatarLetter:   { fontFamily: fonts.heading, fontSize: 15, color: colors.primary },
  reviewerName:   { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary, marginBottom: 3 },

  verifiedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#DCFCE7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.pill },
  verifiedTxt:    { fontFamily: fonts.bodyBold, fontSize: 9, color: '#16A34A' },
  dateTxt:        { fontFamily: fonts.accent, fontSize: 9, color: colors.textDisabled, letterSpacing: 0.5 },

  statusBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  statusDot:      { width: 6, height: 6, borderRadius: 3 },
  statusTxt:      { fontFamily: fonts.bodyBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  reviewTitle:    { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.secondary, marginBottom: 4 },
  reviewBody:     { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 8 },

  adminNoteWrap:  { flexDirection: 'row', alignItems: 'flex-start', gap: 5, backgroundColor: '#FEF2F2', borderRadius: radius.md, padding: 8, marginBottom: 10 },
  adminNoteTxt:   { flex: 1, fontFamily: fonts.body, fontSize: 11, color: '#DC2626', lineHeight: 16 },

  // Reject expand
  rejectExpand:   { overflow: 'hidden' },
  noteInput:      { borderWidth: 1, borderColor: '#FCA5A5', borderRadius: radius.md, padding: 10, fontFamily: fonts.body, fontSize: 13, color: colors.textPrimary, backgroundColor: '#FFF5F5', marginTop: 10, minHeight: 60, textAlignVertical: 'top' },
  rejectConfirmRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  cancelBtn:      { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.lg, backgroundColor: colors.borderSubtle },
  cancelBtnTxt:   { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  confirmRejectBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: radius.lg, backgroundColor: '#DC2626' },
  confirmRejectTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#fff' },

  // Action row
  actionRow:  { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  actionBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.lg },
  actionBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#fff' },
  approveBtn: { backgroundColor: '#16A34A' },
  rejectBtn:  { backgroundColor: '#DC2626' },
  viewTourBtn:{ backgroundColor: colors.secondary + '15', borderWidth: 1, borderColor: colors.secondary + '30' },

  // Error
  errorWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12, paddingBottom: 60 },
  errorTxt:   { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  retryBtn:   { backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 10, borderRadius: radius.pill },
  retryBtnTxt:{ fontFamily: fonts.bodyBold, color: '#fff', fontSize: 13 },

  // Empty
  emptyWrap:  { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.secondary },
  emptySub:   { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
});
