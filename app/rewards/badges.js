import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../lib/api';
import { colors, fonts, radius, shadow } from '../../lib/theme';

const CATEGORIES = [
  { k: 'all',       label: 'All',       icon: 'apps-outline' },
  { k: 'booking',   label: 'Booking',   icon: 'ticket-outline' },
  { k: 'travel',    label: 'Travel',    icon: 'airplane-outline' },
  { k: 'community', label: 'Community', icon: 'people-outline' },
  { k: 'safety',    label: 'Safety',    icon: 'shield-outline' },
  { k: 'loyalty',   label: 'Loyalty',   icon: 'star-outline' },
  { k: 'volunteer', label: 'Volunteer', icon: 'hand-left-outline' },
];

const CAT_COLORS = {
  booking:   '#7C3AED',
  travel:    '#2563EB',
  community: '#D95D39',
  safety:    '#16A34A',
  loyalty:   '#D97706',
  volunteer: '#0891B2',
};

// Fallback badges shown when DB has no seeded data
const DEMO_BADGES = [
  { key: 'first_booking',    name: 'First Journey',   icon: '🎫', category: 'booking',   points: 50,  description: 'Complete your first booking', earned: false },
  { key: 'third_booking',    name: 'Explorer',        icon: '🗺️', category: 'booking',   points: 100, description: 'Complete 3 bookings',          earned: false },
  { key: 'first_review',     name: 'Storyteller',     icon: '📝', category: 'community', points: 30,  description: 'Write your first review',      earned: false },
  { key: 'community_star',   name: 'Community Star',  icon: '⭐', category: 'community', points: 75,  description: 'Get 10 likes on your posts',   earned: false },
  { key: 'safe_traveler',    name: 'Safe Traveler',   icon: '🛡️', category: 'safety',    points: 60,  description: 'Complete safety check-in',     earned: false },
  { key: 'loyal_devotee',    name: 'Loyal Devotee',   icon: '🏆', category: 'loyalty',   points: 200, description: 'Reach Gold tier',              earned: false },
  { key: 'volunteer_hero',   name: 'Volunteer Hero',  icon: '🙏', category: 'volunteer', points: 150, description: 'Complete 5 volunteer sessions', earned: false },
  { key: 'pilgrim_heart',    name: 'Pilgrim Heart',   icon: '❤️', category: 'travel',    points: 80,  description: 'Join a pilgrimage tour',       earned: false },
];

