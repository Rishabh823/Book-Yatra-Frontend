import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, FlatList, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { AdminShell } from '../../../lib/AdminScreen';
import { colors, fonts, radius, shadow } from '../../../lib/theme';
import { superAdmin as superApi } from '../../../lib/api';

const FILTERS = [
  { key: '',          label: 'All Requests' },
  { key: 'pending',   label: 'Pending' },
  { key: 'approved',  label: 'Approved' },
  { key: 'rejected',  label: 'Rejected' },
];

const STATUS_COLORS = {
  pending:  { bg: '#FFFBEB', text: '#D97706' },
  approved: { bg: '#F0FDF4', text: '#16A34A' },
  rejected: { bg: '#FEF2F2', text: '#DC2626' },
};

export default function SuperRefunds() {
  const [refunds,  setRefunds]  = useState([]);
  const [filter,   setFilter]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null); // booking for action modal
  const [modal,    setModal]    = useState(null);  // 'approve' | 'reject'
  const [inputVal, setInputVal] = useState('');    // amount (approve) or reason (reject)
  const [acting,   setActing]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superApi.allRefunds(filter);
      const list = Array.isArray(res) ? res : (res?.bookings || res?.data || []);
      setRefunds(list);
    } catch { setRefunds([]); }
    finally { setLoading(false); }
  }, [filter]);

  useFocusEffect(load);

  const openAction = (booking, type) => {
    setSelected(booking);
    setInputVal('');
    setModal(type);
  };

  const closeModal = () => { setModal(null); setSelected(null); setInputVal(''); };

  const handleApprove = async () => {
    if (!inputVal.trim()) { Alert.alert('Required', 'Enter refund amount.'); return; }
    const amount = parseFloat(inputVal);
    if (isNaN(amount) || amount <= 0) { Alert.alert('Invalid', 'Enter a valid amount.'); return; }
    setActing(true);
    try {
      await superApi.approveRefund(selected._id, { refundAmount: amount });
      Alert.alert('Approved', `Refund of ₹${amount} approved.`);
      closeModal();
      load();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to approve refund.');
    } finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!inputVal.trim()) { Alert.alert('Required', 'Enter rejection reason.'); return; }
    setActing(true);
    try {
      await superApi.rejectRefund(selected._id, inputVal.trim());
      Alert.alert('Rejected', 'Refund request rejected.');
      closeModal();
      load();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to reject refund.');
    } finally { setActing(false); }
  };

  const renderItem = ({ item: b }) => {
    const refundStatus = b.refundRequestStatus || 'pending';
    const sc = STATUS_COLORS[refundStatus] || STATUS_COLORS.pending;
    const paid = b.totalAmount || b.amount || 0;

    return (
      <View style={s.card}>
        {/* Header */}
        <View style={s.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={s.tourName} numberOfLines={1}>{b.tourId?.title || b.tourTitle || 'Tour'}</Text>
            <Text style={s.bookingId}>#{b._id?.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[s.statusTxt, { color: sc.text }]}>{refundStatus}</Text>
          </View>
        </View>

        {/* User info */}
        <View style={s.infoRow}>
          <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
          <Text style={s.infoTxt}>{b.userId?.name || b.userName || 'Unknown'}</Text>
          <Text style={s.infoDot}>·</Text>
          <Ionicons name="call-outline" size={13} color={colors.textSecondary} />
          <Text style={s.infoTxt}>{b.userId?.phone || '—'}</Text>
        </View>

        {/* Amount */}
        <View style={s.amountRow}>
          <View style={s.amountChip}>
            <Text style={s.amountLabel}>Booking Amount</Text>
            <Text style={s.amountVal}>₹{paid.toLocaleString()}</Text>
          </View>
          {b.refundAmount > 0 && (
            <View style={[s.amountChip, { backgroundColor: '#F0FDF4' }]}>
              <Text style={[s.amountLabel, { color: '#16A34A' }]}>Refund Approved</Text>
              <Text style={[s.amountVal, { color: '#16A34A' }]}>₹{b.refundAmount?.toLocaleString()}</Text>
            </View>
          )}
        </View>

        {/* Reason */}
        {b.refundReason && (
          <View style={s.reasonBox}>
            <Ionicons name="chatbubble-outline" size={13} color={colors.textSecondary} />
            <Text style={s.reasonTxt} numberOfLines={2}>{b.refundReason}</Text>
          </View>
        )}

        {/* Date */}
        {b.refundRequestedAt && (
          <Text style={s.dateTxt}>Requested: {new Date(b.refundRequestedAt).toLocaleString()}</Text>
        )}

        {/* Actions — only for pending */}
        {refundStatus === 'pending' && (
          <View style={s.actionRow}>
            <TouchableOpacity style={s.approveBtn} onPress={() => openAction(b, 'approve')} activeOpacity={0.8}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
              <Text style={[s.actionTxt, { color: '#16A34A' }]}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.rejectBtn} onPress={() => openAction(b, 'reject')} activeOpacity={0.8}>
              <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
              <Text style={[s.actionTxt, { color: '#DC2626' }]}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <AdminShell title="Refund Requests" subtitle="Review and process customer refunds">

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.chip, filter === f.key && s.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.chipTxt, filter === f.key && s.chipTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : refunds.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="refresh-circle-outline" size={52} color={colors.textDisabled} />
          <Text style={s.emptyTxt}>No refund requests</Text>
          <Text style={s.emptySub}>
            {filter ? `No ${filter} refund requests found` : 'All clear — no pending refunds'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={refunds}
          keyExtractor={b => b._id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Action Modal */}
      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalCard}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>
                {modal === 'approve' ? 'Approve Refund' : 'Reject Refund'}
              </Text>
            </View>

            {selected && (
              <View style={s.modalInfo}>
                <Text style={s.modalTour} numberOfLines={1}>{selected.tourId?.title || selected.tourTitle}</Text>
                <Text style={s.modalAmount}>Booking: ₹{(selected.totalAmount || 0).toLocaleString()}</Text>
              </View>
            )}

            <Text style={s.modalFieldLabel}>
              {modal === 'approve' ? 'Refund Amount (₹)' : 'Rejection Reason'}
            </Text>
            <TextInput
              style={[s.modalInput, modal === 'reject' && { height: 88, textAlignVertical: 'top', paddingTop: 12 }]}
              value={inputVal}
              onChangeText={setInputVal}
              placeholder={modal === 'approve' ? `Max: ₹${selected?.totalAmount || 0}` : 'Explain why the refund is rejected...'}
              placeholderTextColor={colors.textDisabled}
              keyboardType={modal === 'approve' ? 'numeric' : 'default'}
              multiline={modal === 'reject'}
            />

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={closeModal}>
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalConfirmBtn, { backgroundColor: modal === 'approve' ? '#16A34A' : '#DC2626' }, acting && { opacity: 0.6 }]}
                onPress={modal === 'approve' ? handleApprove : handleReject}
                disabled={acting}
              >
                {acting ? <ActivityIndicator color="#fff" size="small" /> : (
                  <Text style={s.modalConfirmTxt}>{modal === 'approve' ? 'Approve' : 'Reject'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </AdminShell>
  );
}

const s = StyleSheet.create({
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle },
  chipActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt:     { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  chipTxtActive: { color: '#fff' },

  list: { paddingHorizontal: 16, paddingBottom: 40 },

  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16, marginBottom: 12, ...shadow.soft },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  tourName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  bookingId: { fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled, marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusTxt: { fontFamily: fonts.bodyMedium, fontSize: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  infoTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  infoDot: { color: colors.textDisabled, fontSize: 14 },

  amountRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  amountChip: { flex: 1, backgroundColor: '#F8F7F4', borderRadius: radius.lg, padding: 10 },
  amountLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  amountVal: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary },

  reasonBox: { flexDirection: 'row', gap: 6, backgroundColor: '#FFF7F0', borderRadius: radius.md, padding: 10, marginBottom: 8, alignItems: 'flex-start' },
  reasonTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, flex: 1 },
  dateTxt: { fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled, marginBottom: 12 },

  actionRow: { flexDirection: 'row', gap: 10 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: radius.lg, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  rejectBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: radius.lg, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  actionTxt: { fontFamily: fonts.bodyMedium, fontSize: 14 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  emptyTxt: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  modalInfo: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: 14, marginBottom: 16 },
  modalTour: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary, marginBottom: 4 },
  modalAmount: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  modalFieldLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary, marginBottom: 8 },
  modalInput: { backgroundColor: colors.bg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSubtle, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary, marginBottom: 20 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, height: 52, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.borderSubtle, alignItems: 'center', justifyContent: 'center' },
  modalCancelTxt: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textSecondary },
  modalConfirmBtn: { flex: 1, height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  modalConfirmTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#fff' },
});
