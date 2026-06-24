import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { securityApi } from '../../lib/api';
import { fonts, radius } from '../../lib/theme';
import { useColors } from '../../lib/ThemeContext';
import Toast from '../../components/Toast';
import { useToast } from '../../lib/hooks/useToast';
import ConfirmModal from '../../components/ConfirmModal';

const PLATFORM_ICON = (p) => {
  const pl = (p || '').toLowerCase();
  if (pl === 'ios')     return 'logo-apple';
  if (pl === 'android') return 'logo-android';
  return 'desktop-outline';
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export default function SessionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [sessions,   setSessions]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState(null); // { id, name }
  const [showSignOutAllConfirm, setShowSignOutAllConfirm] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await securityApi.getSessions();
      setSessions(res.sessions || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRevoke = useCallback((id, name) => {
    setPendingRevoke({ id, name });
    setShowRevokeConfirm(true);
  }, []);

  const handleRevokeConfirmed = useCallback(async () => {
    setShowRevokeConfirm(false);
    if (!pendingRevoke) return;
    try {
      await securityApi.revokeSession(pendingRevoke.id);
      setSessions(prev => prev.filter(s => s._id !== pendingRevoke.id));
    } catch (e) {
      showToast(e.message, 'error');
    }
    setPendingRevoke(null);
  }, [pendingRevoke, showToast]);

  const handleRevokeAll = useCallback(() => {
    setShowSignOutAllConfirm(true);
  }, []);

  const handleRevokeAllConfirmed = useCallback(async () => {
    setShowSignOutAllConfirm(false);
    try {
      await securityApi.revokeAllSessions();
      await load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }, [load, showToast]);

  const otherSessions = sessions.filter(s => !s.isCurrent);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.headerTitle}>Active Sessions</Text>
          <Text style={s.headerSub}>{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32, paddingTop: 16, gap: 10, maxWidth: 520, width: '100%', alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {!loading && otherSessions.length > 1 && (
          <TouchableOpacity style={s.revokeAllBtn} onPress={handleRevokeAll}>
            <Ionicons name="log-out" size={16} color={colors.error} />
            <Text style={s.revokeAllText}>Sign out all other sessions</Text>
          </TouchableOpacity>
        )}

        {/* Current session first */}
        {sessions.filter(s => s.isCurrent).map(session => (
          <View key={session._id} style={[s.card, { borderWidth: 1, borderColor: colors.borderSubtle, borderLeftWidth: 3, borderLeftColor: '#16A34A' }]}>
            <View style={[s.iconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name={PLATFORM_ICON(session.platform)} size={20} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.sessionName} numberOfLines={1}>{session.deviceName}</Text>
                <View style={s.currentBadge}><Text style={s.currentText}>This device</Text></View>
              </View>
              <Text style={s.sessionMeta}>{session.platform} · {session.ipAddress}</Text>
              <Text style={s.sessionDate}>Active {fmtDate(session.lastActivity)}</Text>
            </View>
          </View>
        ))}

        {otherSessions.map(session => (
          <View key={session._id} style={[s.card, { borderWidth: 1, borderColor: colors.borderSubtle }]}>
            <View style={[s.iconWrap, { backgroundColor: colors.elevated }]}>
              <Ionicons name={PLATFORM_ICON(session.platform)} size={20} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sessionName} numberOfLines={1}>{session.deviceName}</Text>
              <Text style={s.sessionMeta}>{session.platform} · {session.ipAddress}</Text>
              <Text style={s.sessionDate}>Last active {fmtDate(session.lastActivity)}</Text>
            </View>
            <TouchableOpacity style={s.revokeBtn} onPress={() => handleRevoke(session._id, session.deviceName)}>
              <Ionicons name="log-out-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        {!loading && sessions.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="layers-outline" size={40} color={colors.textDisabled} />
            <Text style={s.emptyText}>No active sessions found.</Text>
          </View>
        )}

        <View style={s.infoCard}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text style={s.infoText}>Sessions are created when you log in on a new device. Revoking a session will immediately sign out that device.</Text>
        </View>
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmModal
        visible={showRevokeConfirm}
        title="Revoke Session"
        message={pendingRevoke ? `Sign out of "${pendingRevoke.name}"?` : ''}
        confirmText="Sign Out"
        onConfirm={handleRevokeConfirmed}
        onCancel={() => { setShowRevokeConfirm(false); setPendingRevoke(null); }}
        onDismiss={() => { setShowRevokeConfirm(false); setPendingRevoke(null); }}
        destructive={true}
      />
      <ConfirmModal
        visible={showSignOutAllConfirm}
        title="Sign Out All"
        message="Sign out of all other devices? Your current session will remain active."
        confirmText="Sign Out All"
        onConfirm={handleRevokeAllConfirmed}
        onCancel={() => setShowSignOutAllConfirm(false)}
        onDismiss={() => setShowSignOutAllConfirm(false)}
        destructive={true}
      />
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Philosopher_700Bold', fontSize: 18, color: colors.textPrimary },
  headerSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 1 },

  revokeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', borderRadius: radius.lg, padding: 14, justifyContent: 'center' },
  revokeAllText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.error },

  card:        { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sessionName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary, flexShrink: 1 },
  sessionMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  sessionDate: { fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled, marginTop: 1 },

  currentBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill },
  currentText:  { fontFamily: fonts.bodyBold, fontSize: 10, color: '#16A34A' },

  revokeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText:  { fontFamily: fonts.body, fontSize: 14, color: colors.textDisabled },

  infoCard: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.elevated, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.borderSubtle },
  infoText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
});
