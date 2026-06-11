import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminShell, StatusBadge } from '../../lib/AdminScreen';
import { colors, fonts, radius, shadow } from '../../lib/theme';
import { members as membersApi, api } from '../../lib/api';
import { fmtDate } from '../../lib/utils';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: '', label: 'All' },
];

export default function AdminMembers() {
  const [tab, setTab] = useState('pending');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await membersApi.list(tab);
      setItems(Array.isArray(res) ? res : res?.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tab]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const updateMember = (id, status) => {
    Alert.alert(`${status === 'approved' ? 'Approve' : 'Reject'} Member?`, 'This will update the member status.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        try {
          await api.put(`/members/${id}`, { status });
          load();
        } catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  return (
    <AdminShell title="Member Applications" subtitle={`${items.length} members`}>
      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && s.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[s.tabText, tab === t.key && { color: '#fff' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it._id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="people-outline" size={48} color={colors.textDisabled} />
              <Text style={{ fontFamily: fonts.body, color: colors.textSecondary, marginTop: 8 }}>No members found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.initials}>
                  <Text style={s.initialText}>{(item.fullName || 'M').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{item.fullName}</Text>
                  <Text style={s.meta}>{item.phone} {item.email ? `· ${item.email}` : ''}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
              {item.reason ? <Text style={s.reason}>"{item.reason}"</Text> : null}
              <Text style={s.date}>Applied: {fmtDate(item.createdAt)}</Text>
              {item.status === 'pending' && (
                <View style={s.actions}>
                  <TouchableOpacity style={s.approveBtn} onPress={() => updateMember(item._id, 'approved')}>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={s.approveTxt}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.rejectBtn} onPress={() => updateMember(item._id, 'rejected')}>
                    <Ionicons name="close-circle" size={16} color="#DC2626" />
                    <Text style={s.rejectTxt}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </AdminShell>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSubtle },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 14, ...shadow.soft },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  initials: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondaryLight, alignItems: 'center', justifyContent: 'center' },
  initialText: { fontFamily: fonts.heading, fontSize: 18, color: '#fff' },
  name: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  meta: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  reason: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginBottom: 6 },
  date: { fontFamily: fonts.accent, fontSize: 10, color: colors.textDisabled, letterSpacing: 1, marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 10 },
  approveBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#16A34A', borderRadius: radius.pill },
  approveTxt: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 13 },
  rejectBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#FEE2E2', borderRadius: radius.pill },
  rejectTxt: { color: '#DC2626', fontFamily: fonts.bodyBold, fontSize: 13 },
});
