import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, TextInput, ScrollView, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AdminShell } from '../../../lib/AdminScreen';
import { fonts, radius } from '../../../lib/theme';
import { useColors } from '../../../lib/ThemeContext';
import { superAdmin as superApi } from '../../../lib/api';

const STATUSES = ['all', 'pending', 'confirmed', 'checked_in', 'cancelled'];
const STATUS_COLORS = {
  confirmed: { bg: '#DCFCE7', text: '#16A34A' },
  pending:   { bg: '#FEF9C3', text: '#CA8A04' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626' },
};

export default function SuperBookings() {
  const router = useRouter();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const px = width >= 600 ? 20 : 12;

  const [items, setItems]         = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const s = useMemo(() => makeStyles(colors), [colors]);

  const load = async () => {
    try {
      const data = await superApi.allBookings();
      const list = Array.isArray(data) ? data : (data?.bookings || data?.data || []);
      setItems(list);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(items.filter(b => {
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchSearch = !q ||
        (b.user?.name || b.name || '').toLowerCase().includes(q) ||
        (b.tour?.title || b.tourTitle || '').toLowerCase().includes(q) ||
        (b._id || '').includes(q);
      return matchStatus && matchSearch;
    }));
  }, [search, statusFilter, items]);

  // Stats
  const stats = {
    confirmed: items.filter(b => b.status === 'confirmed').length,
    pending: items.filter(b => b.status === 'pending').length,
    cancelled: items.filter(b => b.status === 'cancelled').length,
    revenue: items.filter(b => b.paymentStatus === 'paid').reduce((sum, b) => sum + (b.totalAmount || b.amountPaid || 0), 0),
  };

  const renderItem = useCallback(({ item }) => {
    const sc = STATUS_COLORS[item.status] || { bg: colors.elevated, text: colors.textSecondary };
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : '—';
    return (
      <TouchableOpacity
        style={[s.card, { marginHorizontal: px }]}
        onPress={() => router.push(`/booking/${item._id}`)}
        activeOpacity={0.85}
      >
        <View style={s.cardRow}>
          <View style={s.idBadge}>
            <Text style={s.idText}>#{item._id?.slice(-5).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={1}>{item.tour?.title || item.tourTitle || 'Tour'}</Text>
            <Text style={s.sub} numberOfLines={1}>{item.user?.name || item.name || 'User'}</Text>
            <Text style={s.sub}>{dateStr}</Text>
          </View>
          <View style={s.rightCol}>
            <Text style={s.amount}>₹{item.totalAmount || 0}</Text>
            <View style={[s.sBadge, { backgroundColor: sc.bg }]}>
              <Text style={[s.sBadgeTxt, { color: sc.text }]}>{item.status || 'pending'}</Text>
            </View>
            <View style={s.payRow}>
              <Ionicons
                name={item.paymentStatus === 'paid' ? 'checkmark-circle' : 'time-outline'}
                size={11}
                color={item.paymentStatus === 'paid' ? '#16A34A' : '#D97706'}
              />
              <Text style={[s.payTxt, { color: item.paymentStatus === 'paid' ? '#16A34A' : '#D97706' }]}>
                {item.paymentStatus || 'unpaid'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} style={{ marginLeft: 4 }} />
        </View>
        {item.refundRequestStatus && item.refundRequestStatus !== 'none' && (
          <View style={s.refundNote}>
            <Ionicons name="return-down-back-outline" size={12} color="#D97706" />
            <Text style={s.refundNoteTxt}>Refund: {item.refundRequestStatus}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [px, router, s, colors]);

  return (
    <AdminShell title="All Bookings" subtitle={`${filtered.length} of ${items.length}`}>
      {/* Stats strip */}
      <View style={[s.statsRow, { marginHorizontal: px }]}>
        {[
          { label: 'Confirmed', value: stats.confirmed, color: '#16A34A' },
          { label: 'Pending', value: stats.pending, color: '#D97706' },
          { label: 'Cancelled', value: stats.cancelled, color: '#DC2626' },
          { label: 'Revenue', value: `₹${(stats.revenue/1000).toFixed(0)}k`, color: colors.primary },
        ].map(st => (
          <View key={st.label} style={s.statItem}>
            <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: px, gap: 8, marginBottom: 4 }}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search user, tour, ID..."
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
          {STATUSES.map(st => (
            <TouchableOpacity key={st} style={[s.chip, statusFilter === st && s.chipActive]} onPress={() => setStatusFilter(st)}>
              <Text style={[s.chipTxt, statusFilter === st && s.chipTxtActive]}>{st}</Text>
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
          ListEmptyComponent={<Text style={s.empty}>No bookings found.</Text>}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </AdminShell>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  statsRow:   { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginBottom: 8, marginTop: 4, borderWidth: 1, borderColor: colors.borderSubtle },
  statItem:   { flex: 1, alignItems: 'center' },
  statValue:  { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
  statLabel:  { fontFamily: fonts.body, fontSize: 10, color: colors.textSecondary, marginTop: 1 },

  searchBar:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: colors.borderSubtle, marginTop: 4 },
  searchInput:{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  chip:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, marginRight: 6, alignSelf: 'flex-start' },
  chipActive: { backgroundColor: colors.primary + '18', borderColor: colors.primary },
  chipTxt:    { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textTransform: 'capitalize' },
  chipTxtActive: { color: colors.primary, fontFamily: fonts.bodyBold },

  card:       { backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.borderSubtle },
  cardRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  idBadge:    { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary + '14', alignItems: 'center', justifyContent: 'center' },
  idText:     { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.primary },
  name:       { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  sub:        { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  rightCol:   { alignItems: 'flex-end', gap: 2 },
  amount:     { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  sBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  sBadgeTxt:  { fontFamily: fonts.bodyBold, fontSize: 10, textTransform: 'capitalize' },
  payRow:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  payTxt:     { fontFamily: fonts.body, fontSize: 10 },
  refundNote: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  refundNoteTxt: { fontFamily: fonts.body, fontSize: 11, color: '#D97706' },
  empty:      { textAlign: 'center', fontFamily: fonts.body, color: colors.textSecondary, marginTop: 40 },
});
