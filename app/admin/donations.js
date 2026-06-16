import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminShell, StatCard } from '../../lib/AdminScreen';
import { colors, fonts, radius, shadow } from '../../lib/theme';
import { donations as donationsApi } from '../../lib/api';
import { fmtDate, fmtCurrency } from '../../lib/utils';

const CATEGORY_META = {
  temple:    { label: 'Temple Seva',      color: '#D95D39', icon: 'flower' },
  medical:   { label: 'Medical Aid',      color: '#EF4444', icon: 'medkit' },
  marriage:  { label: 'Vivah Sahayata',   color: '#EC4899', icon: 'heart' },
  education: { label: 'Shiksha Daan',     color: '#0284C7', icon: 'school' },
  festival:  { label: 'Festival Utsav',   color: '#F59E0B', icon: 'sparkles' },
  general:   { label: 'Samagra Daan',     color: '#7C3AED', icon: 'hand-left' },
};

const STATUS_META = {
  pending:   { color: '#D97706', label: 'Pending' },
  completed: { color: '#16A34A', label: 'Completed' },
  failed:    { color: '#EF4444', label: 'Failed' },
  verified:  { color: '#0284C7', label: 'Verified' },
};

export default function AdminDonations() {
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const load = async () => {
    try {
      const [donRes, statsRes] = await Promise.allSettled([
        donationsApi.getAll({ limit: 100 }),
        donationsApi.adminStats().catch(() => donationsApi.publicStats()),
      ]);

      if (donRes.status === 'fulfilled') {
        const data = donRes.value?.data;
        setDonations(Array.isArray(data) ? data : Array.isArray(data?.donations) ? data.donations : []);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value?.data || statsRes.value);
      }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = activeFilter === 'all'
    ? donations
    : donations.filter((d) => d.donationType === activeFilter);

  const totalFiltered = filtered.reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <AdminShell title="Donations" subtitle="Donation management & records">
      <View style={{ paddingHorizontal: 16 }}>
        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <StatCard
            label="Total Raised"
            value={fmtCurrency(stats?.totalAmount ?? stats?.total)}
            icon="cash"
            color="#16A34A"
          />
          <StatCard
            label="Donors"
            value={stats?.totalDonors ?? stats?.count ?? donations.length}
            icon="people"
            color={colors.primary}
          />
        </View>

        {/* Category filter chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'all', label: 'All' }, ...Object.entries(CATEGORY_META).map(([id, m]) => ({ id, label: m.label }))]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
          renderItem={({ item }) => {
            const active = activeFilter === item.id;
            const meta = CATEGORY_META[item.id];
            return (
              <TouchableOpacity
                style={[s.chip, active && { backgroundColor: meta?.color || colors.primary, borderColor: meta?.color || colors.primary }]}
                onPress={() => setActiveFilter(item.id)}
              >
                {meta && <Ionicons name={meta.icon} size={13} color={active ? '#fff' : colors.textSecondary} />}
                <Text style={[s.chipTxt, active && s.chipTxtActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />

        {activeFilter !== 'all' && (
          <Text style={s.filterSummary}>
            {filtered.length} donation{filtered.length !== 1 ? 's' : ''} · {fmtCurrency(totalFiltered)} raised
          </Text>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item._id || String(i)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', paddingTop: 48 }}>
              <Ionicons name="cash-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyTxt}>No donations found</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const catMeta = CATEGORY_META[item.donationType] || CATEGORY_META.general;
            const statusMeta = STATUS_META[item.status] || STATUS_META.pending;
            return (
              <View style={[s.card, shadow.soft]}>
                {/* Category icon */}
                <View style={[s.iconBox, { backgroundColor: catMeta.color + '18' }]}>
                  <Ionicons name={catMeta.icon} size={20} color={catMeta.color} />
                </View>

                {/* Donor info */}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.donorName}>{item.donorName || '—'}</Text>
                  <Text style={s.catLabel}>{catMeta.label}</Text>
                  {item.donorEmail ? <Text style={s.donorMeta}>{item.donorEmail}</Text> : null}
                  {item.donorPhone ? <Text style={s.donorMeta}>{item.donorPhone}</Text> : null}
                  {item.message ? (
                    <Text style={s.messageTxt} numberOfLines={2}>"{item.message}"</Text>
                  ) : null}
                  <Text style={s.dateTxt}>{fmtDate(item.createdAt)}</Text>
                </View>

                {/* Right: amount + status */}
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.amount}>{fmtCurrency(item.amount)}</Text>
                  <View style={[s.statusBadge, { backgroundColor: statusMeta.color + '20' }]}>
                    <Text style={[s.statusTxt, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </AdminShell>
  );
}

const s = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  chipTxt: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  chipTxtActive: { color: 'white' },
  filterSummary: {
    fontFamily: fonts.bodyMedium, fontSize: 12,
    color: colors.textSecondary, marginBottom: 10,
  },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: 14, marginBottom: 10,
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  donorName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  catLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary },
  donorMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  messageTxt: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' },
  dateTxt: { fontFamily: fonts.body, fontSize: 10, color: colors.textDisabled, marginTop: 2 },
  amount: { fontFamily: fonts.heading, fontSize: 17, color: '#16A34A' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusTxt: { fontFamily: fonts.bodyBold, fontSize: 10 },
  emptyTxt: { fontFamily: fonts.body, color: colors.textSecondary, marginTop: 8 },
});