export default function BadgesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(null);

  useFocusEffect(useCallback(() => {
    api.get('/gamification/badges')
      .then(res => {
        const data = res.data || res;
        const list = Array.isArray(data) ? data : [];
        setBadges(list.length > 0 ? list : DEMO_BADGES);
      })
      .catch(() => setBadges(DEMO_BADGES))
      .finally(() => setLoading(false));
  }, []));

  const filtered = category === 'all' ? badges : badges.filter(b => b.category === category);
  const earned = badges.filter(b => b.earned).length;

  const catColor = CAT_COLORS[selected?.category] || colors.primary;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={['#1E0A0A', '#5C1615']} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>My Badges</Text>
          <Text style={s.subtitle}>{earned} of {badges.length} earned</Text>
        </View>
        <View style={s.earnedCircle}>
          <Text style={s.earnedNum}>{earned}</Text>
          <Text style={s.earnedLabel}>earned</Text>
        </View>
      </LinearGradient>

      {/* Progress bar */}
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: badges.length > 0 ? `${(earned / badges.length) * 100}%` : '0%' }]} />
      </View>

      {/* Category filter chips */}
      <View style={s.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filtersContent}
        >
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.k}
              style={[s.catChip, category === c.k && s.catChipActive]}
              onPress={() => setCategory(c.k)}
            >
              <Ionicons name={c.icon} size={13} color={category === c.k ? 'white' : colors.textSecondary} />
              <Text style={[s.catText, category === c.k && s.catTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Badges grid */}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <Text style={s.sectionLabel}>
            {category === 'all' ? `All Badges (${filtered.length})` : `${CATEGORIES.find(c => c.k === category)?.label} (${filtered.length})`}
          </Text>
          <FlatList
            data={filtered}
            keyExtractor={item => item.key || item._id || String(Math.random())}
            renderItem={({ item }) => <BadgeCard badge={item} onPress={() => setSelected(item)} />}
            numColumns={3}
            columnWrapperStyle={s.gridRow}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 20, gap: 12 }}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={{ fontSize: 40 }}>🏅</Text>
                <Text style={s.emptyText}>No badges in this category</Text>
              </View>
            }
          />
        </>
      )}

      {/* Badge detail modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={[s.sheetAccent, { backgroundColor: catColor + '18' }]}>
              <Text style={s.modalIcon}>{selected?.icon || '🏅'}</Text>
            </View>
            <View style={[s.sheetBadge, { backgroundColor: selected?.earned ? '#D97706' : '#9CA3AF' }]}>
              <Text style={s.sheetBadgeText}>{selected?.earned ? 'Earned!' : 'Locked'}</Text>
            </View>
            <Text style={s.modalName}>{selected?.name}</Text>
            <Text style={s.modalDesc}>{selected?.description}</Text>
            <View style={s.modalMeta}>
              <View style={[s.pointsPill, { backgroundColor: catColor + '18' }]}>
                <Ionicons name="star" size={14} color={catColor} />
                <Text style={[s.pointsText, { color: catColor }]}>+{selected?.points || 0} pts when earned</Text>
              </View>
            </View>
            {selected?.earnedAt && (
              <Text style={s.earnedAt}>Earned on {new Date(selected.earnedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            )}
            <TouchableOpacity style={s.closeBtn} onPress={() => setSelected(null)}>
              <Text style={s.closeTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BadgeCard({ badge, onPress }) {
  const earned = badge.earned;
  const catColor = CAT_COLORS[badge.category] || colors.primary;
  return (
    <TouchableOpacity
      style={[s.card, earned && { borderColor: catColor, borderWidth: 2 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {earned && (
        <View style={[s.earnedDot, { backgroundColor: catColor }]} />
      )}
      <View style={[s.iconWrap, { backgroundColor: earned ? catColor + '18' : '#F3F4F6' }]}>
        <Text style={[s.badgeIcon, !earned && { opacity: 0.4 }]}>{badge.icon || '🏅'}</Text>
      </View>
      <Text style={[s.badgeName, !earned && s.lockedName]} numberOfLines={2}>{badge.name}</Text>
      {earned ? (
        <View style={[s.earnedTag, { backgroundColor: catColor + '18' }]}>
          <Ionicons name="checkmark-circle" size={10} color={catColor} />
          <Text style={[s.earnedTagText, { color: catColor }]}>Done</Text>
        </View>
      ) : (
        <View style={s.lockedTag}>
          <Ionicons name="lock-closed" size={10} color="#9CA3AF" />
          <Text style={s.lockedTagText}>+{badge.points}pts</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 16, paddingBottom: 18, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Philosopher_700Bold', fontSize: 20, color: 'white' },
  subtitle: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  earnedCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  earnedNum: { fontFamily: fonts.bodyBold, fontSize: 18, color: 'white' },
  earnedLabel: { fontFamily: fonts.body, fontSize: 9, color: 'rgba(255,255,255,0.7)' },

  progressBar: { height: 3, backgroundColor: '#E5E7EB', marginHorizontal: 0 },
  progressFill: { height: 3, backgroundColor: '#D97706', borderRadius: 2 },

  filtersWrapper: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filtersContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: '#F3F4F6' },
  catChipActive: { backgroundColor: colors.primary },
  catText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  catTextActive: { color: 'white' },

  sectionLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },

  gridRow: { gap: 12 },
  card: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    position: 'relative',
    minHeight: 110,
  },
  earnedDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  badgeIcon: { fontSize: 26 },
  badgeName: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#1F2937', textAlign: 'center', lineHeight: 15 },
  lockedName: { color: '#9CA3AF' },
  earnedTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  earnedTagText: { fontFamily: fonts.bodyBold, fontSize: 9 },
  lockedTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: '#F3F4F6' },
  lockedTagText: { fontFamily: fonts.bodyMedium, fontSize: 9, color: '#6B7280' },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, alignItems: 'center', gap: 10, paddingBottom: 36 },
  sheetAccent: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  modalIcon: { fontSize: 52 },
  sheetBadge: { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20 },
  sheetBadgeText: { fontFamily: fonts.bodyBold, fontSize: 13, color: 'white' },
  modalName: { fontFamily: 'Philosopher_700Bold', fontSize: 22, color: '#1F2937', textAlign: 'center' },
  modalDesc: { fontFamily: fonts.body, fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  modalMeta: { marginTop: 4 },
  pointsPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  pointsText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  earnedAt: { fontFamily: fonts.body, fontSize: 12, color: '#9CA3AF' },
  closeBtn: { marginTop: 8, paddingHorizontal: 32, paddingVertical: 13, backgroundColor: '#F3F4F6', borderRadius: 14, width: '100%', alignItems: 'center' },
  closeTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#374151' },
});
