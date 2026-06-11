import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../lib/api';
import { colors, fonts, radius, shadow } from '../../lib/theme';

const PODIUM_COLORS = ['#9CA3AF', '#D97706', '#CD7F32'];
const MEDALS = ['🥈', '🥇', '🥉'];

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [leaders, setLeaders] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p = period) => {
    try {
      const res = await api.get('/gamification/leaderboard?period=' + p + '&limit=50');
      setLeaders(res.data || []);
      setUserRank(res.userRank);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [period]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const changePeriod = (p) => { setPeriod(p); setLoading(true); load(p); };

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  const renderItem = ({ item, index }) => (
    <View style={[styles.rankRow, shadow.soft]}>
      <Text style={styles.rank}>#{index + 4}</Text>
      <View style={styles.avatar}><Text style={styles.avatarText}>{(item.userId?.name || 'U')[0].toUpperCase()}</Text></View>
      <Text style={styles.name} numberOfLines={1}>{item.userId?.name || 'Anonymous'}</Text>
      <View style={styles.pointsChip}><Text style={styles.pointsText}>{(item.points || 0).toLocaleString()} pts</Text></View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#92400E', '#D97706']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Leaderboard</Text>
        {userRank && <View style={styles.myRank}><Text style={styles.myRankText}>Rank #{userRank}</Text></View>}
      </LinearGradient>

      <View style={styles.periodTabs}>
        {['all','month','week'].map(p => (
          <TouchableOpacity key={p} style={[styles.tab, period === p && styles.tabActive]} onPress={() => changePeriod(p)}>
            <Text style={[styles.tabText, period === p && styles.tabTextActive]}>{p === 'all' ? 'All Time' : p === 'month' ? 'This Month' : 'This Week'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={rest}
          keyExtractor={(item, i) => String(item._id || i)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: insets.bottom + 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            top3.length >= 3 ? (
              <View style={styles.podium}>
                {/* 2nd place */}
                <View style={[styles.podiumItem, styles.podiumSecond]}>
                  <Text style={{ fontSize: 32 }}>{MEDALS[0]}</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>{top3[1]?.userId?.name || '—'}</Text>
                  <View style={[styles.podiumBase, { height: 60, backgroundColor: PODIUM_COLORS[0] }]}>
                    <Text style={styles.podiumRank}>#2</Text>
                    <Text style={styles.podiumPoints}>{(top3[1]?.points || 0).toLocaleString()}</Text>
                  </View>
                </View>
                {/* 1st place */}
                <View style={[styles.podiumItem, styles.podiumFirst]}>
                  <Text style={{ fontSize: 40 }}>{MEDALS[1]}</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>{top3[0]?.userId?.name || '—'}</Text>
                  <View style={[styles.podiumBase, { height: 80, backgroundColor: PODIUM_COLORS[1] }]}>
                    <Text style={styles.podiumRank}>#1</Text>
                    <Text style={styles.podiumPoints}>{(top3[0]?.points || 0).toLocaleString()}</Text>
                  </View>
                </View>
                {/* 3rd place */}
                <View style={[styles.podiumItem, styles.podiumThird]}>
                  <Text style={{ fontSize: 28 }}>{MEDALS[2]}</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>{top3[2]?.userId?.name || '—'}</Text>
                  <View style={[styles.podiumBase, { height: 50, backgroundColor: PODIUM_COLORS[2] }]}>
                    <Text style={styles.podiumRank}>#3</Text>
                    <Text style={styles.podiumPoints}>{(top3[2]?.points || 0).toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: 'Philosopher_700Bold', fontSize: 22, color: 'white' },
  myRank: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill },
  myRankText: { fontFamily: fonts.bodyBold, fontSize: 13, color: 'white' },
  periodTabs: { flexDirection: 'row', padding: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
  tabTextActive: { color: 'white' },
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, paddingBottom: 20, paddingTop: 10 },
  podiumItem: { alignItems: 'center', gap: 4, width: '30%' },
  podiumFirst: { marginBottom: 0 },
  podiumSecond: {}, podiumThird: {},
  podiumName: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textPrimary, textAlign: 'center' },
  podiumBase: { width: '100%', borderTopLeftRadius: 8, borderTopRightRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 8 },
  podiumRank: { fontFamily: fonts.bodyBold, fontSize: 16, color: 'white' },
  podiumPoints: { fontFamily: fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12 },
  rank: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSecondary, width: 30 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 14, color: 'white' },
  name: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary },
  pointsChip: { backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  pointsText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#D97706' },
});
