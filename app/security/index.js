import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { securityApi } from '../../lib/api';
import { fonts } from '../../lib/theme';
import { useColors } from '../../lib/ThemeContext';

const SCORE_COLOR = (s) => s >= 80 ? '#16A34A' : s >= 60 ? '#D97706' : '#DC2626';
const SCORE_LABEL = (s) => s >= 80 ? 'Strong' : s >= 60 ? 'Fair' : s >= 40 ? 'Weak' : 'At Risk';

const MENU = [
  { key: 'biometric', icon: 'scan-circle',      label: 'Biometric Login',   sub: 'Face ID / Fingerprint',    route: '/security/biometric', iconBg: '#EFF6FF', iconColor: '#3B82F6' },
  { key: 'pin',       icon: 'keypad',            label: 'App Lock PIN',      sub: '4 or 6-digit PIN',          route: '/security/pin',       iconBg: '#F5F3FF', iconColor: '#7C3AED' },
  { key: 'mfa',       icon: 'shield-checkmark',  label: 'Two-Factor Auth',   sub: 'Authenticator App (TOTP)', route: '/security/mfa',       iconBg: '#ECFDF5', iconColor: '#10B981' },
  { key: 'devices',   icon: 'phone-portrait',    label: 'Trusted Devices',   sub: 'Manage known devices',     route: '/security/devices',   iconBg: '#FFF7ED', iconColor: '#F97316' },
  { key: 'sessions',  icon: 'layers',            label: 'Active Sessions',   sub: 'View & revoke sessions',   route: '/security/sessions',  iconBg: '#FEF2F2', iconColor: '#EF4444' },
  { key: 'activity',  icon: 'time',              label: 'Activity Log',      sub: 'Account history',          route: '/security/activity',  iconBg: '#F0FDF4', iconColor: '#22C55E' },
];

export default function SecurityCenter() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const { width } = useWindowDimensions();

  const styles = useMemo(() => makeStyles(colors), [colors]);

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Flat header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Security</Text>
        <TouchableOpacity style={styles.headerRight}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Gray band */}
      <View style={styles.grayBand} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, maxWidth: 520, width: '100%', alignSelf: 'center' }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor="#D95D39"
            colors={['#D95D39']}
          />
        }
      >
        {/* Security score card */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreCard}>
            <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
              <Text style={[styles.scoreNum, { color: colors.textPrimary }]}>{score}</Text>
            </View>
            <Text style={styles.scoreStatusLabel}>{SCORE_LABEL(score)}</Text>
            <Text style={styles.scoreTip}>Security Score</Text>

            {/* Quick stats row */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="phone-portrait" size={16} color={colors.textSecondary} />
                <Text style={styles.statVal}>{data?.trustedDevices ?? '—'}</Text>
                <Text style={styles.statLbl}>Devices</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Ionicons name="layers" size={16} color={colors.textSecondary} />
                <Text style={styles.statVal}>{data?.activeSessions ?? '—'}</Text>
                <Text style={styles.statLbl}>Sessions</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Security Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Features</Text>
          <View style={styles.menuList}>
            {MENU.map((item, index) => {
              const status = getMenuStatus(item.key);
              const isEnabled = status === true;
              const isLast = index === MENU.length - 1;
              return (
                <React.Fragment key={item.key}>
                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => router.push(item.route)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
                      <Ionicons name={item.icon} size={20} color={item.iconColor} />
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
                      <Ionicons name="chevron-forward" size={16} color={colors.borderSubtle} />
                    </View>
                  </TouchableOpacity>
                  {!isLast && (
                    <View style={styles.separator} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Recent events */}
        {data?.recentEvents?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Events</Text>
            <View style={styles.menuList}>
              {data.recentEvents.map((ev, i) => {
                const isBad = ev.severity === 'high' || ev.severity === 'critical';
                const isLast = i === data.recentEvents.length - 1;
                return (
                  <React.Fragment key={i}>
                    <View style={styles.eventRow}>
                      <View style={[styles.eventDot, { backgroundColor: isBad ? '#FEE2E2' : '#DCFCE7' }]}>
                        <Ionicons
                          name={isBad ? 'warning' : 'checkmark-circle'}
                          size={14}
                          color={isBad ? '#DC2626' : '#16A34A'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.eventType}>{ev.eventType.replace(/_/g, ' ')}</Text>
                        <Text style={styles.eventMeta}>
                          {ev.deviceName} · {new Date(ev.createdAt).toLocaleDateString('en-IN')}
                        </Text>
                      </View>
                    </View>
                    {!isLast && <View style={styles.separator} />}
                  </React.Fragment>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => router.push('/security/activity')} style={styles.viewAll}>
              <Text style={styles.viewAllText}>View full activity log</Text>
              <Ionicons name="arrow-forward" size={14} color="#D95D39" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: 'Philosopher_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
    marginLeft: 10,
  },
  headerRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Gray band */
  grayBand: {
    height: 10,
    backgroundColor: colors.elevated,
  },

  /* Score section */
  scoreSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  scoreCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#D95D39',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  scoreNum: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.textPrimary,
  },
  scoreStatusLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  scoreTip: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },

  /* Stats row inside score card */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    width: '100%',
    justifyContent: 'center',
  },
  stat: {
    alignItems: 'center',
    gap: 2,
  },
  statVal: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.textPrimary,
    marginTop: 2,
  },
  statLbl: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textDisabled,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
    backgroundColor: colors.borderSubtle,
  },

  /* Section */
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  /* Menu list container */
  menuList: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    overflow: 'hidden',
  },

  /* Menu rows */
  menuRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  menuSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textDisabled,
    marginTop: 1,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuCount: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
  },

  /* Badge */
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },

  /* Separator */
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginLeft: 64,
  },

  /* Event row */
  eventRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
  },
  eventDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventType: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  eventMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },

  /* View all */
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  viewAllText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: '#D95D39',
  },
});
