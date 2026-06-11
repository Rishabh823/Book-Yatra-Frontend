import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, TextInput, Alert, Modal, ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminShell } from '../../../lib/AdminScreen';
import { colors, fonts, radius, shadow } from '../../../lib/theme';
import { superAdmin as superApi } from '../../../lib/api';

const ROLES = ['user', 'guest', 'volunteer', 'manager', 'admin', 'super_admin'];
const ROLE_META = {
  super_admin: { color: '#7C3AED', icon: 'shield-checkmark',  desc: 'Full platform access' },
  admin:       { color: '#D97706', icon: 'business',           desc: 'Bus operator, manages own tours' },
  manager:     { color: '#0284C7', icon: 'briefcase',          desc: 'Operator staff, limited access' },
  volunteer:   { color: '#16A34A', icon: 'hand-right',         desc: 'Volunteer under an operator' },
  user:        { color: '#6B7280', icon: 'person',             desc: 'Regular traveler' },
  guest:       { color: '#9CA3AF', icon: 'walk',               desc: 'Anonymous / guest account' },
};

export default function SuperRoles() {
  const { width } = useWindowDimensions();
  const px = width >= 600 ? 20 : 12;

  const [items, setItems]         = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [saving, setSaving]       = useState({});
  const [roleModal, setRoleModal] = useState(null); // { user, selectedRole }

  const load = async () => {
    try {
      const data = await superApi.allUsers();
      const list = Array.isArray(data) ? data : (data?.users || []);
      setItems(list);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(items.filter(u => {
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchSearch = !q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
      return matchRole && matchSearch;
    }));
  }, [search, roleFilter, items]);

  const applyRole = async (userId, newRole) => {
    Alert.alert('Change Role', `Set role to "${newRole}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        setSaving(prev => ({ ...prev, [userId]: true }));
        try {
          await superApi.updateUser(userId, { role: newRole });
          setItems(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
          setRoleModal(null);
        } catch (e) { Alert.alert('Error', e.message || 'Role update failed'); }
        finally { setSaving(prev => ({ ...prev, [userId]: false })); }
      }},
    ]);
  };

  const renderItem = useCallback(({ item }) => {
    const meta = ROLE_META[item.role] || ROLE_META.user;
    return (
      <View style={[s.card, { marginHorizontal: px }]}>
        <View style={s.cardRow}>
          <View style={[s.roleIcon, { backgroundColor: meta.color + '18' }]}>
            <Ionicons name={meta.icon + '-outline'} size={20} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={1}>{item.name}</Text>
            <Text style={s.sub} numberOfLines={1}>{item.email}</Text>
          </View>
          <View style={s.rightCol}>
            <View style={[s.rolePill, { backgroundColor: meta.color + '18' }]}>
              <Text style={[s.rolePillTxt, { color: meta.color }]}>{item.role}</Text>
            </View>
            <TouchableOpacity
              style={s.changeBtn}
              onPress={() => setRoleModal({ user: item, selectedRole: item.role })}
              disabled={!!saving[item._id]}
            >
              {saving[item._id]
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={s.changeBtnTxt}>Change</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [px, saving]);

  return (
    <AdminShell title="Role Management" subtitle={`${filtered.length} accounts`}>
      <View style={{ paddingHorizontal: px, gap: 8, marginBottom: 4 }}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput style={s.searchInput} placeholder="Search name or email..." placeholderTextColor={colors.textDisabled} value={search} onChangeText={setSearch} />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={colors.textSecondary} /></TouchableOpacity> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', ...ROLES].map(r => {
            const m = ROLE_META[r];
            return (
              <TouchableOpacity key={r} style={[s.chip, roleFilter === r && { backgroundColor: (m?.color || colors.primary) + '18', borderColor: m?.color || colors.primary }]} onPress={() => setRoleFilter(r)}>
                <Text style={[s.chipTxt, roleFilter === r && { color: m?.color || colors.primary, fontFamily: fonts.bodyBold }]}>{r}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={s.empty}>No users found.</Text>}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* Role picker modal */}
      <Modal visible={!!roleModal} animationType="slide" transparent onRequestClose={() => setRoleModal(null)}>
        <View style={s.overlay}>
          <View style={[s.sheet, { maxWidth: Math.min(width - 24, 440) }]}>
            <View style={s.sheetHead}>
              <View>
                <Text style={s.sheetTitle}>Change Role</Text>
                <Text style={s.sheetSub}>{roleModal?.user?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setRoleModal(null)} style={s.cancelBtn}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {ROLES.map(r => {
                const m = ROLE_META[r] || ROLE_META.user;
                const selected = roleModal?.selectedRole === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[s.roleRow, selected && { backgroundColor: m.color + '10', borderColor: m.color }]}
                    onPress={() => setRoleModal(prev => ({ ...prev, selectedRole: r }))}
                  >
                    <View style={[s.roleRowIcon, { backgroundColor: m.color + '18' }]}>
                      <Ionicons name={m.icon + '-outline'} size={20} color={m.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.roleRowLabel, { color: selected ? m.color : colors.textPrimary }]}>{r}</Text>
                      <Text style={s.roleRowDesc}>{m.desc}</Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={20} color={m.color} />}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: ROLE_META[roleModal?.selectedRole]?.color || colors.primary }]}
                onPress={() => applyRole(roleModal?.user?._id, roleModal?.selectedRole)}
                disabled={roleModal?.selectedRole === roleModal?.user?.role}
              >
                <Text style={s.saveBtnTxt}>
                  {roleModal?.selectedRole === roleModal?.user?.role ? 'No Changes' : `Set to "${roleModal?.selectedRole}"`}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AdminShell>
  );
}

const s = StyleSheet.create({
  searchBar:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: colors.borderSubtle, marginTop: 4 },
  searchInput:{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  chip:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, marginRight: 6, alignSelf: 'flex-start' },
  chipTxt:    { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textTransform: 'capitalize' },
  card:       { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, ...shadow.soft },
  cardRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roleIcon:   { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  name:       { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  sub:        { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  rightCol:   { alignItems: 'flex-end', gap: 6 },
  rolePill:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  rolePillTxt:{ fontFamily: fonts.bodyBold, fontSize: 10, textTransform: 'capitalize' },
  changeBtn:  { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary, minWidth: 64, alignItems: 'center' },
  changeBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primary },
  empty:      { textAlign: 'center', fontFamily: fonts.body, color: colors.textSecondary, marginTop: 40 },

  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet:      { width: '100%', backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: 20, maxHeight: '90%' },
  sheetHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
  sheetSub:   { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  roleRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: 'transparent', marginBottom: 8 },
  roleRowIcon:{ width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  roleRowLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary, textTransform: 'capitalize' },
  roleRowDesc:{ fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  saveBtn:    { borderRadius: radius.pill, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnTxt: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15 },
  cancelBtn:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.bg },
  cancelText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
});
