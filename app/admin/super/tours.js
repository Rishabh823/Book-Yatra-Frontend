import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, TextInput, Alert, ScrollView, Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AdminShell } from '../../../lib/AdminScreen';
import { fonts, radius } from '../../../lib/theme';
import { useColors } from '../../../lib/ThemeContext';
import { superAdmin as superApi } from '../../../lib/api';

const TYPES = ['all', 'temple', 'pilgrimage', 'mountain', 'leisure', 'heritage', 'beach', 'other'];

export default function SuperTours() {
  const router = useRouter();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const px = width >= 600 ? 20 : 12;

  const TYPE_COLORS = {
    temple: '#D97706', pilgrimage: colors.primary, mountain: '#0284C7',
    leisure: '#16A34A', heritage: '#7C3AED', beach: '#0891B2', other: '#6B7280',
  };

  const [items, setItems]       = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const s = useMemo(() => makeStyles(colors), [colors]);

  const load = async () => {
    try {
      const data = await superApi.allTours();
      const list = Array.isArray(data) ? data : (data?.tours || []);
      setItems(list);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(items.filter(t => {
      const matchType = typeFilter === 'all' || t.tourType === typeFilter;
      const matchSearch = !q || (t.title || '').toLowerCase().includes(q) || (t.destination || '').toLowerCase().includes(q);
      return matchType && matchSearch;
    }));
  }, [search, typeFilter, items]);

  const onDelete = (tour, e) => {
    e?.stopPropagation?.();
    Alert.alert('Delete Tour', `Remove "${tour.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await superApi.deleteTour(tour._id); load(); }
        catch (e) { Alert.alert('Error', e.message || 'Delete failed'); }
      }},
    ]);
  };

  const renderItem = useCallback(({ item }) => {
    const color = TYPE_COLORS[item.tourType] || '#6B7280';
    const dateStr = item.startDate ? new Date(item.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    return (
      <TouchableOpacity
        style={[s.card, { marginHorizontal: px }]}
        onPress={() => router.push(`/admin/tour/${item._id}`)}
        activeOpacity={0.85}
      >
        <View style={{ position: 'relative' }}>
          {item.coverPhotoUrl ? (
            <Image source={{ uri: item.coverPhotoUrl }} style={s.thumb} />
          ) : (
            <View style={[s.thumbFallback, { backgroundColor: color + '18' }]}>
              <Ionicons name="bus-outline" size={28} color={color} />
            </View>
          )}
          {item.totalSeats ? (
            <View style={s.seatBadge}>
              <Text style={s.seatBadgeTxt}>{item.bookedSeats || 0}/{item.totalSeats}</Text>
            </View>
          ) : null}
        </View>
        <View style={s.cardBody}>
          <View style={s.cardTop}>
            <Text style={s.title} numberOfLines={2}>{item.title}</Text>
            <TouchableOpacity onPress={(e) => onDelete(item, e)} style={s.delBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
          <View style={s.row}>
            <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
            <Text style={s.sub} numberOfLines={1}>{item.destination || '—'}</Text>
          </View>
          <View style={s.row}>
            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
            <Text style={s.sub}>{dateStr}</Text>
          </View>
          {item.operator?.businessName || item.operator?.name ? (
            <View style={s.row}>
              <Ionicons name="business-outline" size={12} color={colors.textSecondary} />
              <Text style={s.sub} numberOfLines={1}>{item.operator?.businessName || item.operator?.name}</Text>
            </View>
          ) : null}
          <View style={s.foot}>
            <View style={[s.typeBadge, { backgroundColor: color + '18' }]}>
              <Text style={[s.typeText, { color }]}>{item.tourType || 'other'}</Text>
            </View>
            <Text style={s.price}>₹{item.price || 0}</Text>
            <Text style={s.seats}>{item.totalSeats || 0} seats</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} style={{ marginLeft: 'auto' }} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [px, router, s, colors, TYPE_COLORS]);

  return (
    <AdminShell title="All Tours" subtitle={`${filtered.length} of ${items.length}`}>
      <View style={{ paddingHorizontal: px, gap: 8, marginBottom: 4 }}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search title, destination..."
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TYPES.map(t => (
            <TouchableOpacity key={t} style={[s.chip, typeFilter === t && s.chipActive]} onPress={() => setTypeFilter(t)}>
              <Text style={[s.chipTxt, typeFilter === t && s.chipTxtActive]}>{t}</Text>
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
          ListEmptyComponent={<Text style={s.empty}>No tours found.</Text>}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </AdminShell>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  searchBar:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: colors.borderSubtle, marginTop: 4 },
  searchInput:{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  chip:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, marginRight: 6, alignSelf: 'flex-start' },
  chipActive: { backgroundColor: colors.primary + '18', borderColor: colors.primary },
  chipTxt:    { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textTransform: 'capitalize' },
  chipTxtActive: { color: colors.primary, fontFamily: fonts.bodyBold },
  card:       { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSubtle },
  thumb:      { width: '100%', height: 130, resizeMode: 'cover' },
  thumbFallback: { width: '100%', height: 90, alignItems: 'center', justifyContent: 'center' },
  seatBadge:  { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  seatBadgeTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#FFFFFF' },
  cardBody:   { padding: 12 },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  title:      { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  delBtn:     { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  sub:        { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, flex: 1 },
  foot:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  typeBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  typeText:   { fontFamily: fonts.bodyBold, fontSize: 10, textTransform: 'capitalize' },
  price:      { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary, marginLeft: 'auto' },
  seats:      { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  empty:      { textAlign: 'center', fontFamily: fonts.body, color: colors.textSecondary, marginTop: 40 },
});
