import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, useWindowDimensions, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { AdminShell } from '../../../lib/AdminScreen';
import { colors, fonts, radius, shadow } from '../../../lib/theme';
import { superAdmin as superApi } from '../../../lib/api';

const NAV = [
  { icon: 'business',         label: 'Operators', route: '/admin/super/operators', color: '#7C3AED', bg: '#F5F3FF' },
  { icon: 'people',           label: 'Users',     route: '/admin/super/users',     color: '#0284C7', bg: '#EFF6FF' },
  { icon: 'bus',              label: 'Tours',     route: '/admin/super/tours',     color: '#16A34A', bg: '#F0FDF4' },
  { icon: 'ticket',           label: 'Bookings',  route: '/admin/super/bookings',  color: colors.primary, bg: '#FDECE7' },
  { icon: 'shield-checkmark', label: 'Roles',     route: '/admin/super/roles',     color: '#D97706', bg: '#FFFBEB' },
  { icon: 'settings',         label: 'Settings',  route: '/admin/settings',        color: colors.secondary, bg: '#FEF2F2' },
];

const STATUS_COLOR = (s) => ({
  confirmed: { bg: '#DCFCE7', text: '#16A34A' },
  pending:   { bg: '#FEF9C3', text: '#CA8A04' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626' },
}[s] || { bg: '#F3F4F6', text: '#6B7280' });

export default function SuperDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const px = width >= 600 ? 24 : 16;
  const cardW = (width - px * 2 - 12 * 2) / 3;

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await superApi.stats();
      setStats(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const fmtRev = (n) => {
    if (!n) return '₹0';
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`;
    return `₹${n}`;
  };

  return (
    <AdminShell title="Platform Overview" subtitle="Super Admin · All Operators">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero gradient banner */}
        <View style={{ paddingHorizontal: px, paddingTop: 4 }}>
          <LinearGradient
            colors={['#1E0A0A', '#5C1615', '#9B2C1F']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[s.heroBanner, { borderRadius: radius.xxl }]}
          >
            <View style={s.heroDecor1} />
            <View style={s.heroDecor2} />
            <View style={s.heroTop}>
              <View>
                <Text style={s.heroLabel}>PLATFORM REVENUE</Text>
                <Text style={s.heroValue}>{loading ? '—' : fmtRev(stats?.totalRevenue)}</Text>
                <Text style={s.heroSub}>across all operators</Text>
              </View>
              <View style={s.heroShield}>
                <Ionicons name="shield-checkmark" size={32} color="#FFD700" />
              </View>
            </View>
            {!loading && stats && (
              <View style={s.heroStrip}>
                <HeroChip label="Operators" value={stats.totalOperators ?? 0} icon="business" />
                <View style={s.stripDiv} />
                <HeroChip label="Users" value={stats.totalUsers ?? 0} icon="people" />
                <View style={s.stripDiv} />
                <HeroChip label="Bookings" value={stats.totalBookings ?? 0} icon="ticket" />
                <View style={s.stripDiv} />
                <HeroChip label="Tours" value={stats.totalTours ?? 0} icon="bus" />
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Quick nav icon grid */}
        <View style={{ paddingHorizontal: px, marginTop: 20 }}>
          <Text style={s.sectionLabel}>· Quick Access ·</Text>
          <View style={s.navGrid}>
            {NAV.map((n, i) => (
              <TouchableOpacity
                key={i}
                style={[s.navCard, { width: cardW }]}
                onPress={() => router.push(n.route)}
                activeOpacity={0.8}
              >
                <View style={[s.navIcon, { backgroundColor: n.bg }]}>
                  <Ionicons name={n.icon} size={24} color={n.color} />
                </View>
                <Text style={s.navLabel} numberOfLines={1}>{n.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Platform-wide stats cards */}
        {!loading && stats && (
          <View style={{ paddingHorizontal: px, marginTop: 8 }}>
            <Text style={[s.sectionLabel, { marginTop: 8 }]}>· Platform Stats ·</Text>
            <View style={s.statsRow}>
              <StatCard label="Upcoming Tours" value={stats.upcomingTours ?? 0} icon="calendar" color="#0891B2" bg="#ECFEFF" />
              <StatCard label="Active Tours"   value={stats.activeTours ?? 0}   icon="bus"      color="#16A34A" bg="#F0FDF4" />
            </View>
          </View>
        )}

        {/* Recent Operators */}
        {!loading && stats?.recentOperators?.length > 0 && (
          <View style={{ paddingHorizontal: px, marginTop: 16 }}>
            <View style={s.sectionHead}>
              <Text style={s.sectionLabel}>· Recent Operators ·</Text>
              <TouchableOpacity onPress={() => router.push('/admin/super/operators')}>
                <Text style={s.viewAll}>View all</Text>
              </TouchableOpacity>
            </View>
            {stats.recentOperators.slice(0, 4).map((op, i) => (
              <TouchableOpacity
                key={op._id || i}
                style={s.rowCard}
                onPress={() => router.push(`/admin/super/operator/${op._id}`)}
                activeOpacity={0.82}
              >
                {op.photoUrl ? (
                  <Image source={{ uri: op.photoUrl }} style={s.rowAvatar} />
                ) : (
                  <View style={[s.rowAvatar, s.rowAvatarFallback]}>
                    <Text style={s.rowAvatarTxt}>{(op.businessName || op.name || 'O')[0].toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.rowName} numberOfLines={1}>{op.businessName || op.name || '—'}</Text>
                  <Text style={s.rowSub} numberOfLines={1}>{op.email || op.phone || '—'}</Text>
                </View>
                <View style={[s.statusPill, { backgroundColor: op.isActive ? '#DCFCE7' : '#FEE2E2' }]}>
                  <View style={[s.statusDot, { backgroundColor: op.isActive ? '#16A34A' : '#DC2626' }]} />
                  <Text style={[s.statusTxt, { color: op.isActive ? '#16A34A' : '#DC2626' }]}>
                    {op.isActive ? 'Active' : 'Off'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Bookings */}
        {!loading && stats?.recentBookings?.length > 0 && (
          <View style={{ paddingHorizontal: px, marginTop: 16 }}>
            <View style={s.sectionHead}>
              <Text style={s.sectionLabel}>· Recent Bookings ·</Text>
              <TouchableOpacity onPress={() => router.push('/admin/super/bookings')}>
                <Text style={s.viewAll}>View all</Text>
              </TouchableOpacity>
            </View>
            {stats.recentBookings.slice(0, 4).map((b, i) => {
              const sc = STATUS_COLOR(b.status);
              return (
                <TouchableOpacity
                  key={b._id || i}
                  style={s.rowCard}
                  onPress={() => router.push(`/admin/booking/${b._id}`)}
                  activeOpacity={0.82}
                >
                  <View style={s.bookingBadge}>
                    <Text style={s.bookingBadgeTxt}>#{String(b._id || '').slice(-4).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowName} numberOfLines={1}>{b.tour?.title || b.tourTitle || 'Tour'}</Text>
                    <Text style={s.rowSub}>{b.user?.name || b.name || 'User'} · ₹{b.totalAmount || 0}</Text>
                  </View>
                  <View style={[s.statusPill, { backgroundColor: sc.bg }]}>
                    <Text style={[s.statusTxt, { color: sc.text }]}>{b.status || 'pending'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {loading && (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        )}
      </ScrollView>
    </AdminShell>
  );
}

function HeroChip({ label, value, icon }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={s.heroChipValue}>{value}</Text>
      <Text style={s.heroChipLabel}>{label}</Text>
    </View>
  );
}

function StatCard({ label, value, icon, color, bg }) {
  return (
    <View style={[s.statCard, { backgroundColor: bg }]}>
      <View style={[s.statIcon, { backgroundColor: color + '25' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  // Hero
  heroBanner:  { padding: 22, overflow: 'hidden', position: 'relative' },
  heroDecor1:  { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)', top: -70, right: -50 },
  heroDecor2:  { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,215,0,0.06)', bottom: -30, left: -30 },
  heroTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  heroShield:  { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,215,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroLabel:   { fontFamily: fonts.accent, fontSize: 10, color: 'rgba(255,215,0,0.7)', letterSpacing: 2.5, marginBottom: 4 },
  heroValue:   { fontFamily: fonts.heading, fontSize: 40, color: '#fff', letterSpacing: -1 },
  heroSub:     { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  heroStrip:   { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 4 },
  stripDiv:    { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  heroChipValue: { fontFamily: fonts.heading, fontSize: 18, color: '#fff' },
  heroChipLabel: { fontFamily: fonts.body, fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  // Section
  sectionLabel: { fontFamily: fonts.accent, fontSize: 10, color: colors.textSecondary, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 12 },
  sectionHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAll:      { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary },

  // Nav grid
  navGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
  navCard:  { alignItems: 'center', gap: 8, backgroundColor: colors.surface, paddingVertical: 14, paddingHorizontal: 8, borderRadius: radius.xl, ...shadow.soft },
  navIcon:  { width: 50, height: 50, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textPrimary, textAlign: 'center' },

  // Stat cards
  statsRow:  { flexDirection: 'row', gap: 10 },
  statCard:  { flex: 1, borderRadius: radius.xl, padding: 16, alignItems: 'center', gap: 6 },
  statIcon:  { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statValue: { fontFamily: fonts.heading, fontSize: 26 },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textAlign: 'center' },

  // Row cards
  rowCard:         { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, marginBottom: 8, ...shadow.soft },
  rowAvatar:       { width: 40, height: 40, borderRadius: 20 },
  rowAvatarFallback: { backgroundColor: colors.secondary + '18', alignItems: 'center', justifyContent: 'center' },
  rowAvatarTxt:    { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.secondary },
  rowName:         { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  rowSub:          { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  statusPill:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  statusDot:       { width: 5, height: 5, borderRadius: 3 },
  statusTxt:       { fontFamily: fonts.bodyBold, fontSize: 10, textTransform: 'capitalize' },
  bookingBadge:    { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primary + '14', alignItems: 'center', justifyContent: 'center' },
  bookingBadgeTxt: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.primary },
});
