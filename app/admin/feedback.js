import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminShell } from '../../lib/AdminScreen';
import { colors, fonts, radius, shadow } from '../../lib/theme';
import { feedback as feedbackApi } from '../../lib/api';
import { fmtDate } from '../../lib/utils';

const STAR_FILTERS = ['all', 5, 4, 3, 2, 1];
const CATEGORY_COLORS = {
  tour:    colors.primary,
  service: '#7C3AED',
  app:     '#0284C7',
  general: '#6B7280',
};

export default function AdminFeedback() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starFilter, setStarFilter] = useState('all');

  const load = async () => {
    try {
      const res = await feedbackApi.public(100, true);
      setItems(Array.isArray(res) ? res : res?.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = useMemo(() =>
    starFilter === 'all' ? items : items.filter(it => (it.rating || 5) === starFilter),
  [items, starFilter]);

  const avgRating = useMemo(() => {
    if (!items.length) return 0;
    return items.reduce((s, it) => s + (it.rating || 5), 0) / items.length;
  }, [items]);

  const ratingCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    items.forEach(it => { counts[it.rating || 5] = (counts[it.rating || 5] || 0) + 1; });
    return counts;
  }, [items]);

  return (
    <AdminShell title="Feedback" subtitle={`${items.length} submissions`}>
      {/* Avg rating hero */}
      {!loading && items.length > 0 && (
        <View style={s.ratingHero}>
          <View style={s.ratingLeft}>
            <Text style={s.bigRating}>{avgRating.toFixed(1)}</Text>
            <View style={s.starsRow}>
              {[1,2,3,4,5].map(n => (
                <Ionicons key={n} name="star" size={14} color={n <= Math.round(avgRating) ? '#F59E0B' : colors.borderSubtle} />
              ))}
            </View>
            <Text style={s.ratingSubtitle}>{items.length} reviews</Text>
          </View>
          <View style={s.ratingBars}>
            {[5,4,3,2,1].map(star => {
              const count = ratingCounts[star] || 0;
              const pct   = items.length ? count / items.length : 0;
              return (
                <View key={star} style={s.barRow}>
                  <Text style={s.barLabel}>{star}</Text>
                  <Ionicons name="star" size={9} color="#F59E0B" />
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${pct * 100}%` }]} />
                  </View>
                  <Text style={s.barCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Star filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        {STAR_FILTERS.map(sf => (
          <TouchableOpacity
            key={String(sf)}
            style={[s.chip, starFilter === sf && s.chipActive]}
            onPress={() => setStarFilter(sf)}
          >
            {sf !== 'all' && <Ionicons name="star" size={11} color={starFilter === sf ? colors.primary : '#F59E0B'} />}
            <Text style={[s.chipTxt, starFilter === sf && s.chipTxtActive]}>
              {sf === 'all' ? 'All' : String(sf)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => String(it._id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="star-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyTxt}>No feedback yet</Text>
            </View>
          }
          renderItem={({ item }) => {
            const rating   = item.rating || 5;
            const catColor = CATEGORY_COLORS[item.category?.split('-')[0]] || '#6B7280';
            return (
              <View style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.initials}>
                    <Text style={s.initialTxt}>{(item.name || 'F')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{item.name || '—'}</Text>
                    <Text style={s.meta} numberOfLines={1}>{item.email || '—'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={s.starsRow}>
                      {[1,2,3,4,5].map(n => (
                        <Ionicons key={n} name="star" size={13} color={n <= rating ? '#F59E0B' : colors.borderSubtle} />
                      ))}
                    </View>
                    <Text style={s.date}>{fmtDate(item.createdAt)}</Text>
                  </View>
                </View>
                {item.category && (
                  <View style={[s.catBadge, { backgroundColor: catColor + '15' }]}>
                    <Text style={[s.catTxt, { color: catColor }]}>{item.category.replace(/-/g, ' ')}</Text>
                  </View>
                )}
                {item.subject ? <Text style={s.subject}>{item.subject}</Text> : null}
                <Text style={s.message} numberOfLines={3}>{item.message}</Text>
              </View>
            );
          }}
        />
      )}
    </AdminShell>
  );
}

const s = StyleSheet.create({
  // Rating hero
  ratingHero:  { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16, gap: 16, ...shadow.soft },
  ratingLeft:  { alignItems: 'center', justifyContent: 'center', width: 80 },
  bigRating:   { fontFamily: fonts.heading, fontSize: 40, color: colors.textPrimary, letterSpacing: -1 },
  starsRow:    { flexDirection: 'row', gap: 2 },
  ratingSubtitle: { fontFamily: fonts.body, fontSize: 10, color: colors.textSecondary, marginTop: 3 },
  ratingBars:  { flex: 1, justifyContent: 'center', gap: 4 },
  barRow:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  barLabel:    { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.textSecondary, width: 8 },
  barTrack:    { flex: 1, height: 6, backgroundColor: colors.borderSubtle, borderRadius: 3, overflow: 'hidden' },
  barFill:     { height: 6, backgroundColor: '#F59E0B', borderRadius: 3, minWidth: 2 },
  barCount:    { fontFamily: fonts.body, fontSize: 10, color: colors.textSecondary, width: 20, textAlign: 'right' },

  // Filter chips
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, marginRight: 8, alignSelf: 'flex-start' },
  chipActive: { backgroundColor: colors.primary + '18', borderColor: colors.primary },
  chipTxt:    { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  chipTxtActive: { color: colors.primary, fontFamily: fonts.bodyBold },

  // Cards
  card:       { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 14, ...shadow.soft },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  initials:   { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary + '18', alignItems: 'center', justifyContent: 'center' },
  initialTxt: { fontFamily: fonts.heading, fontSize: 16, color: colors.secondary },
  name:       { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  meta:       { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  date:       { fontFamily: fonts.accent, fontSize: 9, color: colors.textDisabled, letterSpacing: 1 },
  catBadge:   { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, marginBottom: 6 },
  catTxt:     { fontFamily: fonts.bodyBold, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 },
  subject:    { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.secondary, marginBottom: 4 },
  message:    { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  empty:      { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTxt:   { fontFamily: fonts.body, color: colors.textSecondary },
});
