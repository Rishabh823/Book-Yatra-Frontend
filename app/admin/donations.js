import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminShell, StatCard } from '../../lib/AdminScreen';
import { colors, fonts, radius, shadow } from '../../lib/theme';
import { donations as donationsApi } from '../../lib/api';
import { fmtDate, fmtCurrency } from '../../lib/utils';

export default function AdminDonations() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await donationsApi.publicStats();
      setStats(res?.data || res);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) return (
    <AdminShell title="Donations" subtitle="Donation records">
      <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
    </AdminShell>
  );

  return (
    <AdminShell title="Donations" subtitle="Donation overview">
      <View style={{ paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <StatCard label="Total Raised" value={fmtCurrency(stats?.totalAmount)} icon="cash" color="#16A34A" />
          <StatCard label="Donors" value={stats?.totalDonors ?? '—'} icon="people" color={colors.primary} />
        </View>

        {stats?.recentDonations?.length ? (
          <>
            <Text style={s.sectionLabel}>· Recent Donations ·</Text>
            {stats.recentDonations.map((d, i) => (
              <View key={i} style={s.card}>
                <View style={s.initials}><Text style={s.initial}>{(d.donorName || 'D').charAt(0).toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{d.donorName}</Text>
                  <Text style={s.date}>{fmtDate(d.createdAt)}</Text>
                </View>
                <Text style={s.amount}>{fmtCurrency(d.amount)}</Text>
              </View>
            ))}
          </>
        ) : (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Ionicons name="cash-outline" size={48} color={colors.textDisabled} />
            <Text style={{ fontFamily: fonts.body, color: colors.textSecondary, marginTop: 8 }}>No donation records</Text>
          </View>
        )}
      </View>
    </AdminShell>
  );
}

const s = StyleSheet.create({
  sectionLabel: { fontFamily: fonts.accent, fontSize: 11, color: colors.textSecondary, letterSpacing: 3, marginBottom: 14 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, gap: 12, marginBottom: 10, ...shadow.soft },
  initials: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.heading, fontSize: 18, color: '#16A34A' },
  name: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  date: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  amount: { fontFamily: fonts.heading, fontSize: 18, color: '#16A34A' },
});
