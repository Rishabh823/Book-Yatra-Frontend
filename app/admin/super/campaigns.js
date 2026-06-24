import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, TextInput, ScrollView, Alert, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AdminShell } from '../../../lib/AdminScreen';
import { fonts, radius } from '../../../lib/theme';
import { useColors, useTheme } from '../../../lib/ThemeContext';
import { superAdmin as superApi } from '../../../lib/api';

const STATUS_LIST = ['All', 'Draft', 'Scheduled', 'Sending', 'Sent', 'Failed', 'Active'];
const TYPE_LIST   = ['All', 'General', 'Coupon', 'Flash Sale', 'Wallet', 'Tour', 'Emergency'];

const STATUS_COLORS = {
  draft:            '#6B7280',
  scheduled:        '#D97706',
  sending:          '#3B82F6',
  sent:             '#16A34A',
  failed:           '#DC2626',
  active:           '#8B5CF6',
};

const TYPE_COLORS = {
  general:          '#6B7280',
  coupon:           '#D97706',
  flash_sale:       '#DC2626',
  wallet_cashback:  '#16A34A',
  tour_promotion:   '#D95D39',
  emergency:        '#9333EA',
};

const TYPE_LABEL_MAP = {
  general:         'General',
  coupon:          'Coupon',
  flash_sale:      'Flash Sale',
  wallet_cashback: 'Wallet',
  tour_promotion:  'Tour',
  emergency:       'Emergency',
};

const STATUS_KEY_MAP = {
  all:       'all',
  draft:     'draft',
  scheduled: 'scheduled',
  sending:   'sending',
  sent:      'sent',
  failed:    'failed',
  active:    'active',
};

