import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdminShell } from '../../lib/AdminScreen';
import { colors, fonts, radius, shadow } from '../../lib/theme';
import { api, auth as authApi } from '../../lib/api';

const ROLE_COLORS = {
  admin: '#DC2626',
  manager: '#EA580C',
  volunteer: '#16A34A',
  user: colors.textSecondary,
};

export default function AdminUsers() {
  const router = useRouter();
  const [items, setItems]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [search, setSearch]           = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState('manager');
  const [blocking, setBlocking]       = useState(null); // userId being toggled

  const isSuperAdmin = currentRole === 'super_admin';

  // current operator's id = the logged-in manager's _id
  const myOperatorId = currentUser?._id ? String(currentUser._id) : null;

  const loadMe = useCallback(async () => {
    const role = await authApi.getRole();
    setCurrentRole(role || 'manager');
    const stored = await AsyncStorage.getItem('user');
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/users');
      const all = Array.isArray(res) ? res : res?.data || res?.users || [];
      setItems(all);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    loadMe();
    load();
  }, [loadMe, load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadMe(), load()]);
    setRefreshing(false);
  };

  // Filter to only users who have joined the current operator (managers see their own users)
  const visibleItems = useMemo(() => {
    if (isSuperAdmin) return items; // super admin sees everyone
    if (!myOperatorId) return [];
    return items.filter(u => {
      if (!Array.isArray(u.joinedOperators)) return false;
      return u.joinedOperators.some(op =>
        (typeof op === 'object' ? String(op._id) : String(op)) === myOperatorId
      );
    });
  }, [items, myOperatorId, isSuperAdmin]);

  const filtered = useMemo(() => {
    if (!search.trim()) return visibleItems;
    const q = search.toLowerCase();
    return visibleItems.filter(u =>
      u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q)
    );
  }, [visibleItems, search]);

  const isBlockedByMe = (user) => {
    if (!myOperatorId) return false;
    const blocked = user.blockedByOperators || user.blockedOperators || [];
    return blocked.some(op =>
      (typeof op === 'object' ? String(op._id) : String(op)) === myOperatorId
    );
  };

  const toggleBlock = async (user) => {
    if (!myOperatorId) return;
    const blocked = isBlockedByMe(user);
    const action = blocked ? 'unblock' : 'block';
    Alert.alert(
      blocked ? 'Unblock User' : 'Block User',
      blocked
        ? `Allow ${user.name} to see your operator's tours again?`
        : `Block ${user.name} from seeing your operator's tours?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: blocked ? 'Unblock' : 'Block',
          style: blocked ? 'default' : 'destructive',
          onPress: async () => {
            setBlocking(String(user._id));
            try {
              await api.post(`/users/${user._id}/${action}-for-operator`, { operatorId: myOperatorId });
              // Optimistically update local state
              setItems(prev => prev.map(u => {
                if (String(u._id) !== String(user._id)) return u;
                const current = u.blockedByOperators || u.blockedOperators || [];
                const updated = blocked
                  ? current.filter(op => (typeof op === 'object' ? String(op._id) : String(op)) !== myOperatorId)
                  : [...current, myOperatorId];
                return { ...u, blockedByOperators: updated };
              }));
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to update block status.');
            } finally {
              setBlocking(null);
            }
          },
        },
      ]
    );
  };

  const deleteUser = (user) => {
    Alert.alert(
      'Delete User',
      `Permanently delete ${user.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.del(`/users/${user._id}`);
              setItems(prev => prev.filter(u => String(u._id) !== String(user._id)));
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to delete user.');
            }
          },
        },
      ]
    );
  };

  return (
    <AdminShell
      title="Users"
      subtitle={isSuperAdmin ? `${items.length} total accounts` : `${visibleItems.length} joined your operator`}
    >
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name, email or phone..."
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => String(it._id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={() => (
            <View style={s.empty}>
              <Ionicons name="person-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyText}>
                {!myOperatorId && !isSuperAdmin
                  ? 'Operator profile not found'
                  : 'No users found'}
              </Text>
              {!myOperatorId && !isSuperAdmin && (
                <Text style={s.emptySub}>Users who select your operator will appear here.</Text>
              )}
            </View>
          )}
          renderItem={({ item }) => {
            const blocked = isBlockedByMe(item);
            const isBlocking = blocking === String(item._id);
            return (
              <TouchableOpacity
                style={[s.card, blocked && s.cardBlocked]}
                onPress={() => router.push(`/admin/user/${item._id}`)}
                activeOpacity={0.85}
              >
                {/* Avatar */}
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={[s.avatar, blocked && { opacity: 0.5 }]} />
                ) : (
                  <View style={[s.avatar, s.avatarFallback, blocked && s.avatarBlocked]}>
                    <Text style={s.avatarText}>{(item.name || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                )}

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                    {blocked && (
                      <View style={s.blockedTag}>
                        <Ionicons name="ban" size={9} color="#DC2626" />
                        <Text style={s.blockedTagTxt}>Blocked</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.meta} numberOfLines={1}>{item.email || item.phone || '—'}</Text>
                  {item.phone && item.email && (
                    <Text style={s.metaSub} numberOfLines={1}>{item.phone}</Text>
                  )}
                </View>

                {/* Actions */}
                <View style={s.actions}>
                  <View style={[s.roleBadge, { backgroundColor: (ROLE_COLORS[item.role] || colors.textSecondary) + '18' }]}>
                    <Text style={[s.roleText, { color: ROLE_COLORS[item.role] || colors.textSecondary }]}>
                      {item.role || 'user'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    {/* Block/Unblock — manager & super_admin */}
                    {!isSuperAdmin || myOperatorId ? (
                      <TouchableOpacity
                        style={[s.actionBtn, blocked ? s.actionUnblock : s.actionBlock]}
                        onPress={() => toggleBlock(item)}
                        disabled={!!isBlocking}
                        hitSlop={6}
                      >
                        {isBlocking ? (
                          <ActivityIndicator size="small" color={blocked ? colors.primary : '#DC2626'} />
                        ) : (
                          <Ionicons
                            name={blocked ? 'lock-open-outline' : 'ban-outline'}
                            size={13}
                            color={blocked ? colors.primary : '#DC2626'}
                          />
                        )}
                      </TouchableOpacity>
                    ) : null}

                    {/* Delete — super_admin only */}
                    {isSuperAdmin && (
                      <TouchableOpacity
                        style={[s.actionBtn, s.actionDelete]}
                        onPress={() => deleteUser(item)}
                        hitSlop={6}
                      >
                        <Ionicons name="trash-outline" size={13} color="#DC2626" />
                      </TouchableOpacity>
                    )}

                    <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </AdminShell>
  );
}

const s = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 14,
    paddingHorizontal: 14, height: 46,
    backgroundColor: colors.surface, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, height: 46 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: 12, gap: 12, ...shadow.soft,
  },
  cardBlocked: { opacity: 0.72, borderWidth: 1, borderColor: '#FCA5A5' },

  avatar:         { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarBlocked:  { backgroundColor: '#9CA3AF' },
  avatarText: { fontFamily: fonts.heading, fontSize: 18, color: '#fff' },

  name: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary, flex: 1 },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  metaSub: { fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled, marginTop: 1 },

  blockedTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: '#FEE2E2', borderRadius: 999,
  },
  blockedTagTxt: { fontFamily: fonts.bodyBold, fontSize: 9, color: '#DC2626' },

  actions: { alignItems: 'flex-end' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  roleText: { fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'capitalize' },

  actionBtn: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBlock:   { backgroundColor: '#FEE2E2' },
  actionUnblock: { backgroundColor: colors.primaryLight || '#FFEEE8' },
  actionDelete:  { backgroundColor: '#FEE2E2' },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textSecondary, marginTop: 12 },
  emptySub: { fontFamily: fonts.body, fontSize: 13, color: colors.textDisabled, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
});
