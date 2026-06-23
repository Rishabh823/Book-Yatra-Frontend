import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Image,
  RefreshControl, useWindowDimensions, ActivityIndicator, Modal, TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { AdminShell, SectionHeader } from '../../../lib/AdminScreen';
import { colors, fonts } from '../../../lib/theme';
import { crawlApi } from '../../../lib/api';

const STATUS_OPTS = ['pending_review', 'approved', 'rejected', 'imported'];
const STATUS_COLOR = {
  pending_review: { bg: '#FFFBEB', text: '#D97706', label: 'Pending' },
  approved:       { bg: '#F0FDF4', text: '#16A34A', label: 'Approved' },
  rejected:       { bg: '#FEF2F2', text: '#DC2626', label: 'Rejected' },
  imported:       { bg: '#EFF6FF', text: '#2563EB', label: 'Imported' },
};

export default function ImportedTours() {
  const { width } = useWindowDimensions();
  const px = width >= 600 ? 24 : 16;

  const [tours, setTours] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('pending_review');
  const [page, setPage] = useState(1);

  const [reviewModal, setReviewModal] = useState(null); // selected tour
  const [notes, setNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const [changeOnly, setChangeOnly] = useState(false);

  const load = useCallback(async (p = 1) => {
    try {
      const params = { status: filter, page: p, limit: 20 };
      if (changeOnly) params.changeOnly = 'true';
      const res = await crawlApi.getCrawledTours(params);
      if (p === 1) setTours(res.data || []);
      else setTours(prev => [...prev, ...(res.data || [])]);
      setTotal(res.total || 0);
      setPage(p);
    } catch {}
    finally { setLoading(false); }
  }, [filter, changeOnly]);

  useFocusEffect(useCallback(() => { load(1); }, [filter, changeOnly]));
  const onRefresh = async () => { setRefreshing(true); await load(1); setRefreshing(false); };

  async function handleReview(action) {
    if (!reviewModal) return;
    setReviewing(true);
    try {
      await crawlApi.reviewTour(reviewModal._id, action, notes);
      setReviewModal(null);
      setNotes('');
      await load(1);
    } catch {}
    finally { setReviewing(false); }
  }

  return (
    <AdminShell title="Imported Tours" subtitle="Review crawled tours before publishing">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: px, paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: px }}>
            {STATUS_OPTS.map(s => {
              const sc = STATUS_COLOR[s];
              return (
                <TouchableOpacity
                  key={s}
                  style={[fl.chip, filter === s && { backgroundColor: sc.bg, borderColor: sc.text }]}
                  onPress={() => setFilter(s)}
                >
                  <Text style={[fl.chipTxt, filter === s && { color: sc.text, fontFamily: fonts.bodyBold }]}>
                    {sc.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Change Alert Filter */}
        <View style={{ paddingHorizontal: px, marginBottom: 8 }}>
          <TouchableOpacity style={[fl.toggleRow, changeOnly && { backgroundColor: '#FFFBEB', borderColor: '#D97706' }]} onPress={() => setChangeOnly(v => !v)}>
            <Ionicons name={changeOnly ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={changeOnly ? '#D97706' : '#9CA3AF'} />
            <Text style={[fl.toggleTxt, changeOnly && { color: '#D97706' }]}>Show only changed tours</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: px }}>
          <SectionHeader title={`${total} tours`} />

          {loading ? (
            <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>
          ) : tours.length === 0 ? (
            <View style={fl.empty}>
              <Ionicons name="layers-outline" size={40} color="#D1D5DB" />
              <Text style={fl.emptyTxt}>No tours in this category</Text>
            </View>
          ) : (
            tours.map(tour => {
              const sc = STATUS_COLOR[tour.status] || STATUS_COLOR.pending_review;
              return (
                <View key={tour._id} style={fl.card}>
                  {/* Image */}
                  {tour.images?.[0] ? (
                    <Image source={{ uri: tour.images[0] }} style={fl.thumb} resizeMode="cover" />
                  ) : (
                    <View style={[fl.thumb, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="image-outline" size={24} color="#D1D5DB" />
                    </View>
                  )}

                  <View style={fl.cardBody}>
                    {/* Source + Change Badge */}
                    <View style={fl.cardMeta}>
                      <View style={fl.sourceBadge}>
                        <Ionicons name="globe-outline" size={10} color="#6B7280" />
                        <Text style={fl.sourceText}>{tour.externalSource || tour.sourceId?.name || 'External'}</Text>
                      </View>
                      {tour.changeDetected && (
                        <View style={fl.changeBadge}>
                          <Ionicons name="alert-circle" size={10} color="#D97706" />
                          <Text style={fl.changeTxt}>Changed: {tour.changeFields?.join(', ')}</Text>
                        </View>
                      )}
                      <View style={[fl.statusBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[fl.statusTxt, { color: sc.text }]}>{sc.label}</Text>
                      </View>
                    </View>

                    <Text style={fl.title} numberOfLines={2}>{tour.title || 'Untitled Tour'}</Text>

                    <View style={fl.detailRow}>
                      {tour.fromLocation ? (
                        <View style={fl.detailChip}>
                          <Ionicons name="location-outline" size={11} color="#6B7280" />
                          <Text style={fl.detailTxt}>{tour.fromLocation}</Text>
                        </View>
                      ) : null}
                      {tour.price ? (
                        <View style={fl.detailChip}>
                          <Ionicons name="pricetag-outline" size={11} color="#16A34A" />
                          <Text style={[fl.detailTxt, { color: '#16A34A' }]}>{tour.priceRaw || `₹${tour.price}`}</Text>
                        </View>
                      ) : null}
                      {tour.duration ? (
                        <View style={fl.detailChip}>
                          <Ionicons name="time-outline" size={11} color="#6B7280" />
                          <Text style={fl.detailTxt}>{tour.duration}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* External URL */}
                    <TouchableOpacity style={fl.extLink} onPress={() => Linking.openURL(tour.externalUrl)}>
                      <Ionicons name="open-outline" size={12} color="#0284C7" />
                      <Text style={fl.extLinkTxt} numberOfLines={1}>{tour.externalUrl}</Text>
                    </TouchableOpacity>

                    {/* Action Buttons */}
                    {tour.status === 'pending_review' && (
                      <View style={fl.actionRow}>
                        <TouchableOpacity style={fl.approveBtn} onPress={() => { setReviewModal(tour); setNotes(''); }}>
                          <Ionicons name="checkmark" size={14} color="#fff" />
                          <Text style={fl.approveTxt}>Review</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={fl.rejectBtn} onPress={() => { setReviewModal(tour); setNotes(''); }}>
                          <Ionicons name="close" size={14} color="#DC2626" />
                          <Text style={fl.rejectTxt}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}

          {tours.length < total && !loading && (
            <TouchableOpacity style={fl.loadMore} onPress={() => load(page + 1)}>
              <Text style={fl.loadMoreTxt}>Load more</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={!!reviewModal} animationType="slide" presentationStyle="formSheet">
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={fl.mHeader}>
            <TouchableOpacity onPress={() => setReviewModal(null)} style={fl.mClose}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
            <Text style={fl.mTitle}>Review Tour</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {reviewModal && (
              <>
                <Text style={fl.mTourTitle}>{reviewModal.title}</Text>

                <View style={fl.mInfoRow}>
                  <View style={fl.mInfoChip}>
                    <Ionicons name="globe-outline" size={12} color="#6B7280" />
                    <Text style={fl.mInfoTxt}>{reviewModal.externalSource || 'External source'}</Text>
                  </View>
                  {reviewModal.price ? (
                    <View style={fl.mInfoChip}>
                      <Ionicons name="pricetag-outline" size={12} color="#16A34A" />
                      <Text style={[fl.mInfoTxt, { color: '#16A34A' }]}>{reviewModal.priceRaw || `₹${reviewModal.price}`}</Text>
                    </View>
                  ) : null}
                </View>

                {reviewModal.changeDetected && (
                  <View style={fl.changeCard}>
                    <Text style={fl.changeCardTitle}>Changes Detected</Text>
                    {reviewModal.changeFields?.map(f => (
                      <View key={f} style={fl.changeRow}>
                        <Text style={fl.changeField}>{f}</Text>
                        <Text style={fl.changePrev}>{String(reviewModal.previousData?.[f] ?? '—')}</Text>
                        <Ionicons name="arrow-forward" size={12} color="#6B7280" />
                        <Text style={fl.changeNew}>{String(reviewModal[f] ?? '—')}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={fl.extLinkFull}>
                  <Ionicons name="link-outline" size={14} color="#0284C7" />
                  <Text style={fl.extLinkFullTxt}>
                    Users will be redirected to the source website to book. This tour will appear on your platform as an aggregated listing.
                  </Text>
                </View>

                <Text style={fl.mLabel}>Review Notes (optional)</Text>
                <TextInput
                  style={fl.mInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add a note for this review..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                />

                <View style={fl.mActions}>
                  <TouchableOpacity
                    style={fl.mApprove}
                    onPress={() => handleReview('approve')}
                    disabled={reviewing}
                  >
                    {reviewing ? <ActivityIndicator color="#fff" size="small" /> : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={fl.mApproveTxt}>Approve & Publish</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={fl.mReject}
                    onPress={() => handleReview('reject')}
                    disabled={reviewing}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                    <Text style={fl.mRejectTxt}>Reject</Text>
                  </TouchableOpacity>
                </View>

                <Text style={fl.mNotice}>
                  Approved tours go live instantly with an "External Booking" badge. Users are redirected to {reviewModal.externalSource || 'the source website'} to complete their booking.
                </Text>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </AdminShell>
  );
}

const fl = StyleSheet.create({
  chip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  chipTxt:    { fontFamily: fonts.bodyMedium, fontSize: 12, color: '#6B7280' },

  toggleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', alignSelf: 'flex-start' },
  toggleTxt:  { fontFamily: fonts.bodyMedium, fontSize: 12, color: '#9CA3AF' },

  empty:      { paddingTop: 60, alignItems: 'center', gap: 12 },
  emptyTxt:   { fontFamily: fonts.body, fontSize: 14, color: '#9CA3AF' },

  card:       { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12, overflow: 'hidden', flexDirection: 'row' },
  thumb:      { width: 88, height: undefined, minHeight: 120 },
  cardBody:   { flex: 1, padding: 12 },
  cardMeta:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' },

  sourceBadge:{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  sourceText: { fontFamily: fonts.body, fontSize: 9, color: '#6B7280' },
  changeBadge:{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFFBEB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  changeTxt:  { fontFamily: fonts.bodyBold, fontSize: 9, color: '#D97706' },
  statusBadge:{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  statusTxt:  { fontFamily: fonts.bodyBold, fontSize: 9 },

  title:      { fontFamily: fonts.bodyBold, fontSize: 13, color: '#111827', marginBottom: 6, lineHeight: 18 },
  detailRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  detailTxt:  { fontFamily: fonts.body, fontSize: 10, color: '#6B7280' },

  extLink:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  extLinkTxt: { fontFamily: fonts.body, fontSize: 10, color: '#0284C7', flex: 1, textDecorationLine: 'underline' },

  actionRow:  { flexDirection: 'row', gap: 8 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#D95D39', paddingVertical: 8, borderRadius: 8 },
  approveTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#fff' },
  rejectBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#FEF2F2', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  rejectTxt:  { fontFamily: fonts.bodyBold, fontSize: 12, color: '#DC2626' },

  loadMore:   { paddingVertical: 14, alignItems: 'center' },
  loadMoreTxt:{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },

  // Modal
  mHeader:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  mClose:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F4F4', alignItems: 'center', justifyContent: 'center' },
  mTitle:    { flex: 1, fontFamily: fonts.heading, fontSize: 18, color: '#111827', marginLeft: 12 },
  mTourTitle:{ fontFamily: fonts.heading, fontSize: 18, color: '#111827', marginBottom: 10, lineHeight: 24 },
  mInfoRow:  { flexDirection: 'row', gap: 8, marginBottom: 14 },
  mInfoChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  mInfoTxt:  { fontFamily: fonts.bodyMedium, fontSize: 12, color: '#6B7280' },

  changeCard: { backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FDE68A' },
  changeCardTitle:{ fontFamily: fonts.bodyBold, fontSize: 11, color: '#92400E', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  changeRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  changeField:{ fontFamily: fonts.bodyBold, fontSize: 11, color: '#374151', width: 80 },
  changePrev: { fontFamily: fonts.body, fontSize: 11, color: '#9CA3AF', flex: 1 },
  changeNew:  { fontFamily: fonts.bodyBold, fontSize: 11, color: '#D97706', flex: 1 },

  extLinkFull: { flexDirection: 'row', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 14 },
  extLinkFullTxt:{ flex: 1, fontFamily: fonts.body, fontSize: 12, color: '#1E40AF', lineHeight: 18 },

  mLabel:    { fontFamily: fonts.bodyBold, fontSize: 11, color: '#374151', marginBottom: 6 },
  mInput:    { backgroundColor: '#F2F0ED', borderRadius: 10, padding: 12, fontFamily: fonts.body, fontSize: 13, color: '#111827', minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },

  mActions:  { gap: 10, marginBottom: 14 },
  mApprove:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D95D39', borderRadius: 12, height: 52 },
  mApproveTxt:{ fontFamily: fonts.bodyBold, fontSize: 15, color: '#fff' },
  mReject:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 12, height: 46 },
  mRejectTxt:{ fontFamily: fonts.bodyBold, fontSize: 14, color: '#DC2626' },

  mNotice:   { fontFamily: fonts.body, fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
});
