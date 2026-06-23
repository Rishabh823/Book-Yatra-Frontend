import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminShell } from '../../lib/AdminScreen';
import { colors, fonts, radius } from '../../lib/theme';
import { api } from '../../lib/api';
import { fmtDate } from '../../lib/utils';
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";

const TABS = [
  { key: 'open',     label: 'Open',     color: '#D97706', bg: '#FFFBEB' },
  { key: 'resolved', label: 'Resolved', color: '#16A34A', bg: '#F0FDF4' },
  { key: '',         label: 'All',      color: colors.textPrimary, bg: colors.surface },
];

export default function AdminEnquiries() {
  const [items, setItems]     = useState([]);
  const [tab, setTab]         = useState('open');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanding, setExpanding]   = useState(null);
  const { toast, showToast, hideToast } = useToast();
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [resolveTargetId, setResolveTargetId] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/contacts');
      setItems(Array.isArray(res) ? res : res?.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = useMemo(() =>
    tab === '' ? items : items.filter(it => (it.status || 'open') === tab),
  [items, tab]);

  const openCount     = items.filter(it => (it.status || 'open') === 'open').length;
  const resolvedCount = items.filter(it => it.status === 'resolved').length;

  const resolve = (id) => {
    setResolveTargetId(id);
    setShowResolveConfirm(true);
  };

  const handleResolveConfirmed = async () => {
    if (!resolveTargetId) return;
    setShowResolveConfirm(false);
    try {
      await api.put(`/contacts/${resolveTargetId}`, { status: 'resolved' });
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
    setResolveTargetId(null);
  };

  return (
    <AdminShell title="Enquiries" subtitle={`${openCount} open · ${resolvedCount} resolved`}>
      {/* Stats strip */}
      <View style={s.statsRow}>
        <View style={s.statItem}>
          <Ionicons name="chatbubble" size={14} color="#D97706" />
          <Text style={[s.statVal, { color: '#D97706' }]}>{openCount}</Text>
          <Text style={s.statLbl}>Open</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
          <Text style={[s.statVal, { color: '#16A34A' }]}>{resolvedCount}</Text>
          <Text style={s.statLbl}>Resolved</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Ionicons name="list" size={14} color={colors.textSecondary} />
          <Text style={[s.statVal, { color: colors.textPrimary }]}>{items.length}</Text>
          <Text style={s.statLbl}>Total</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && { backgroundColor: t.color, borderColor: t.color }]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.tabTxt, tab === t.key && { color: '#fff' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

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
              <Ionicons name="chatbubble-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyTxt}>No {tab || ''} enquiries</Text>
            </View>
          }
          renderItem={({ item }) => {
            const status = item.status || 'open';
            const isOpen = status === 'open';
            const isExpanded = expanding === item._id;
            return (
              <TouchableOpacity
                style={s.card}
                onPress={() => setExpanding(isExpanded ? null : item._id)}
                activeOpacity={0.88}
              >
                <View style={s.cardTop}>
                  <View style={[s.iconCircle, { backgroundColor: isOpen ? '#FFFBEB' : '#F0FDF4' }]}>
                    <Ionicons
                      name={isOpen ? "chatbubble-outline" : "checkmark-circle-outline"}
                      size={18}
                      color={isOpen ? '#D97706' : '#16A34A'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{item.name || '—'}</Text>
                    <Text style={s.meta} numberOfLines={1}>{item.phone}{item.email ? ` · ${item.email}` : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[s.sBadge, { backgroundColor: isOpen ? '#FFFBEB' : '#F0FDF4' }]}>
                      <Text style={[s.sBadgeTxt, { color: isOpen ? '#D97706' : '#16A34A' }]}>{status}</Text>
                    </View>
                    <Text style={s.date}>{fmtDate(item.createdAt)}</Text>
                  </View>
                </View>

                <Text style={s.subject}>{item.subject || '(No subject)'}</Text>
                <Text style={s.message} numberOfLines={isExpanded ? undefined : 2}>{item.message}</Text>

                {isExpanded && isOpen && (
                  <TouchableOpacity style={s.resolveBtn} onPress={() => resolve(item._id)}>
                    <Ionicons name="checkmark-circle-outline" size={15} color="#16A34A" />
                    <Text style={s.resolveTxt}>Mark as Resolved</Text>
                  </TouchableOpacity>
                )}

                <View style={s.cardFoot}>
                  <Text style={s.expandHint}>{isExpanded ? 'Tap to collapse' : 'Tap to expand'}</Text>
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={13} color={colors.textDisabled} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmModal
        visible={showResolveConfirm}
        title="Mark as Resolved?"
        message="This will close the enquiry."
        confirmText="Resolve"
        cancelText="Cancel"
        onConfirm={handleResolveConfirmed}
        onCancel={() => setShowResolveConfirm(false)}
        onDismiss={() => setShowResolveConfirm(false)}
      />
    </AdminShell>
  );
}

const s = StyleSheet.create({
  statsRow:  { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.borderSubtle },
  statItem:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  statDiv:   { width: 1, backgroundColor: colors.borderSubtle },
  statVal:   { fontFamily: fonts.heading, fontSize: 18 },
  statLbl:   { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },

  tabRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  tab:       { flex: 1, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSubtle },
  tabTxt:    { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },

  card:      { backgroundColor: colors.surface, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: "#E5E7EB" },
  cardTop:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconCircle:{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name:      { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  meta:      { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  sBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  sBadgeTxt: { fontFamily: fonts.bodyBold, fontSize: 10, textTransform: 'capitalize' },
  date:      { fontFamily: fonts.accent, fontSize: 9, color: colors.textDisabled, letterSpacing: 1 },
  subject:   { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.secondary, marginBottom: 4 },
  message:   { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  resolveBtn:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#F0FDF4', borderRadius: 999, marginBottom: 8, borderWidth: 1, borderColor: '#BBFAB1' },
  resolveTxt:{ fontFamily: fonts.bodyBold, fontSize: 13, color: '#16A34A' },
  cardFoot:  { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  expandHint:{ fontFamily: fonts.body, fontSize: 10, color: colors.textDisabled },
  empty:     { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTxt:  { fontFamily: fonts.body, color: colors.textSecondary },
});
