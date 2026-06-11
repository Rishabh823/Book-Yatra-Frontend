import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { securityApi } from '../../lib/api';
import { colors, fonts, radius, shadow } from '../../lib/theme';

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

  const [sessions,   setSessions]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    Alert.alert('Revoke Session', `Sign out of "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        try {
          await securityApi.revokeSession(id);
          setSessions(prev => prev.filter(s => s._id !== id));
        } catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  }, []);

  const handleRevokeAll = useCallback(() => {
    Alert.alert('Sign Out All', 'Sign out of all other devices? Your current session will remain active.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out All', style: 'destructive', onPress: async () => {
        try {
          await securityApi.revokeAllSessions();
          await load();
        } catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  }, [load]);

  const otherSessions = sessions.filter(s => !s.isCurrent);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={['#1E0A0A', '#5C1615']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.heroTitle}>Active Sessions</Text>
        <Text style={styles.heroSub}>{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32, paddingTop: 16, gap: 10, maxWidth: 520, width: '100%', alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />}
      >
        {!loading && otherSessions.length > 1 && (
          <TouchableOpacity style={styles.revokeAllBtn} onPress={handleRevokeAll}>
            <Ionicons name="log-out" size={16} color={colors.error} />
            <Text style={styles.revokeAllText}>Sign out all other sessions</Text>
          </TouchableOpacity>
        )}

        {/* Current session first */}
        {sessions.filter(s => s.isCurrent).map(session => (
          <View key={session._id} style={[styles.card, shadow.card, { borderLeftWidth: 3, borderLeftColor: '#16A34A' }]}>
            <View style={[styles.iconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name={PLATFORM_ICON(session.platform)} size={20} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.sessionName} numberOfLines={1}>{session.deviceName}</Text>
                <View style={styles.currentBadge}><Text style={styles.currentText}>This device</Text></View>
              </View>
              <Text style={styles.sessionMeta}>{session.platform} · {session.ipAddress}</Text>
              <Text style={styles.sessionDate}>Active {fmtDate(session.lastActivity)}</Text>
            </View>
          </View>
        ))}

        {otherSessions.map(session => (
          <View key={session._id} style={[styles.card, shadow.soft]}>
            <View style={[styles.iconWrap, { backgroundColor: '#F3F4F6' }]}>
              <Ionicons name={PLATFORM_ICON(session.platform)} size={20} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionName} numberOfLines={1}>{session.deviceName}</Text>
              <Text style={styles.sessionMeta}>{session.platform} · {session.ipAddress}</Text>
              <Text style={styles.sessionDate}>Last active {fmtDate(session.lastActivity)}</Text>
            </View>
            <TouchableOpacity style={styles.revokeBtn} onPress={() => handleRevoke(session._id, session.deviceName)}>
              <Ionicons name="log-out-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        {!loading && sessions.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="layers-outline" size={40} color={colors.textDisabled} />
            <Text style={styles.emptyText}>No active sessions found.</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text style={styles.infoText}>Sessions are created when you log in on a new device. Revoking a session will immediately sign out that device.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 28 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontFamily: fonts.heading, fontSize: 24, color: 'white' },
  heroSub:   { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 },

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

  infoCard: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: 12 },
  infoText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.secondary, lineHeight: 18 },
});