export default function SuperCampaigns() {
  const router   = useRouter();
  const colors   = useColors();
  const { width } = useWindowDimensions();
  const px       = width >= 600 ? 20 : 12;

  const [items,      setItems]      = useState([]);
  const [filtered,   setFiltered]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter,   setTypeFilter]   = useState('all');

  const s = useMemo(() => makeStyles(colors), [colors]);

  const load = async () => {
    try {
      const data = await superApi.getCampaigns();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('getCampaigns error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      items.filter(c => {
        const matchStatus = statusFilter === 'all' || c.status === statusFilter;
        const matchType   = typeFilter   === 'all' || c.type   === typeFilter;
        const matchSearch = !q || (c.title || '').toLowerCase().includes(q);
        return matchStatus && matchType && matchSearch;
      })
    );
  }, [search, statusFilter, typeFilter, items]);

  const handleDelete = useCallback((id, title) => {
    Alert.alert(
      'Delete Campaign',
      `Are you sure you want to delete "${title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await superApi.deleteCampaign(id);
              await load();
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to delete campaign.');
            }
          },
        },
      ]
    );
  }, []);

  const handleSend = useCallback((id, title) => {
    Alert.alert(
      'Send Campaign',
      `Send "${title}" immediately to all target users?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Now',
          onPress: async () => {
            try {
              await superApi.sendCampaign(id);
              await load();
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to send campaign.');
            }
          },
        },
      ]
    );
  }, []);

  const renderItem = useCallback(({ item }) => {
    const statusColor = STATUS_COLORS[item.status] || '#6B7280';
    const typeColor   = TYPE_COLORS[item.type]     || '#6B7280';
    const typeLabel   = TYPE_LABEL_MAP[item.type]  || item.type || 'Unknown';

    const canSend   = item.status === 'draft' || item.status === 'scheduled';
    const canEdit   = item.status === 'draft';
    const canDelete = item.status === 'draft' || item.status === 'failed';

    return (
      <View style={[s.card, { marginHorizontal: px }]}>
        {/* Header row */}
        <View style={s.cardHeader}>
          <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={s.badgeRow}>
            <View style={[s.badge, { backgroundColor: typeColor + '22' }]}>
              <Text style={[s.badgeText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: statusColor + '22' }]}>
              <Text style={[s.badgeText, { color: statusColor }]}>
                {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Audience & schedule */}
        <View style={s.metaRow}>
          {item.audienceSegment ? (
            <View style={s.metaChip}>
              <Ionicons name="people-outline" size={12} color={colors.textSecondary} />
              <Text style={s.metaText}>{item.audienceSegment}</Text>
            </View>
          ) : null}
          {item.scheduledAt ? (
            <View style={s.metaChip}>
              <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
              <Text style={s.metaText}>
                {new Date(item.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          ) : item.scheduleType ? (
            <View style={s.metaChip}>
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
              <Text style={s.metaText}>{item.scheduleType}</Text>
            </View>
          ) : null}
        </View>

        {/* Analytics */}
        <View style={s.analyticsRow}>
          <View style={s.analyticsItem}>
            <Ionicons name="send-outline" size={13} color={colors.textSecondary} />
            <Text style={s.analyticsLabel}>Sent</Text>
            <Text style={s.analyticsValue}>{item.sentCount ?? 0}</Text>
          </View>
          <View style={s.analyticsItem}>
            <Ionicons name="eye-outline" size={13} color={colors.textSecondary} />
            <Text style={s.analyticsLabel}>Opened</Text>
            <Text style={s.analyticsValue}>{item.openedCount ?? 0}</Text>
          </View>
          {item.clickedCount !== undefined && (
            <View style={s.analyticsItem}>
              <Ionicons name="hand-left-outline" size={13} color={colors.textSecondary} />
              <Text style={s.analyticsLabel}>Clicked</Text>
              <Text style={s.analyticsValue}>{item.clickedCount ?? 0}</Text>
            </View>
          )}
        </View>

        {/* Coupon chip */}
        {item.couponCode ? (
          <View style={s.couponChip}>
            <Ionicons name="pricetag-outline" size={12} color={colors.primary} />
            <Text style={s.couponText}>{item.couponCode}</Text>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={s.actionRow}>
          {canSend && (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleSend(item._id, item.title)}
            >
              <Ionicons name="paper-plane-outline" size={13} color="#fff" />
              <Text style={s.actionBtnText}>Send</Text>
            </TouchableOpacity>
          )}
          {canEdit && (
            <TouchableOpacity
              style={[s.actionBtn, s.actionBtnOutline]}
              onPress={() => router.push(`/admin/super/campaign/edit?id=${item._id}`)}
            >
              <Ionicons name="pencil-outline" size={13} color={colors.textPrimary} />
              <Text style={[s.actionBtnText, { color: colors.textPrimary }]}>Edit</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.actionBtn, s.actionBtnOutline]}
            onPress={() => router.push(`/admin/super/campaign/${item._id}`)}
          >
            <Ionicons name="bar-chart-outline" size={13} color={colors.textPrimary} />
            <Text style={[s.actionBtnText, { color: colors.textPrimary }]}>Analytics</Text>
          </TouchableOpacity>
          {canDelete && (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: '#DC262622' }]}
              onPress={() => handleDelete(item._id, item.title)}
            >
              <Ionicons name="trash-outline" size={13} color="#DC2626" />
              <Text style={[s.actionBtnText, { color: '#DC2626' }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [colors, px, s, handleDelete, handleSend, router]);

  const ListHeader = useMemo(() => (
    <View style={{ paddingHorizontal: px }}>
      {/* Search bar */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search campaigns…"
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={{ paddingRight: 8 }}>
        {STATUS_LIST.map(label => {
          const key    = label.toLowerCase().replace(' ', '_');
          const active = statusFilter === (key === 'all' ? 'all' : key);
          const color  = key === 'all' ? colors.primary : STATUS_COLORS[key] || colors.primary;
          return (
            <TouchableOpacity
              key={label}
              style={[s.chip, active && { backgroundColor: color }]}
              onPress={() => setStatusFilter(key === 'all' ? 'all' : key)}
            >
              <Text style={[s.chipText, active && { color: '#fff' }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Type filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={{ paddingRight: 8 }}>
        {TYPE_LIST.map(label => {
          const key    = label.toLowerCase().replace(' ', '_');
          const active = typeFilter === (key === 'all' ? 'all' : key);
          const color  = key === 'all' ? colors.primary : TYPE_COLORS[key] || colors.primary;
          return (
            <TouchableOpacity
              key={label}
              style={[s.chip, active && { backgroundColor: color }]}
              onPress={() => setTypeFilter(key === 'all' ? 'all' : key)}
            >
              <Text style={[s.chipText, active && { color: '#fff' }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={s.countLabel}>{filtered.length} campaign{filtered.length !== 1 ? 's' : ''}</Text>
    </View>
  ), [px, s, colors, search, statusFilter, typeFilter, filtered.length]);

  const EmptyComponent = useMemo(() => (
    <View style={s.emptyState}>
      <Ionicons name="megaphone-outline" size={56} color={colors.textSecondary} />
      <Text style={s.emptyTitle}>No Campaigns Found</Text>
      <Text style={s.emptySubtitle}>
        {search || statusFilter !== 'all' || typeFilter !== 'all'
          ? 'Try adjusting your search or filters.'
          : 'Create your first campaign to engage users.'}
      </Text>
      {!search && statusFilter === 'all' && typeFilter === 'all' && (
        <TouchableOpacity
          style={s.emptyBtn}
          onPress={() => router.push('/admin/super/campaign/create')}
        >
          <Text style={s.emptyBtnText}>Create First Campaign</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [s, colors, search, statusFilter, typeFilter, router]);

  if (loading) {
    return (
      <AdminShell title="Campaigns">
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Campaigns">
      <View style={{ flex: 1 }}>
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={EmptyComponent}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />

        {/* FAB */}
        <TouchableOpacity
          style={s.fab}
          onPress={() => router.push('/admin/super/campaign/create')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </AdminShell>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.elevated || '#261D17',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderSubtle || '#2A201C',
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 10,
    },
    searchInput: {
      flex: 1,
      color: colors.textPrimary,
      fontFamily: fonts.regular,
      fontSize: 14,
    },

    chipScroll: { marginBottom: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: radius.full || 99,
      backgroundColor: colors.elevated || '#261D17',
      borderWidth: 1,
      borderColor: colors.borderSubtle || '#2A201C',
      marginRight: 6,
    },
    chipText: {
      color: colors.textSecondary,
      fontFamily: fonts.medium,
      fontSize: 12,
    },

    countLabel: {
      color: colors.textSecondary,
      fontFamily: fonts.regular,
      fontSize: 12,
      marginBottom: 6,
      marginTop: 2,
    },

    card: {
      backgroundColor: colors.elevated || '#261D17',
      borderRadius: radius.lg || 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle || '#2A201C',
      padding: 14,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
      gap: 8,
    },
    cardTitle: {
      flex: 1,
      color: colors.textPrimary,
      fontFamily: fonts.semiBold || fonts.bold,
      fontSize: 15,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: 4,
      flexShrink: 0,
    },
    badge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: radius.sm || 4,
    },
    badgeText: {
      fontFamily: fonts.medium,
      fontSize: 11,
    },

    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 10,
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surface || '#1C1410',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.sm || 4,
    },
    metaText: {
      color: colors.textSecondary,
      fontFamily: fonts.regular,
      fontSize: 11,
    },

    analyticsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 10,
    },
    analyticsItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    analyticsLabel: {
      color: colors.textSecondary,
      fontFamily: fonts.regular,
      fontSize: 12,
    },
    analyticsValue: {
      color: colors.textPrimary,
      fontFamily: fonts.semiBold || fonts.bold,
      fontSize: 12,
    },

    couponChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      backgroundColor: (colors.primary || '#D95D39') + '18',
      borderWidth: 1,
      borderColor: (colors.primary || '#D95D39') + '55',
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: radius.sm || 4,
      marginBottom: 10,
    },
    couponText: {
      color: colors.primary,
      fontFamily: fonts.mono || fonts.medium,
      fontSize: 12,
      letterSpacing: 0.5,
    },

    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.sm || 6,
    },
    actionBtnOutline: {
      backgroundColor: colors.surface || '#1C1410',
      borderWidth: 1,
      borderColor: colors.borderSubtle || '#2A201C',
    },
    actionBtnText: {
      color: '#fff',
      fontFamily: fonts.medium,
      fontSize: 12,
    },

    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontFamily: fonts.semiBold || fonts.bold,
      fontSize: 18,
      marginTop: 16,
      marginBottom: 6,
    },
    emptySubtitle: {
      color: colors.textSecondary,
      fontFamily: fonts.regular,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyBtn: {
      marginTop: 20,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: radius.md || 8,
    },
    emptyBtnText: {
      color: '#fff',
      fontFamily: fonts.semiBold || fonts.medium,
      fontSize: 14,
    },

    fab: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
  });
}
