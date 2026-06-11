import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { colors, fonts, radius, shadow } from '../lib/theme';
import { resolveImageUrl } from '../lib/utils';

const FALLBACK = 'https://images.pexels.com/photos/11398067/pexels-photo-11398067.jpeg';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function Favorites() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tours,      setTours]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total,      setTotal]      = useState(0);

  const load = useCallback(async (reset = false) => {
    if (reset) setLoading(true);
    try {
      const p = reset ? 1 : page;
      // _t= busts HTTP 304 cache so deletions are always reflected
      const res = await api.get(`/preferences/favorites?page=${p}&limit=20&_t=${Date.now()}`);
      setTotal(res.total || 0);
      setHasMore(p < (res.pages || 1));
      setTours(prev => reset ? (res.tours || []) : [...prev, ...(res.tours || [])]);
      if (!reset) setPage(p + 1);
    } catch {}
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, [page]);

  useFocusEffect(useCallback(() => { load(true); }, []));

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    load(false);
  }, [hasMore, loadingMore, load]);

  const handleToggle = useCallback(async (id) => {
    const strId = String(id);
    // Optimistic: remove from list immediately
    setTours(prev => prev.filter(t => String(t._id) !== strId));
    setTotal(prev => Math.max(0, prev - 1));
    try {
      // Always DELETE — every item on this page is a favorite by definition
      await api.del(`/preferences/favorites/${strId}`);
    } catch {
      // Revert: reload the real list from server
      load(true);
    }
  }, [load]);

  const renderItem = ({ item }) => {
    const img = resolveImageUrl?.(item.images?.[0]) || FALLBACK;
    return (
      <TouchableOpacity
        style={[styles.card, shadow.card]}
        onPress={() => router.push(`/tour/${item._id}`)}
        activeOpacity={0.85}
      >
        <View style={styles.imgWrap}>
          <Image source={{ uri: img }} style={styles.img} defaultSource={{ uri: FALLBACK }} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFillObject} />
          {item.tourType && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{item.tourType}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.heartBtn} onPress={() => handleToggle(item._id)} activeOpacity={0.7}>
            <Ionicons name="heart" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <View style={styles.row}>
            <Ionicons name="location" size={12} color={colors.textSecondary} />
            <Text style={styles.meta} numberOfLines={1}>{item.source} → {item.destination}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.meta}>{fmtDate(item.startDate)}</Text>
          </View>
          <View style={styles.footer}>
            <Text style={styles.price}>{item.price || '₹—'}</Text>
            <Text style={styles.favDate}>Saved {fmtDate(item.favoritedAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={['#1E0A0A', '#5C1615']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View>
          <Text style={styles.heroTitle}>My Favorites</Text>
          <Text style={styles.heroSub}>{total} saved tour{total !== 1 ? 's' : ''}</Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={tours}
          keyExtractor={item => String(item._id)}
          renderItem={renderItem}
          numColumns={1}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="heart-outline" size={40} color={colors.textDisabled} />
              </View>
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptySub}>Tap the heart icon on any tour to save it here.</Text>
              <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)/tours')}>
                <Text style={styles.browseBtnText}>Browse Tours</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero:       { paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back:       { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroTitle:  { fontFamily: fonts.heading, fontSize: 22, color: 'white' },
  heroSub:    { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  card:    { backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' },
  imgWrap: { height: 180, position: 'relative' },
  img:     { width: '100%', height: '100%' },
  typeBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: 'white', textTransform: 'capitalize' },
  heartBtn: { position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },

  info:    { padding: 14, gap: 5 },
  title:   { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta:    { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, flex: 1 },
  footer:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  price:   { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primary },
  favDate: { fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled },

  empty:       { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon:   { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:  { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  emptySub:    { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  browseBtn:   { backgroundColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  browseBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: 'white' },
});
