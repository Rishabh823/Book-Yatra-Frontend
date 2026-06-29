import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AdminShell } from '../../../../lib/AdminScreen';
import { fonts, radius } from '../../../../lib/theme';
import { useColors, useTheme } from '../../../../lib/ThemeContext';
import { superAdmin as superApi } from '../../../../lib/api';

const STATUS_COLORS = {
  draft:           '#6B7280',
  scheduled:       '#D97706',
  sending:         '#3B82F6',
  sent:            '#16A34A',
  failed:          '#DC2626',
  active:          '#8B5CF6',
};

const TYPE_COLORS = {
  general:         '#6B7280',
  coupon:          '#D97706',
  flash_sale:      '#DC2626',
  wallet_cashback: '#16A34A',
  tour_promotion:  '#D95D39',
  emergency:       '#9333EA',
};

const TYPE_LABEL_MAP = {
  general:         'General',
  coupon:          'Coupon',
  flash_sale:      'Flash Sale',
  wallet_cashback: 'Wallet Cashback',
  tour_promotion:  'Tour Promotion',
  emergency:       'Emergency',
};

function ProgressBar({ value = 0, max = 1, color = '#D95D39', colors }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <View style={{ height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}

export default function CampaignDetail() {
  const router    = useRouter();
  const { id }    = useLocalSearchParams();
  const colors    = useColors();
  const { width } = useWindowDimensions();
  const px        = width >= 600 ? 20 : 14;

  const [campaign,  setCampaign]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [sending,   setSending]   = useState(false);

  const s = useMemo(() => makeStyles(colors), [colors]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await superApi.getCampaignById(id);
      setCampaign(data);
    } catch (e) {
      setError(e?.message || 'Failed to load campaign.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleResend = useCallback(() => {
    if (!campaign) return;
    Alert.alert(
      'Re-send Campaign',
      `Re-send "${campaign.title}" to all target users now?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Now',
          onPress: async () => {
            setSending(true);
            try {
              await superApi.sendCampaign(id);
              await load();
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to send campaign.');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  }, [campaign, id, load]);

  if (loading) {
    return (
      <AdminShell title="Campaign Analytics">
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AdminShell>
    );
  }

  if (error || !campaign) {
    return (
      <AdminShell title="Campaign Analytics">
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={s.errorText}>{error || 'Campaign not found.'}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={load}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </AdminShell>
    );
  }

  const statusColor = STATUS_COLORS[campaign.status] || '#6B7280';
  const typeColor   = TYPE_COLORS[campaign.type]     || '#6B7280';
  const typeLabel   = TYPE_LABEL_MAP[campaign.type]  || campaign.type || 'Unknown';

  const analytics       = campaign.analytics         || {};
  const targetCount     = analytics.targetCount      ?? campaign.targetCount      ?? 0;
  const sentCount       = analytics.sentCount         ?? campaign.sentCount         ?? 0;
  const deliveredCount  = analytics.deliveredCount    ?? campaign.deliveredCount    ?? sentCount;
  const openedCount     = analytics.openedCount       ?? campaign.openedCount       ?? 0;
  const clickedCount    = analytics.clickedCount      ?? campaign.clickedCount      ?? 0;
  const couponUsedCount = analytics.couponUsedCount   ?? campaign.couponUsedCount   ?? 0;

  const deliveryRate = targetCount > 0 ? (sentCount / targetCount) * 100 : 0;
  const openRate     = sentCount   > 0 ? (openedCount / sentCount) * 100  : 0;

  const coupon = campaign.couponId || null;
  const canResend = campaign.status === 'sent' || campaign.status === 'failed';

  const metricCards = [
    { label: 'Target Audience', value: targetCount, icon: 'people-outline',      color: '#8B5CF6' },
    { label: 'Sent',            value: sentCount,   icon: 'paper-plane-outline', color: '#3B82F6' },
    { label: 'Delivered',       value: deliveredCount, icon: 'checkmark-circle-outline', color: '#16A34A' },
    { label: 'Opened',          value: openedCount, icon: 'eye-outline',         color: '#D97706' },
    { label: 'Clicked',         value: clickedCount,icon: 'hand-left-outline',   color: '#D95D39' },
    { label: 'Coupon Used',     value: couponUsedCount, icon: 'pricetag-outline', color: '#9333EA' },
  ];

  return (
    <AdminShell title="Campaign Analytics">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: px, paddingBottom: 40, paddingTop: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Campaign Header ── */}
        <View style={s.headerCard}>
          <View style={s.badgeRow}>
            <View style={[s.badge, { backgroundColor: typeColor + '22' }]}>
              <Text style={[s.badgeText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: statusColor + '22' }]}>
              <Text style={[s.badgeText, { color: statusColor }]}>
                {campaign.status
                  ? campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)
                  : '—'}
              </Text>
            </View>
          </View>
          <Text style={s.campaignTitle}>{campaign.title}</Text>
          {campaign.description ? (
            <Text style={s.campaignDesc}>{campaign.description}</Text>
          ) : null}
        </View>

        {/* ── Notification Preview ── */}
        {(campaign.notification?.title || campaign.notification?.body) && (
          <View style={s.previewCard}>
            <View style={s.previewHeader}>
              <View style={s.previewIconWrap}>
                <Ionicons name="notifications" size={18} color={colors.primary} />
              </View>
              <Text style={s.previewHeaderText}>Notification Preview</Text>
            </View>
            <View style={s.notifBubble}>
              {campaign.notification?.title ? (
                <Text style={s.notifTitle}>{campaign.notification.title}</Text>
              ) : null}
              {campaign.notification?.body ? (
                <Text style={s.notifBody}>{campaign.notification.body}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* ── Analytics Grid ── */}
        <Text style={s.sectionLabel}>Analytics</Text>
        <View style={s.metricsGrid}>
          {metricCards.map(card => (
            <View key={card.label} style={s.metricCard}>
              <View style={[s.metricIconWrap, { backgroundColor: card.color + '22' }]}>
                <Ionicons name={card.icon} size={18} color={card.color} />
              </View>
              <Text style={s.metricValue}>{card.value.toLocaleString()}</Text>
              <Text style={s.metricLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Delivery Rate ── */}
        <View style={s.ratesCard}>
          <Text style={s.sectionLabel} style={{ marginBottom: 12, color: colors.textPrimary, fontFamily: fonts.semiBold || fonts.bold, fontSize: 14 }}>Delivery Rates</Text>

          <View style={s.rateRow}>
            <View style={s.rateLabelRow}>
              <Text style={s.rateLabel}>Delivery Rate</Text>
              <Text style={s.ratePct}>{deliveryRate.toFixed(1)}%</Text>
            </View>
            <ProgressBar value={sentCount} max={targetCount} color="#3B82F6" colors={colors} />
            <Text style={s.rateSubLabel}>{sentCount.toLocaleString()} of {targetCount.toLocaleString()} sent</Text>
          </View>

          <View style={[s.rateRow, { marginTop: 14 }]}>
            <View style={s.rateLabelRow}>
              <Text style={s.rateLabel}>Open Rate</Text>
              <Text style={s.ratePct}>{openRate.toFixed(1)}%</Text>
            </View>
            <ProgressBar value={openedCount} max={sentCount} color="#D97706" colors={colors} />
            <Text style={s.rateSubLabel}>{openedCount.toLocaleString()} of {sentCount.toLocaleString()} opened</Text>
          </View>
        </View>

        {/* ── Coupon Section ── */}
        {coupon && (
          <>
            <Text style={s.sectionLabel}>Coupon</Text>
            <View style={s.couponCard}>
              <View style={s.couponIconWrap}>
                <Ionicons name="pricetag" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.couponCode}>{coupon.code || campaign.couponCode || '—'}</Text>
                {coupon.type && (
                  <Text style={s.couponMeta}>
                    {coupon.type === 'percent' ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}
                    {coupon.description ? `  ·  ${coupon.description}` : ''}
                  </Text>
                )}
              </View>
              <Text style={[s.badgeText, { color: '#9333EA' }]}>
                {couponUsedCount} used
              </Text>
            </View>
          </>
        )}

        {/* ── Audience & Schedule ── */}
        <Text style={s.sectionLabel}>Audience & Schedule</Text>
        <View style={s.infoCard}>
          {(campaign.audience?.segment || campaign.audienceSegment) ? (
            <View style={s.infoRow}>
              <Ionicons name="people-outline" size={15} color={colors.textSecondary} />
              <Text style={s.infoLabel}>Segment</Text>
              <Text style={s.infoValue}>{campaign.audience?.segment || campaign.audienceSegment}</Text>
            </View>
          ) : null}
          {(campaign.schedule?.type || campaign.scheduleType) ? (
            <View style={s.infoRow}>
              <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
              <Text style={s.infoLabel}>Schedule</Text>
              <Text style={s.infoValue}>
                {(campaign.schedule?.type || campaign.scheduleType || '').charAt(0).toUpperCase() +
                  (campaign.schedule?.type || campaign.scheduleType || '').slice(1)}
              </Text>
            </View>
          ) : null}
          {(campaign.schedule?.scheduledAt || campaign.scheduledAt) ? (
            <View style={s.infoRow}>
              <Ionicons name="calendar-outline" size={15} color={colors.textSecondary} />
              <Text style={s.infoLabel}>Scheduled</Text>
              <Text style={s.infoValue}>
                {new Date(campaign.schedule?.scheduledAt || campaign.scheduledAt).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
          ) : null}
          {campaign.sentAt ? (
            <View style={s.infoRow}>
              <Ionicons name="send-outline" size={15} color={colors.textSecondary} />
              <Text style={s.infoLabel}>Sent At</Text>
              <Text style={s.infoValue}>
                {new Date(campaign.sentAt).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
          ) : null}
          {campaign.createdAt ? (
            <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
              <Ionicons name="create-outline" size={15} color={colors.textSecondary} />
              <Text style={s.infoLabel}>Created</Text>
              <Text style={s.infoValue}>
                {new Date(campaign.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Re-send Button ── */}
        {canResend && (
          <TouchableOpacity
            style={[s.resendBtn, sending && { opacity: 0.6 }]}
            onPress={handleResend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="paper-plane-outline" size={18} color="#fff" />
            )}
            <Text style={s.resendBtnText}>{sending ? 'Sending…' : 'Re-send Campaign'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </AdminShell>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    errorText: {
      color: colors.textSecondary,
      fontFamily: fonts.regular,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 12,
    },
    retryBtn: {
      marginTop: 16,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 9,
      borderRadius: radius.md || 8,
    },
    retryBtnText: {
      color: '#fff',
      fontFamily: fonts.semiBold || fonts.medium,
      fontSize: 14,
    },

    sectionLabel: {
      color: colors.textSecondary,
      fontFamily: fonts.semiBold || fonts.bold,
      fontSize: 11,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 8,
      marginTop: 18,
    },

    /* Header card */
    headerCard: {
      backgroundColor: colors.elevated || '#261D17',
      borderRadius: radius.lg || 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle || '#2A201C',
      padding: 16,
      marginBottom: 4,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 10,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.sm || 4,
    },
    badgeText: {
      fontFamily: fonts.medium,
      fontSize: 12,
    },
    campaignTitle: {
      color: colors.textPrimary,
      fontFamily: fonts.bold || fonts.semiBold,
      fontSize: 20,
      marginBottom: 6,
    },
    campaignDesc: {
      color: colors.textSecondary,
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
    },

    /* Notification Preview */
    previewCard: {
      backgroundColor: colors.elevated || '#261D17',
      borderRadius: radius.lg || 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle || '#2A201C',
      padding: 14,
      marginTop: 14,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    previewIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: (colors.primary || '#D95D39') + '22',
      justifyContent: 'center',
      alignItems: 'center',
    },
    previewHeaderText: {
      color: colors.textSecondary,
      fontFamily: fonts.semiBold || fonts.bold,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    notifBubble: {
      backgroundColor: colors.surface || '#1C1410',
      borderRadius: radius.md || 8,
      padding: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary || '#D95D39',
    },
    notifTitle: {
      color: colors.textPrimary,
      fontFamily: fonts.semiBold || fonts.bold,
      fontSize: 14,
      marginBottom: 4,
    },
    notifBody: {
      color: colors.textSecondary,
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 18,
    },

    /* Metrics grid */
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    metricCard: {
      backgroundColor: colors.elevated || '#261D17',
      borderRadius: radius.md || 8,
      borderWidth: 1,
      borderColor: colors.borderSubtle || '#2A201C',
      padding: 12,
      width: '31%',
      minWidth: 90,
      alignItems: 'center',
      flex: 1,
    },
    metricIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    metricValue: {
      color: colors.textPrimary,
      fontFamily: fonts.bold || fonts.semiBold,
      fontSize: 18,
      marginBottom: 2,
    },
    metricLabel: {
      color: colors.textSecondary,
      fontFamily: fonts.regular,
      fontSize: 10,
      textAlign: 'center',
    },

    /* Rates */
    ratesCard: {
      backgroundColor: colors.elevated || '#261D17',
      borderRadius: radius.lg || 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle || '#2A201C',
      padding: 16,
      marginTop: 10,
    },
    rateRow: {},
    rateLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    rateLabel: {
      color: colors.textPrimary,
      fontFamily: fonts.medium,
      fontSize: 13,
    },
    ratePct: {
      color: colors.textPrimary,
      fontFamily: fonts.bold || fonts.semiBold,
      fontSize: 13,
    },
    rateSubLabel: {
      color: colors.textSecondary,
      fontFamily: fonts.regular,
      fontSize: 11,
      marginTop: 4,
    },

    /* Coupon */
    couponCard: {
      backgroundColor: colors.elevated || '#261D17',
      borderRadius: radius.lg || 12,
      borderWidth: 1,
      borderColor: (colors.primary || '#D95D39') + '44',
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    couponIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: (colors.primary || '#D95D39') + '22',
      justifyContent: 'center',
      alignItems: 'center',
    },
    couponCode: {
      color: colors.primary,
      fontFamily: fonts.mono || fonts.bold,
      fontSize: 16,
      letterSpacing: 1,
      marginBottom: 2,
    },
    couponMeta: {
      color: colors.textSecondary,
      fontFamily: fonts.regular,
      fontSize: 12,
    },

    /* Info card */
    infoCard: {
      backgroundColor: colors.elevated || '#261D17',
      borderRadius: radius.lg || 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle || '#2A201C',
      overflow: 'hidden',
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle || '#2A201C',
    },
    infoLabel: {
      color: colors.textSecondary,
      fontFamily: fonts.regular,
      fontSize: 13,
      width: 80,
    },
    infoValue: {
      flex: 1,
      color: colors.textPrimary,
      fontFamily: fonts.medium,
      fontSize: 13,
      textAlign: 'right',
    },

    /* Re-send button */
    resendBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary || '#D95D39',
      borderRadius: radius.md || 10,
      paddingVertical: 14,
      marginTop: 24,
    },
    resendBtnText: {
      color: '#fff',
      fontFamily: fonts.semiBold || fonts.bold,
      fontSize: 15,
    },
  });
}
