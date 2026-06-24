import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { AdminShell } from '../../lib/AdminScreen';
import { fonts } from '../../lib/theme';
import { useColors } from '../../lib/ThemeContext';
import { api } from '../../lib/api';

const MODULES = [
  { icon: 'ticket',         label: 'Bookings',  route: '/admin/bookings',  color: '#D95D39',  bg: '#FDECE7' },
  { icon: 'bus',            label: 'Tours',     route: '/admin/tours',     color: '#7C3AED',  bg: '#F5F3FF' },
  { icon: 'people',         label: 'Members',   route: '/admin/members',   color: '#16A34A',  bg: '#F0FDF4' },
  { icon: 'person',         label: 'Users',     route: '/admin/users',     color: '#0284C7',  bg: '#EFF6FF' },
  { icon: 'chatbubble',     label: 'Enquiries', route: '/admin/enquiries', color: '#D97706',  bg: '#FFFBEB' },
  { icon: 'star',           label: 'Feedback',  route: '/admin/feedback',  color: '#EA580C',  bg: '#FFF7ED' },
  { icon: 'images',         label: 'Gallery',   route: '/admin/gallery',   color: '#0891B2',  bg: '#ECFEFF' },
  { icon: 'shield-checkmark', label: 'Moderate', route: '/admin/community', color: '#7C3AED', bg: '#F5F3FF' },
  { icon: 'settings',       label: 'Settings',  route: '/admin/settings',  color: '#374151',  bg: '#FEF2F2' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const px = width >= 600 ? 24 : 16;
  const cardW = (width - px * 2 - 12 * 3) / 4;

  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const s = useMemo(() => makeStyles(colors), [colors]);

  const load = useCallback(async () => {
    try {
      const [bRes, sRes] = await Promise.allSettled([
        api.get('/bookings'),
        api.get('/settings'),
      ]);

      const bookings = bRes.status === 'fulfilled'
        ? (Array.isArray(bRes.value) ? bRes.value : bRes.value?.data || [])
        : [];

      const confirmed  = bookings.filter(b => b.status === 'confirmed').length;
      const pending    = bookings.filter(b => b.status === 'pending').length;
      const cancelled  = bookings.filter(b => b.status === 'cancelled').length;
      const revenue    = bookings
        .filter(b => b.paymentStatus === 'paid')
        .reduce((s, b) => s + (b.totalAmount || b.amountPaid || 0), 0);

      setStats({ total: bookings.length, confirmed, pending, cancelled, revenue });
      setRecentBookings(bookings.slice(-5).reverse());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const fmt = (n) => n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${n}`;
  const statusColor = (st) => ({
    confirmed: { bg: '#DCFCE7', text: '#16A34A' },
    pending:   { bg: '#FEF9C3', text: '#CA8A04' },
    cancelled: { bg: '#FEE2E2', text: '#DC2626' },
  }[st] || { bg: colors.elevated, text: colors.textSecondary });

  return (
    <AdminShell title="Admin Dashboard" subtitle="Your operator overview">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero stats banner */}
        <View style={{ paddingHorizontal: px, paddingTop: 4 }}>
          <View style={s.heroBanner}>
            <Text style={s.heroLabel}>TOTAL BOOKINGS</Text>
            <Text style={s.heroValue}>{loading ? '—' : stats?.total ?? 0}</Text>
            <Text style={s.heroSub}>for your operator's tours</Text>

            {!loading && stats && (
              <View style={s.heroStrip}>
                <HeroStat label="Confirmed" value={stats.confirmed} color="#16A34A" s={s} />
                <View style={s.heroDivider} />
                <HeroStat label="Pending" value={stats.pending} color="#D97706" s={s} />
                <View style={s.heroDivider} />
                <HeroStat label="Revenue" value={fmt(stats.revenue)} color="#0284C7" s={s} />
              </View>
            )}
          </View>
        </View>

        {/* Module grid */}
        <View style={{ paddingHorizontal: px, marginTop: 20 }}>
          <Text style={s.sectionLabel}>· Quick Access ·</Text>
          <View style={s.moduleGrid}>
            {MODULES.map((m, i) => (
              <TouchableOpacity
                key={i}
                style={[s.moduleCard, { width: cardW }]}
                onPress={() => router.push(m.route)}
                activeOpacity={0.8}
              >
                <View style={[s.moduleIcon, { backgroundColor: m.bg }]}>
                  <Ionicons name={m.icon} size={22} color={m.color} />
                </View>
                <Text style={s.moduleLabel} numberOfLines={1}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats row */}
        {!loading && stats && (
          <View style={{ paddingHorizontal: px, marginTop: 8 }}>
            <Text style={[s.sectionLabel, { marginTop: 8 }]}>· Booking Summary ·</Text>
            <View style={s.statsRow}>
              <StatPill icon="checkmark-circle" label="Confirmed" value={stats.confirmed} color="#16A34A" bg="#F0FDF4" s={s} colors={colors} />
              <StatPill icon="time"             label="Pending"   value={stats.pending}   color="#D97706" bg="#FFFBEB" s={s} colors={colors} />
              <StatPill icon="close-circle"     label="Cancelled" value={stats.cancelled} color="#DC2626" bg="#FEF2F2" s={s} colors={colors} />
            </View>
          </View>
        )}

        {/* Recent Bookings */}
        {recentBookings.length > 0 && (
          <View style={{ paddingHorizontal: px, marginTop: 16 }}>
            <View style={s.sectionHead}>
              <Text style={s.sectionLabel}>· Recent Bookings ·</Text>
              <TouchableOpacity onPress={() => router.push('/admin/bookings')}>
                <Text style={s.viewAll}>View all</Text>
              </TouchableOpacity>
            </View>
            {recentBookings.map((b, i) => {
              const sc = statusColor(b.status);
              return (
                <TouchableOpacity
                  key={b._id || i}
                  style={s.bookingRow}
                  onPress={() => router.push(`/admin/booking/${b._id}`)}
                  activeOpacity={0.82}
                >
                  <View style={s.bookingIdBadge}>
                    <Text style={s.bookingIdTxt}>#{String(b._id || '').slice(-5).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bookingName} numberOfLines={1}>{b.name || 'Passenger'}</Text>
                    <Text style={s.bookingSub}>{b.tourTitle || b.tour?.title || '—'} · {b.numberOfSeats || 1} seat{(b.numberOfSeats || 1) > 1 ? 's' : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={s.bookingAmount}>₹{b.totalAmount || 0}</Text>
                    <View style={[s.sBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.sBadgeTxt, { color: sc.text }]}>{b.status}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Full module list */}
        <View style={{ paddingHorizontal: px, marginTop: 20 }}>
          <Text style={s.sectionLabel}>· All Modules ·</Text>
          {MODULES.map((m, i) => (
            <TouchableOpacity
              key={i}
              style={s.listRow}
              onPress={() => router.push(m.route)}
              activeOpacity={0.82}
            >
              <View style={[s.listRowIcon, { backgroundColor: m.bg }]}>
                <Ionicons name={m.icon} size={20} color={m.color} />
              </View>
              <Text style={s.listRowLabel}>{m.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </AdminShell>
  );
}

function HeroStat({ label, value, color, s }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[s.heroStatValue, { color }]}>{value}</Text>
      <Text style={s.heroStatLabel}>{label}</Text>
    </View>
  );
}

function StatPill({ icon, label, value, color, bg, s, colors }) {
  return (
    <View style={[s.statPill, { backgroundColor: bg, borderWidth: 1, borderColor: colors.borderSubtle }]}>
      <View style={[s.statPillIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[s.statPillValue, { color }]}>{value}</Text>
      <Text style={s.statPillLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  // Hero
  heroBanner:  {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 16,
    padding: 20,
  },
  heroLabel:   { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.textDisabled, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  heroValue:   { fontFamily: fonts.heading, fontSize: 48, color: colors.textPrimary, letterSpacing: -1 },
  heroSub:     { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: 0 },
  heroStrip:   { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: 14, marginTop: 14 },
  heroDivider: { width: 1, backgroundColor: colors.borderSubtle },
  heroStatValue:{ fontFamily: fonts.heading, fontSize: 18 },
  heroStatLabel:{ fontFamily: fonts.body, fontSize: 10, color: colors.textDisabled, marginTop: 1 },

  // Section
  sectionLabel: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.textDisabled, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  sectionHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAll:      { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary },

  // Module grid
  moduleGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
  moduleCard:  { alignItems: 'center', gap: 8, backgroundColor: colors.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle },
  moduleIcon:  { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moduleLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textPrimary, textAlign: 'center' },

  // Stat pills
  statsRow:      { flexDirection: 'row', gap: 8 },
  statPill:      { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', gap: 4 },
  statPillIcon:  { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statPillValue: { fontFamily: fonts.heading, fontSize: 22 },
  statPillLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.textSecondary },

  // Recent bookings
  bookingRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle, padding: 12, marginBottom: 8 },
  bookingIdBadge:{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#D95D39' + '14', alignItems: 'center', justifyContent: 'center' },
  bookingIdTxt:  { fontFamily: fonts.bodyBold, fontSize: 10, color: '#D95D39' },
  bookingName:   { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  bookingSub:    { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  bookingAmount: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  sBadge:        { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  sBadgeTxt:     { fontFamily: fonts.bodyBold, fontSize: 10, textTransform: 'capitalize' },

  // List
  listRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle, gap: 14, marginBottom: 8 },
  listRowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listRowLabel:{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
});
