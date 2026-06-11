import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../lib/api';
import { colors, fonts, radius, shadow } from '../../lib/theme';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_COLOR = {
  active:    { bg: '#DCFCE7', color: '#16A34A' },
  suspended: { bg: '#FEE2E2', color: '#DC2626' },
  pending:   { bg: '#FEF3C7', color: '#D97706' },
};

export default function VolunteerManagementScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [volunteers, setVolunteers] = useState([]);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('all');
  const [assignModal, setAssignModal] = useState(null); // volunteer object
  const [assigningTourId, setAssigningTourId] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    try {
      const [vRes, tRes] = await Promise.all([
        api.get('/volunteer/list'),
        api.get('/tours'),
      ]);
      const vList = Array.isArray(vRes) ? vRes : (vRes.data || []);
      const tList = Array.isArray(tRes) ? tRes : (tRes.data || []);
      setVolunteers(vList);
      setTours(tList);
    } catch (e) {
      Alert.alert('Error', 'Failed to load data');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const updateStatus = async (volunteerId, status) => {
    try {
      await api.put('/volunteer/' + volunteerId + '/status', { status });
      setVolunteers(prev => prev.map(v => v._id === volunteerId ? { ...v, volunteerStatus: status } : v));
    } catch {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const assignToTour = async () => {
    if (!assigningTourId || !assignModal) return;
    setAssigning(true);
    try {
      await api.post('/volunteer/assign', { volunteerId: assignModal._id, tourId: assigningTourId });
      const tour = tours.find(t => t._id === assigningTourId);
      setVolunteers(prev => prev.map(v =>
        v._id === assignModal._id
          ? { ...v, assignedTours: [...(v.assignedTours || []), tour].filter(Boolean) }
          : v
      ));
      setAssignModal(null);
      setAssigningTourId(null);
      Alert.alert('Success', 'Volunteer assigned to tour successfully');
    } catch {
      Alert.alert('Error', 'Failed to assign volunteer');
    }
    setAssigning(false);
  };

  const removeFromTour = async (volunteerId, tourId) => {
    Alert.alert('Remove from Tour', 'Remove this volunteer from the tour?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await api.post('/volunteer/remove-tour', { volunteerId, tourId });
            setVolunteers(prev => prev.map(v =>
              v._id === volunteerId
                ? { ...v, assignedTours: (v.assignedTours || []).filter(t => t._id !== tourId) }
                : v
            ));
          } catch {
            Alert.alert('Error', 'Failed to remove volunteer from tour');
          }
        },
      },
    ]);
  };

  const filtered = tab === 'all' ? volunteers : volunteers.filter(v => (v.volunteerStatus || 'active') === tab);

  const renderVolunteer = ({ item }) => {
    const status = item.volunteerStatus || 'active';
    const sc = STATUS_COLOR[status] || STATUS_COLOR.pending;
    const assignedTours = item.assignedTours || [];

    return (
      <View style={[s.card, shadow?.soft]}>
        {/* Volunteer info row */}
        <View style={s.cardRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(item.name || 'V')[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.volName}>{item.name || 'Volunteer'}</Text>
            <Text style={s.volEmail}>{item.email || ''}</Text>
            <Text style={s.volMeta}>{assignedTours.length} tour{assignedTours.length !== 1 ? 's' : ''} assigned</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[s.statusText, { color: sc.color }]}>{status}</Text>
          </View>
        </View>

        {/* Assigned tours */}
        {assignedTours.length > 0 && (
          <View style={s.toursSection}>
            <Text style={s.toursSectionLabel}>Assigned Tours</Text>
            {assignedTours.map(t => (
              <View key={t._id} style={s.tourRow}>
                <View style={s.tourDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.tourTitle}>{t.title}</Text>
                  <Text style={s.tourMeta}>{t.source} → {t.destination} · {fmtDate(t.startDate)}</Text>
                </View>
                <TouchableOpacity onPress={() => removeFromTour(item._id, t._id)} style={s.removeBtn}>
                  <Ionicons name="close-circle" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity style={s.assignBtn} onPress={() => { setAssignModal(item); setAssigningTourId(null); }}>
            <Ionicons name="add-circle-outline" size={15} color={colors.primary} />
            <Text style={s.assignBtnText}>Assign Tour</Text>
          </TouchableOpacity>

          {status !== 'active' ? (
            <TouchableOpacity style={s.activateBtn} onPress={() => updateStatus(item._id, 'active')}>
              <Ionicons name="checkmark-circle-outline" size={15} color="#16A34A" />
              <Text style={[s.actionBtnText, { color: '#16A34A' }]}>Activate</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.suspendBtn} onPress={() =>
              Alert.alert('Suspend Volunteer', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Suspend', style: 'destructive', onPress: () => updateStatus(item._id, 'suspended') },
              ])
            }>
              <Ionicons name="pause-circle-outline" size={15} color={colors.error} />
              <Text style={[s.actionBtnText, { color: colors.error }]}>Suspend</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const TABS = [
    { k: 'all',       label: 'All' },
    { k: 'active',    label: 'Active' },
    { k: 'pending',   label: 'Pending' },
    { k: 'suspended', label: 'Suspended' },
  ];

  const stats = {
    total:     volunteers.length,
    active:    volunteers.filter(v => (v.volunteerStatus || 'active') === 'active').length,
    pending:   volunteers.filter(v => v.volunteerStatus === 'pending').length,
    suspended: volunteers.filter(v => v.volunteerStatus === 'suspended').length,
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={['#1E0A0A', '#5C1615']} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Volunteer Management</Text>
          <Text style={s.subtitle}>{stats.total} volunteers · {stats.active} active</Text>
        </View>
      </LinearGradient>

      {/* Stats row */}
      <View style={s.statsRow}>
        {[
          { label: 'Total',     count: stats.total,     color: colors.primary },
          { label: 'Active',    count: stats.active,    color: '#16A34A' },
          { label: 'Pending',   count: stats.pending,   color: '#D97706' },
          { label: 'Suspended', count: stats.suspended, color: '#DC2626' },
        ].map(stat => (
          <View key={stat.label} style={s.statCard}>
            <Text style={[s.statCount, { color: stat.color }]}>{stat.count}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.k} style={[s.tab, tab === t.k && s.tabActive]} onPress={() => setTab(t.k)}>
            <Text style={[s.tabText, tab === t.k && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item._id)}
          renderItem={renderVolunteer}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyText}>No volunteers in this category</Text>
              <Text style={s.emptySub}>Users with volunteer role will appear here</Text>
            </View>
          }
        />
      )}

      {/* Tour assignment modal */}
      <Modal visible={!!assignModal} transparent animationType="slide" onRequestClose={() => setAssignModal(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Assign Tour</Text>
              <TouchableOpacity onPress={() => setAssignModal(null)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={s.modalVolName}>Volunteer: <Text style={{ color: colors.primary }}>{assignModal?.name}</Text></Text>

            <Text style={s.tourListLabel}>Select a tour to assign:</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {tours.filter(t => {
                const assigned = assignModal?.assignedTours || [];
                return !assigned.some(a => a._id === t._id);
              }).map(t => (
                <TouchableOpacity
                  key={t._id}
                  style={[s.tourOption, assigningTourId === t._id && s.tourOptionActive]}
                  onPress={() => setAssigningTourId(t._id)}
                >
                  <View style={s.tourOptionLeft}>
                    <Ionicons name="bus-outline" size={18} color={assigningTourId === t._id ? colors.primary : colors.textSecondary} />
                    <View>
                      <Text style={[s.tourOptionTitle, assigningTourId === t._id && { color: colors.primary }]}>{t.title}</Text>
                      <Text style={s.tourOptionMeta}>{t.source} → {t.destination} · {fmtDate(t.startDate)}</Text>
                    </View>
                  </View>
                  {assigningTourId === t._id && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
              {tours.filter(t => !(assignModal?.assignedTours || []).some(a => a._id === t._id)).length === 0 && (
                <Text style={{ textAlign: 'center', color: colors.textSecondary, padding: 20, fontFamily: fonts.body }}>
                  All active tours already assigned
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[s.assignConfirmBtn, (!assigningTourId || assigning) && { opacity: 0.5 }]}
              onPress={assignToTour}
              disabled={!assigningTourId || assigning}
            >
              {assigning ? <ActivityIndicator color="white" size="small" /> : (
                <>
                  <Ionicons name="checkmark" size={18} color="white" />
                  <Text style={s.assignConfirmText}>Confirm Assignment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 16, paddingBottom: 18, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Philosopher_700Bold', fontSize: 20, color: 'white' },
  subtitle: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  statsRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: '#F9FAFB', borderRadius: radius.lg },
  statCount: { fontFamily: fonts.bodyBold, fontSize: 20 },
  statLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.textSecondary, marginTop: 2 },

  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: '#F3F4F6' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
  tabTextActive: { color: 'white' },

  card: { backgroundColor: 'white', borderRadius: radius.xl, padding: 14, gap: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 18, color: 'white' },
  volName: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#1F2937' },
  volEmail: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  volMeta: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary, marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'capitalize' },

  toursSection: { backgroundColor: '#F9FAFB', borderRadius: radius.lg, padding: 10, gap: 8 },
  toursSectionLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  tourRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tourDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  tourTitle: { fontFamily: fonts.bodyMedium, fontSize: 13, color: '#1F2937' },
  tourMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  removeBtn: { padding: 4 },

  actions: { flexDirection: 'row', gap: 8 },
  assignBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: radius.lg, backgroundColor: '#FEE8E2', borderWidth: 1, borderColor: colors.primary + '30' },
  assignBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  activateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: radius.lg, backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#16A34A30' },
  suspendBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: radius.lg, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: colors.error + '30' },
  actionBtnText: { fontFamily: fonts.bodyBold, fontSize: 13 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#374151' },
  emptySub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, gap: 12 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 4 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontFamily: 'Philosopher_700Bold', fontSize: 20, color: '#1F2937' },
  modalVolName: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  tourListLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  tourOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: radius.lg, borderWidth: 1.5, borderColor: '#E5E7EB', marginBottom: 8, gap: 10 },
  tourOptionActive: { borderColor: colors.primary, backgroundColor: '#FEE8E2' },
  tourOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  tourOptionTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#1F2937' },
  tourOptionMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  assignConfirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 14, marginTop: 4 },
  assignConfirmText: { fontFamily: fonts.bodyBold, fontSize: 15, color: 'white' },
});
