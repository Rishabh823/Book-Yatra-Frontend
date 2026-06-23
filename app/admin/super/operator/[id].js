import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, Switch, TextInput, Modal, Platform, KeyboardAvoidingView,
  useWindowDimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { AdminShell } from '../../../../lib/AdminScreen';
import { colors, fonts, radius } from '../../../../lib/theme';
import { superAdmin as superApi } from '../../../../lib/api';

const EMPTY_FORM = { name: '', email: '', phone: '', businessName: '', password: '' };

export default function OperatorDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [operator, setOperator] = useState(null);
  const [allTours, setAllTours] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('tours'); // tours | users | bookings
  const [commissionRate, setCommissionRate] = useState('');
  const [commissionSaving, setCommissionSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [opRes, toursRes, usersRes, bookingsRes] = await Promise.all([
        superApi.operatorById(id),
        superApi.allTours(),
        superApi.allUsers(),
        superApi.allBookings(),
      ]);
      const op = opRes?.data || opRes?.operator || opRes;
      const tours = Array.isArray(toursRes) ? toursRes : (toursRes?.tours || toursRes?.data || []);
      const users = Array.isArray(usersRes) ? usersRes : (usersRes?.users || []);
      const bookings = Array.isArray(bookingsRes) ? bookingsRes : (bookingsRes?.bookings || bookingsRes?.data || []);

      setOperator(op);
      setCommissionRate(String(op?.commissionRate ?? ''));
      setAllTours(tours.filter(t => String(t.operatorId?._id || t.operatorId) === String(id)));
      setAllUsers(users.filter(u => (u.joinedOperators || []).some(o =>
        (typeof o === 'object' ? String(o._id) : String(o)) === String(id)
      )));
      setAllBookings(bookings.filter(b => String(b.operatorId?._id || b.operatorId) === String(id)));
    } catch {}
    finally { setLoading(false); }
  }, [id]);

  useFocusEffect(load);

  const openEdit = () => {
    if (!operator) return;
    setForm({
      name: operator.name || '',
      email: operator.email || '',
      phone: operator.phone || '',
      businessName: operator.businessName || '',
      password: '',
    });
    setEditModal(true);
  };

  const onSave = async () => {
    if (!form.name || !form.email || !form.phone) {
      Alert.alert('Validation', 'Name, email and phone are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { name: form.name, email: form.email, phone: form.phone, businessName: form.businessName };
      if (form.password.trim()) payload.password = form.password.trim();
      await superApi.updateUser(id, payload);
      setEditModal(false);
      load();
    } catch (e) { Alert.alert('Error', e.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  const saveCommission = async () => {
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      Alert.alert('Invalid', 'Enter a commission rate between 0 and 100.');
      return;
    }
    setCommissionSaving(true);
    try {
      await superApi.setCommission(id, rate);
      setOperator(o => ({ ...o, commissionRate: rate }));
      Alert.alert('Saved', `Commission rate set to ${rate}%`);
    } catch (e) { Alert.alert('Error', e.message || 'Failed to update commission'); }
    finally { setCommissionSaving(false); }
  };

  const toggleActive = async () => {
    try {
      await superApi.updateUser(id, { isActive: !operator.isActive });
      setOperator(o => ({ ...o, isActive: !o.isActive }));
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const onDelete = () => {
    Alert.alert(
      'Delete Operator',
      `Permanently delete "${operator?.businessName || operator?.name}"? All their tours and data will be unlinked.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await superApi.deleteUser(id);
            router.back();
          } catch (e) { Alert.alert('Error', e.message || 'Delete failed'); }
        }},
      ]
    );
  };

  if (loading) {
    return (
      <AdminShell title="Operator" subtitle="Loading...">
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      </AdminShell>
    );
  }

  if (!operator) {
    return (
      <AdminShell title="Operator" subtitle="Not found">
        <View style={{ alignItems: 'center', paddingTop: 60 }}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textDisabled} />
          <Text style={s.emptyTxt}>Operator not found</Text>
        </View>
      </AdminShell>
    );
  }

  const isActive = operator.isActive !== false;

  return (
    <AdminShell
      title={operator.businessName || operator.name}
      subtitle={isActive ? 'Active Operator' : 'Inactive'}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[s.profileCard, { marginHorizontal: 16 }]}>
          <View style={s.profileRow}>
            {operator.photoUrl ? (
              <Image source={{ uri: operator.photoUrl }} style={s.profileAvatar} />
            ) : (
              <View style={[s.profileAvatar, s.profileAvatarFallback]}>
                <Text style={s.profileAvatarTxt}>{(operator.businessName || operator.name || 'O')[0].toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.profileName}>{operator.businessName || operator.name}</Text>
              {operator.businessName ? <Text style={s.profileSub}>{operator.name}</Text> : null}
              <View style={[s.statusBadge, { backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2' }]}>
                <View style={[s.statusDot, { backgroundColor: isActive ? '#16A34A' : '#DC2626' }]} />
                <Text style={[s.statusTxt, { color: isActive ? '#16A34A' : '#DC2626' }]}>
                  {isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>

          <View style={s.contactRow}>
            <View style={s.contactItem}>
              <Ionicons name="mail-outline" size={14} color={colors.textSecondary} />
              <Text style={s.contactTxt} numberOfLines={1}>{operator.email}</Text>
            </View>
            <View style={s.contactItem}>
              <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
              <Text style={s.contactTxt}>{operator.phone || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Stats Strip */}
        <View style={s.statsRow}>
          {[
            { label: 'Tours', value: allTours.length, icon: 'bus-outline', color: colors.primary },
            { label: 'Users', value: allUsers.length, icon: 'people-outline', color: '#0284C7' },
            { label: 'Bookings', value: allBookings.length, icon: 'ticket-outline', color: '#16A34A' },
          ].map(st => (
            <TouchableOpacity key={st.label} style={s.statCard} onPress={() => setActiveTab(st.label.toLowerCase())}>
              <View style={[s.statIcon, { backgroundColor: st.color + '18' }]}>
                <Ionicons name={st.icon} size={20} color={st.color} />
              </View>
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={s.actionsWrap}>
          <TouchableOpacity style={[s.actionBtn, s.actionEdit]} onPress={openEdit}>
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={[s.actionBtnTxt, { color: colors.primary }]}>Edit Details</Text>
          </TouchableOpacity>

          <View style={s.actionToggle}>
            <Text style={s.actionToggleTxt}>{isActive ? 'Disable' : 'Enable'}</Text>
            <Switch
              value={isActive}
              onValueChange={toggleActive}
              trackColor={{ false: '#FCA5A5', true: '#86EFAC' }}
              thumbColor={isActive ? '#16A34A' : '#DC2626'}
            />
          </View>

          <TouchableOpacity style={[s.actionBtn, s.actionDelete]} onPress={onDelete}>
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text style={[s.actionBtnTxt, { color: '#DC2626' }]}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Commission Rate */}
        <View style={[s.commissionCard, { marginHorizontal: 16, marginBottom: 12 }]}>
          <View style={s.commissionHead}>
            <View style={s.commissionIcon}>
              <Ionicons name="cash-outline" size={18} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.commissionTitle}>Platform Commission</Text>
              <Text style={s.commissionSub}>Percentage deducted from operator earnings</Text>
            </View>
          </View>
          <View style={s.commissionRow}>
            <TextInput
              style={s.commissionInput}
              value={commissionRate}
              onChangeText={setCommissionRate}
              placeholder="0"
              placeholderTextColor={colors.textDisabled}
              keyboardType="decimal-pad"
              maxLength={5}
            />
            <Text style={s.commissionPct}>%</Text>
            <TouchableOpacity
              style={[s.commissionSaveBtn, commissionSaving && { opacity: 0.6 }]}
              onPress={saveCommission}
              disabled={commissionSaving}
              activeOpacity={0.8}
            >
              {commissionSaving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.commissionSaveTxt}>Set Rate</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab switcher */}
        <View style={s.tabBar}>
          {['tours', 'users', 'bookings'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.tabItem, activeTab === tab && s.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabTxt, activeTab === tab && s.tabTxtActive]}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={{ paddingHorizontal: 16 }}>
          {activeTab === 'tours' && (
            allTours.length === 0 ? (
              <EmptyState icon="bus-outline" text="No tours yet" />
            ) : (
              allTours.map(tour => (
                <TouchableOpacity
                  key={tour._id}
                  style={s.listCard}
                  onPress={() => router.push(`/admin/tour/${tour._id}`)}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.listCardTitle} numberOfLines={1}>{tour.title}</Text>
                    <Text style={s.listCardSub}>{tour.destination} · {tour.startDate ? new Date(tour.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={s.listCardPrice}>₹{tour.price}</Text>
                    <Text style={s.listCardSeats}>{tour.totalSeats} seats</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))
            )
          )}

          {activeTab === 'users' && (
            allUsers.length === 0 ? (
              <EmptyState icon="people-outline" text="No users joined this operator" />
            ) : (
              allUsers.map(user => (
                <TouchableOpacity
                  key={user._id}
                  style={s.listCard}
                  onPress={() => router.push(`/admin/user/${user._id}`)}
                  activeOpacity={0.85}
                >
                  {user.photoUrl ? (
                    <Image source={{ uri: user.photoUrl }} style={s.listAvatar} />
                  ) : (
                    <View style={[s.listAvatar, s.listAvatarFallback]}>
                      <Text style={s.listAvatarTxt}>{(user.name || '?')[0].toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.listCardTitle} numberOfLines={1}>{user.name}</Text>
                    <Text style={s.listCardSub} numberOfLines={1}>{user.email}</Text>
                  </View>
                  <View style={[s.rolePill, { backgroundColor: '#0284C718' }]}>
                    <Text style={[s.rolePillTxt, { color: '#0284C7' }]}>{user.role || 'user'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} />
                </TouchableOpacity>
              ))
            )
          )}

          {activeTab === 'bookings' && (
            allBookings.length === 0 ? (
              <EmptyState icon="ticket-outline" text="No bookings for this operator's tours" />
            ) : (
              allBookings.map(b => {
                const sc = b.status === 'confirmed' ? { bg: '#DCFCE7', text: '#16A34A' }
                  : b.status === 'cancelled' ? { bg: '#FEE2E2', text: '#DC2626' }
                  : { bg: '#FEF9C3', text: '#CA8A04' };
                return (
                  <TouchableOpacity
                    key={b._id}
                    style={s.listCard}
                    onPress={() => router.push(`/admin/booking/${b._id}`)}
                    activeOpacity={0.85}
                  >
                    <View style={[s.bookingIdBadge]}>
                      <Text style={s.bookingIdTxt}>#{String(b._id).slice(-5).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.listCardTitle} numberOfLines={1}>{b.name || 'Booking'}</Text>
                      <Text style={s.listCardSub}>{b.tour?.title || '—'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={s.listCardPrice}>₹{b.totalAmount || 0}</Text>
                      <View style={[s.sBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[s.sBadgeTxt, { color: sc.text }]}>{b.status}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.sheet, { maxWidth: Math.min(width - 32, 480) }]}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Edit Operator</Text>
              <TouchableOpacity onPress={() => setEditModal(false)} style={s.cancelBtn}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Field label="Business Name" value={form.businessName} onChangeText={v => setForm(f => ({ ...f, businessName: v }))} placeholder="Business name" />
              <Field label="Full Name *"   value={form.name}         onChangeText={v => setForm(f => ({ ...f, name: v }))}         placeholder="Full name" />
              <Field label="Email *"       value={form.email}        onChangeText={v => setForm(f => ({ ...f, email: v }))}        placeholder="Email" autoCapitalize="none" keyboardType="email-address" />
              <Field label="Phone *"       value={form.phone}        onChangeText={v => setForm(f => ({ ...f, phone: v }))}        placeholder="Phone" keyboardType="phone-pad" />
              <View style={s.field}>
                <Text style={s.label}>New Password</Text>
                <View style={s.inputRow}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="Leave blank to keep"
                    placeholderTextColor={colors.textDisabled}
                    value={form.password}
                    onChangeText={v => setForm(f => ({ ...f, password: v }))}
                    secureTextEntry={!showPwd}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={{ padding: 4 }}>
                    <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity style={s.saveBtn} onPress={onSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>Save Changes</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AdminShell>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} placeholderTextColor={colors.textDisabled} {...props} />
    </View>
  );
}

function EmptyState({ icon, text }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32 }}>
      <Ionicons name={icon} size={36} color={colors.textDisabled} />
      <Text style={s.emptyTxt}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  profileCard:      { backgroundColor: colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#E5E7EB", marginTop: 8, marginBottom: 4 },
  profileRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  profileAvatar:    { width: 60, height: 60, borderRadius: 30 },
  profileAvatarFallback: { backgroundColor: colors.secondary + '18', alignItems: 'center', justifyContent: 'center' },
  profileAvatarTxt: { fontFamily: fonts.bodyBold, fontSize: 24, color: colors.secondary },
  profileName:      { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary, marginBottom: 2 },
  profileSub:       { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  statusBadge:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  statusDot:        { width: 6, height: 6, borderRadius: 3 },
  statusTxt:        { fontFamily: fonts.bodyBold, fontSize: 11 },
  contactRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  contactItem:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  contactTxt:       { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },

  statsRow:         { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginVertical: 12 },
  statCard:         { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: "#E5E7EB" },
  statIcon:         { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue:        { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary },
  statLabel:        { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 1 },

  actionsWrap:      { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  actionBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 16, borderWidth: 1 },
  actionEdit:       { backgroundColor: colors.primary + '10', borderColor: colors.primary + '40' },
  actionDelete:     { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  actionBtnTxt:     { fontFamily: fonts.bodyBold, fontSize: 13 },
  actionToggle:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.borderSubtle },
  actionToggleTxt:  { fontFamily: fonts.bodyMedium || fonts.body, fontSize: 12, color: colors.textSecondary },

  tabBar:           { flexDirection: 'row', marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: colors.borderSubtle, marginBottom: 12 },
  tabItem:          { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12 },
  tabItemActive:    { backgroundColor: colors.primary },
  tabTxt:           { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary, textTransform: 'capitalize' },
  tabTxtActive:     { color: '#fff' },

  listCard:         { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  listCardTitle:    { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  listCardSub:      { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  listCardPrice:    { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  listCardSeats:    { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  listAvatar:       { width: 36, height: 36, borderRadius: 18 },
  listAvatarFallback:{ backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
  listAvatarTxt:    { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  rolePill:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  rolePillTxt:      { fontFamily: fonts.bodyBold, fontSize: 10, textTransform: 'capitalize' },
  bookingIdBadge:   { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary + '14', alignItems: 'center', justifyContent: 'center' },
  bookingIdTxt:     { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.primary },
  sBadge:           { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  sBadgeTxt:        { fontFamily: fonts.bodyBold, fontSize: 10, textTransform: 'capitalize' },

  emptyTxt:         { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: 10 },

  commissionCard:       { backgroundColor: colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  commissionHead:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  commissionIcon:       { width: 38, height: 38, borderRadius: 19, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  commissionTitle:      { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  commissionSub:        { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  commissionRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commissionInput:      { flex: 1, backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle, paddingHorizontal: 14, paddingVertical: 10, fontFamily: fonts.bodyBold, fontSize: 20, color: colors.textPrimary },
  commissionPct:        { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textSecondary },
  commissionSaveBtn:    { backgroundColor: '#16A34A', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12 },
  commissionSaveTxt:    { fontFamily: fonts.bodyBold, fontSize: 14, color: '#fff' },

  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet:            { width: '100%', backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '92%' },
  sheetHead:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle:       { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
  field:            { marginBottom: 12 },
  label:            { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  input:            { backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  inputRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle, paddingHorizontal: 12, paddingVertical: 10 },
  saveBtn:          { backgroundColor: colors.primary, borderRadius: 999, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnTxt:       { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15 },
  cancelBtn:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.bg },
  cancelText:       { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
});
