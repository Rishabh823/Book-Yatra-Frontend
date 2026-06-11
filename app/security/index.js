import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { securityApi } from '../../lib/api';
import { colors, fonts, radius, shadow, spacing } from '../../lib/theme';

const SCORE_COLOR = (s) => s >= 80 ? '#16A34A' : s >= 60 ? '#D97706' : '#DC2626';
const SCORE_LABEL = (s) => s >= 80 ? 'Strong' : s >= 60 ? 'Fair' : s >= 40 ? 'Weak' : 'At Risk';

const MENU = [
  { key: 'biometric', icon: 'scan-circle', label: 'Biometric Login',       sub: 'Face ID / Fingerprint',   route: '/security/biometric' },
  { key: 'pin',       icon: 'keypad',      label: 'App Lock PIN',           sub: '4 or 6-digit PIN',         route: '/security/pin' },
  { key: 'mfa',       icon: 'shield-checkmark', label: 'Two-Factor Auth',   sub: 'Authenticator App (TOTP)', route: '/security/mfa' },
  { key: 'devices',   icon: 'phone-portrait', label: 'Trusted Devices',     sub: 'Manage known devices',     route: '/security/devices' },
  { key: 'sessions',  icon: 'layers',      label: 'Active Sessions',        sub: 'View & revoke sessions',   route: '/security/sessions' },
  { key: 'activity',  icon: 'time',        label: 'Activity Log',           sub: 'Account history',          route: '/security/activity' },
];

export default function SecurityCenter() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const d = await securityApi.getDashboard();
      setData(d);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const score = data?.securityScore ?? 0;
  const scoreColor = SCORE_COLOR(score);
  const circumference = 2 * Math.PI * 38;
  const dashOffset = circumference * (1 - score / 100);

  const getMenuStatus = (key) => {
    if (!data) return null;
    if (key === 'biometric') return data.biometricEnabled;
    if (key === 'pin')       return data.pinEnabled;
    if (key === 'mfa')       return data.mfaEnabled;
    if (key === 'devices')   return `${data.trustedDevices || 0} trusted`;
    if (key === 'sessions')  return `${data.activeSessions || 0} active`;
    if (key === 'activity')  return null;
    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={['#1E0A0A', '#5C1615']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.heroTitle}>Security Center</Text>
        <Text style={styles.heroSub}>Protect your account</Text>

        {/* Score ring */}
        <View style={styles.scoreWrap}>
          <View style={styles.scoreCircle}>
            <Text style={[styles.scoreNum, { color: scoreColor }]}>{score}</Text>
            <Text style={styles.scoreLabel}>{SCORE_LABEL(score)}</Text>
          </View>
          <Text style={styles.scoreTip}>Security Score</Text>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          {[
            { icon: 'phone-portrait', val: data?.trustedDevices ?? '—', lbl: 'Devices' },
            { icon: 'layers',         val: data?.activeSessions ?? '—', lbl: 'Sessions' },
          ].map((s, i) => (
            <View key={i} style={styles.stat}>
              <Ionicons name={s.icon} size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.statVal}>{s.val}</Text>
              <Text style={styles.statLbl}>{s.lbl}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, maxWidth: 520, width: '100%', alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Features</Text>
          {MENU.map((item) => {
            const status = getMenuStatus(item.key);
            const isEnabled = status === true;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.menuRow, shadow.soft]}
                onPress={() => router.push(item.route)}
                activeOpacity={0.75}
              >
                <View style={[styles.menuIcon, { backgroundColor: isEnabled ? colors.primaryLight : '#F3F4F6' }]}>
                  <Ionicons name={item.icon} size={22} color={isEnabled ? colors.primary : colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <View style={styles.menuRight}>
                  {typeof status === 'boolean' && (
                    <View style={[styles.badge, { backgroundColor: isEnabled ? '#DCFCE7' : '#FEE2E2' }]}>
                      <Text style={[styles.badgeText, { color: isEnabled ? '#16A34A' : '#DC2626' }]}>
                        {isEnabled ? 'On' : 'Off'}
                      </Text>
                    </View>
                  )}
                  {typeof status === 'string' && (
                    <Text style={styles.menuCount}>{status}</Text>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recent events */}
        {data?.recentEvents?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Events</Text>
            {data.recentEvents.map((ev, i) => (
              <View key={i} style={[styles.eventRow, shadow.soft]}>
                <View style={[styles.eventDot, { backgroundColor: ev.severity === 'high' || ev.severity === 'critical' ? '#FEE2E2' : '#DCFCE7' }]}>
                  <Ionicons name={ev.severity === 'high' || ev.severity === 'critical' ? 'warning' : 'checkmark-circle'} size={14} color={ev.severity === 'high' || ev.severity === 'critical' ? '#DC2626' : '#16A34A'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventType}>{ev.eventType.replace(/_/g, ' ')}</Text>
                  <Text style={styles.eventMeta}>{ev.deviceName} · {new Date(ev.createdAt).toLocaleDateString('en-IN')}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={() => router.push('/security/activity')} style={styles.viewAll}>
              <Text style={styles.viewAllText}>View full activity log</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 28 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontFamily: fonts.heading, fontSize: 26, color: 'white' },
  heroSub:   { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 20 },

  scoreWrap:   { alignItems: 'center', marginBottom: 8 },
  scoreCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  scoreNum:    { fontFamily: fonts.bodyBold, fontSize: 28 },
  scoreLabel:  { fontFamily: fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  scoreTip:    { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 },

  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 32, marginTop: 12 },
  stat: { alignItems: 'center', gap: 2 },
  statVal: { fontFamily: fonts.bodyBold, fontSize: 18, color: 'white' },
  statLbl: { fontFamily: fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.6)' },

  section: { paddingHorizontal: 16, paddingTop: 20, gap: 8 },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },

  menuRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14 },
  menuIcon:  { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textPrimary },
  menuSub:   { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuCount: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },

  badge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11 },

  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12 },
  eventDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eventType: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary, textTransform: 'capitalize' },
  eventMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },

  viewAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  viewAllText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary },
});
