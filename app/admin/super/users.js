import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, TextInput, ScrollView, Image, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AdminShell } from '../../../lib/AdminScreen';
import { colors, fonts, radius } from '../../../lib/theme';
import { superAdmin as superApi } from '../../../lib/api';

const ROLES = ['user', 'guest', 'volunteer', 'manager', 'admin', 'super_admin'];
const ROLE_COLORS = {
  super_admin: '#7C3AED', admin: '#D97706', manager: '#0284C7',
  volunteer: '#16A34A', user: '#6B7280', guest: '#9CA3AF',
};

export default function SuperUsers() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const px = width >= 600 ? 20 : 12;

  const [items, setItems]       = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

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
      const matchSearch = !q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.phone || '').includes(q);
      return matchRole && matchSearch;
    }));
  }, [search, roleFilter, items]);

  const renderItem = useCallback(({ item }) => {
    const roleColor = ROLE_COLORS[item.role] || '#6B7280';
    return (
      <TouchableOpacity
        style={[s.card, { marginHorizontal: px }]}
        onPress={() => router.push(`/admin/user/${item._id}`)}
        activeOpacity={0.85}
      >
        <View style={s.cardRow}>
          {/* Avatar */}
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback, { backgroundColor: roleColor + '22' }]}>
              <Text style={[s.avatarTxt, { color: roleColor }]}>{(item.name || 'U')[0].toUpperCase()}</Text>
            </View>
          )}

          {/* Info */}
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={1}>{item.name}</Text>
            <Text style={s.sub} numberOfLines={1}>{item.email}</Text>
            {item.phone ? <Text style={s.sub}>{item.phone}</Text> : null}
          </View>

          {/* Right */}
          <View style={s.right}>
            <View style={[s.roleBadge, { backgroundColor: roleColor + '18' }]}>
              <Text style={[s.roleText, { color: roleColor }]}>{item.role}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} style={{ marginTop: 4 }} />
          </View>
        </View>

        <View style={s.foot}>
          <View style={s.footItem}>
            <Ionicons name="business-outline" size={11} color={colors.textDisabled} />
            <Text style={s.footTxt}>{item.joinedOperators?.length || 0} operators</Text>
          </View>
          <View style={[s.activeDot, { backgroundColor: item.isActive !== false ? '#16A34A' : '#DC2626' }]} />
          <Text style={[s.footTxt, { color: item.isActive !== false ? '#16A34A' : '#DC2626' }]}>
            {item.isActive !== false ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [px, router]);

  return (
    <AdminShell title="All Users" subtitle={`${filtered.length} of ${items.length}`}>
      <View style={{ paddingHorizontal: px, gap: 8, marginBottom: 4 }}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search name, email, phone..."
            placeholderTextColor={colors.textDisabled}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 2 }}>
          {['all', ...ROLES].map(r => (
            <TouchableOpacity key={r} style={[s.chip, roleFilter === r && s.chipActive]} onPress={() => setRoleFilter(r)}>
              <Text style={[s.chipTxt, roleFilter === r && s.chipTxtActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
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
    </AdminShell>
  );
}

const s = StyleSheet.create({
  searchBar:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: colors.borderSubtle },
  searchInput:  { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  chip:         { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, marginRight: 6, alignSelf: 'flex-start' },
  chipActive:   { backgroundColor: colors.primary + '18', borderColor: colors.primary },
  chipTxt:      { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textTransform: 'capitalize' },
  chipTxtActive:{ color: colors.primary, fontFamily: fonts.bodyBold },

  card:         { backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  cardRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:       { width: 44, height: 44, borderRadius: 22 },
  avatarFallback:{ alignItems: 'center', justifyContent: 'center' },
  avatarTxt:    { fontFamily: fonts.bodyBold, fontSize: 17 },
  name:         { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  sub:          { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  right:        { alignItems: 'flex-end' },
  roleBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  roleText:     { fontFamily: fonts.bodyBold, fontSize: 10, textTransform: 'capitalize' },

  foot:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  footItem:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  footTxt:      { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  activeDot:    { width: 6, height: 6, borderRadius: 3, marginLeft: 6 },

  empty:        { textAlign: 'center', fontFamily: fonts.body, color: colors.textSecondary, marginTop: 40 },
});
