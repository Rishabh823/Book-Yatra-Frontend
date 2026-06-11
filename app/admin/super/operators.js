import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, TextInput, Alert, Switch, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AdminShell } from '../../../lib/AdminScreen';
import { colors, fonts, radius, shadow } from '../../../lib/theme';
import { superAdmin as superApi } from '../../../lib/api';

export default function SuperOperators() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const px = width >= 600 ? 20 : 12;

  const [items, setItems]       = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]     = useState('');

  const load = async () => {
    try {
      const data = await superApi.operators();
      const list = Array.isArray(data) ? data : (data?.operators || []);
      setItems(list);
      setFiltered(list);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? items.filter(op =>
      (op.name || '').toLowerCase().includes(q) ||
      (op.businessName || '').toLowerCase().includes(q) ||
      (op.email || '').toLowerCase().includes(q) ||
      (op.phone || '').includes(q)
    ) : items);
  }, [search, items]);

  const toggleActive = async (op, e) => {
    e.stopPropagation?.();
    try {
      await superApi.updateUser(op._id, { isActive: !op.isActive });
      setItems(prev => prev.map(o => o._id === op._id ? { ...o, isActive: !o.isActive } : o));
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const renderItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={[s.card, { marginHorizontal: px }]}
      onPress={() => router.push(`/admin/super/operator/${item._id}`)}
      activeOpacity={0.85}
    >
      <View style={s.cardTop}>
        <View style={s.avatar}>
          <Text style={s.avatarTxt}>{(item.businessName || item.name || 'O')[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name} numberOfLines={1}>{item.businessName || item.name}</Text>
          <Text style={s.sub} numberOfLines={1}>{item.email}</Text>
          <Text style={s.sub}>{item.phone}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
      </View>

      <View style={s.cardFoot}>
        <View style={s.footItem}>
          <Ionicons name="bus-outline" size={12} color={colors.textSecondary} />
          <Text style={s.footTxt}>Tours: {item.tourCount ?? '—'}</Text>
        </View>
        <View style={s.footRight}>
          <Text style={[s.footTxt, { color: item.isActive !== false ? '#16A34A' : '#DC2626' }]}>
            {item.isActive !== false ? 'Active' : 'Inactive'}
          </Text>
          <Switch
            value={item.isActive !== false}
            onValueChange={() => toggleActive(item, {})}
            trackColor={{ false: '#FCA5A5', true: '#86EFAC' }}
            thumbColor={item.isActive !== false ? '#16A34A' : '#DC2626'}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>
      </View>
    </TouchableOpacity>
  ), [px, router]);

  return (
    <AdminShell title="All Operators" subtitle={`${filtered.length} operators`}>
      <View style={[s.searchBar, { marginHorizontal: px }]}>
        <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name, email, phone..."
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

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={s.empty}>No operators found.</Text>}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </AdminShell>
  );
}

const s = StyleSheet.create({
  searchBar:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: colors.borderSubtle, marginBottom: 4, marginTop: 4 },
  searchInput:{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },

  card:       { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, ...shadow.soft },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondary + '18', alignItems: 'center', justifyContent: 'center' },
  avatarTxt:  { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.secondary },
  name:       { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  sub:        { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 1 },

  cardFoot:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  footItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footTxt:    { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  footRight:  { flexDirection: 'row', alignItems: 'center', gap: 6 },

  empty:      { textAlign: 'center', fontFamily: fonts.body, color: colors.textSecondary, marginTop: 40 },
});
