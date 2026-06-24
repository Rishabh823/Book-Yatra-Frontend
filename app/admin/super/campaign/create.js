import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColors } from '../../../../lib/ThemeContext';
import { AdminShell } from '../../../../lib/AdminScreen';
import { fonts, radius } from '../../../../lib/theme';
import { superAdmin as superApi } from '../../../../lib/api';

// ─── Constants ───────────────────────────────────────────────────────────────

const CAMPAIGN_TYPES = [
  { value: 'general', label: 'General Notification', icon: 'notifications-outline', color: '#6B7280', description: 'Announcements & updates' },
  { value: 'coupon', label: 'Coupon Campaign', icon: 'pricetag-outline', color: '#D97706', description: 'Attach a discount coupon' },
  { value: 'flash_sale', label: 'Flash Sale', icon: 'flash-outline', color: '#DC2626', description: 'Limited time offers' },
  { value: 'wallet_cashback', label: 'Wallet Cashback', icon: 'wallet-outline', color: '#16A34A', description: 'Reward wallet users' },
  { value: 'tour_promotion', label: 'Tour Promotion', icon: 'bus-outline', color: '#D95D39', description: 'Promote a specific tour' },
  { value: 'referral', label: 'Referral Campaign', icon: 'people-outline', color: '#8B5CF6', description: 'Encourage referrals' },
  { value: 'emergency', label: 'Emergency Alert', icon: 'warning-outline', color: '#9333EA', description: 'Urgent announcements' },
];

const AUDIENCE_OPTIONS = [
  { value: 'everyone', label: 'Everyone', icon: 'globe-outline', desc: 'All registered users' },
  { value: 'users', label: 'Users Only', icon: 'person-outline', desc: 'Regular users' },
  { value: 'admins', label: 'Admins', icon: 'shield-outline', desc: 'Admin & managers' },
  { value: 'volunteers', label: 'Volunteers', icon: 'heart-outline', desc: 'Volunteers' },
  { value: 'new_users', label: 'New Users', icon: 'star-outline', desc: 'Joined in last 7 days' },
  { value: 'inactive', label: 'Inactive Users', icon: 'moon-outline', desc: 'No activity in 30 days' },
  { value: 'frequent_travelers', label: 'Frequent Travelers', icon: 'airplane-outline', desc: 'Traveled 3+ times' },
  { value: 'wallet_users', label: 'Wallet Users', icon: 'wallet-outline', desc: 'Have wallet balance' },
  { value: 'no_bookings', label: 'No Bookings', icon: 'bookmark-outline', desc: 'Never booked' },
  { value: 'power_users', label: '5+ Bookings', icon: 'trophy-outline', desc: 'Power users' },
];

const DEEP_LINK_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'tour', label: 'Tour Details' },
  { value: 'coupon', label: 'Coupon Details' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'bookings', label: 'Bookings' },
  { value: 'offers', label: 'Offers' },
];

const TYPES_NEEDING_COUPON = ['coupon', 'flash_sale', 'wallet_cashback', 'referral'];
const TYPES_SKIP_COUPON = ['general', 'tour_promotion', 'emergency'];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreateCampaign() {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { type: routeType } = useLocalSearchParams();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    type: routeType || 'general',
    title: '',
    notifTitle: '',
    notifBody: '',
    imageUrl: '',
    attachCoupon: false,
    couponId: null,
    segment: 'everyone',
    deepLinkScreen: 'none',
    deepLinkParams: {},
    scheduleType: 'now',
    scheduledAt: '',
    recurrence: null,
  });

  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [audienceCount, setAudienceCount] = useState(null);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const needsCouponStep = TYPES_NEEDING_COUPON.includes(form.type);
  const totalSteps = needsCouponStep ? 5 : 4;

  // Map visible step to actual step (skip coupon step 3 if not needed)
  const getActualStep = useCallback((visibleStep) => {
    if (!needsCouponStep && visibleStep >= 3) return visibleStep + 1;
    return visibleStep;
  }, [needsCouponStep]);

  const getVisibleStep = useCallback((actualStep) => {
    if (!needsCouponStep && actualStep >= 4) return actualStep - 1;
    return actualStep;
  }, [needsCouponStep]);

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  // Fetch coupons when entering coupon step
  useEffect(() => {
    if (needsCouponStep && step === 3) {
      setCouponsLoading(true);
      superApi.getCoupons()
        .then(data => setCoupons(Array.isArray(data) ? data : (data?.coupons || [])))
        .catch(() => setCoupons([]))
        .finally(() => setCouponsLoading(false));
    }
  }, [step, needsCouponStep]);

  // Fetch audience preview when segment changes on step 4
  useEffect(() => {
    const audienceStep = needsCouponStep ? 4 : 3;
    if (step === audienceStep && form.segment) {
      setAudienceLoading(true);
      setAudienceCount(null);
      superApi.getAudiencePreview(form.segment)
        .then(data => setAudienceCount(data?.count ?? null))
        .catch(() => setAudienceCount(null))
        .finally(() => setAudienceLoading(false));
    }
  }, [step, form.segment, needsCouponStep]);

  const validateStep = () => {
    const actualStep = needsCouponStep ? step : getActualStep(step);
    if (step === 1) {
      if (!form.type) { Alert.alert('Required', 'Please select a campaign type.'); return false; }
      if (!form.title.trim()) { Alert.alert('Required', 'Please enter a campaign title.'); return false; }
    }
    if (step === 2) {
      if (!form.notifTitle.trim()) { Alert.alert('Required', 'Please enter a notification title.'); return false; }
      if (!form.notifBody.trim()) { Alert.alert('Required', 'Please enter a notification body.'); return false; }
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    if (step < totalSteps) setStep(s => s + 1);
  };

  const goPrev = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        type: form.type,
        notification: {
          title: form.notifTitle,
          body: form.notifBody,
          imageUrl: form.imageUrl,
        },
        audience: { segment: form.segment },
        couponId: form.couponId || null,
        deepLink: {
          screen: form.deepLinkScreen,
          params: form.deepLinkParams,
        },
        schedule: {
          type: form.scheduleType,
          scheduledAt: form.scheduleType === 'scheduled' ? new Date(form.scheduledAt) : null,
          recurrence: form.scheduleType === 'recurring' ? form.recurrence : null,
        },
      };
      await superApi.createCampaign(payload);
      Alert.alert(
        'Campaign Created!',
        form.scheduleType === 'now' ? 'Campaign is sending now!' : 'Campaign is scheduled!',
        [{ text: 'OK', onPress: () => router.replace('/admin/super/campaigns') }]
      );
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = CAMPAIGN_TYPES.find(t => t.value === form.type);
  const selectedCoupon = coupons.find(c => c._id === form.couponId || c.id === form.couponId);
  const selectedAudience = AUDIENCE_OPTIONS.find(a => a.value === form.segment);

  // ─── Step Indicator ─────────────────────────────────────────────────────────
  const renderStepIndicator = () => (
    <View style={s.stepIndicator}>
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map(n => (
        <React.Fragment key={n}>
          <TouchableOpacity
            style={[s.stepDot, step === n && s.stepDotActive, step > n && s.stepDotDone]}
            onPress={() => n < step && setStep(n)}
          >
            {step > n ? (
              <Ionicons name="checkmark" size={12} color={colors.textPrimary} />
            ) : (
              <Text style={[s.stepDotText, step === n && s.stepDotTextActive]}>{n}</Text>
            )}
          </TouchableOpacity>
          {n < totalSteps && <View style={[s.stepLine, step > n && s.stepLineDone]} />}
        </React.Fragment>
      ))}
    </View>
  );

  // ─── Step 1: Campaign Type ───────────────────────────────────────────────────
  const renderStep1 = () => (
    <View>
      <Text style={s.stepTitle}>Choose Campaign Type</Text>
      <Text style={s.stepSubtitle}>What kind of campaign would you like to create?</Text>
      <View style={s.typeGrid}>
        {CAMPAIGN_TYPES.map(type => (
          <TouchableOpacity
            key={type.value}
            style={[s.typeCard, form.type === type.value && { borderColor: type.color, borderWidth: 2 }]}
            onPress={() => updateForm('type', type.value)}
            activeOpacity={0.7}
          >
            <View style={[s.typeIconWrap, { backgroundColor: type.color + '22' }]}>
              <Ionicons name={type.icon} size={22} color={type.color} />
            </View>
            <Text style={[s.typeLabel, form.type === type.value && { color: type.color }]} numberOfLines={2}>
              {type.label}
            </Text>
            <Text style={s.typeDesc} numberOfLines={2}>{type.description}</Text>
            {form.type === type.value && (
              <View style={[s.typeCheck, { backgroundColor: type.color }]}>
                <Ionicons name="checkmark" size={10} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.section}>
        <Text style={s.label}>Campaign Title <Text style={s.required}>*</Text></Text>
        <TextInput
          style={s.input}
          placeholder="e.g. Summer Sale 2026"
          placeholderTextColor={colors.textSecondary}
          value={form.title}
          onChangeText={v => updateForm('title', v)}
        />
      </View>
    </View>
  );

  // ─── Step 2: Notification Content ───────────────────────────────────────────
  const renderStep2 = () => (
    <View>
      <Text style={s.stepTitle}>Notification Content</Text>
      <Text style={s.stepSubtitle}>Craft the message your users will see.</Text>

      <View style={s.section}>
        <View style={s.labelRow}>
          <Text style={s.label}>Notification Title <Text style={s.required}>*</Text></Text>
          <Text style={s.charCount}>{form.notifTitle.length}/80</Text>
        </View>
        <TextInput
          style={s.input}
          placeholder="Enter notification title"
          placeholderTextColor={colors.textSecondary}
          value={form.notifTitle}
          onChangeText={v => { if (v.length <= 80) updateForm('notifTitle', v); }}
          maxLength={80}
        />
      </View>

      <View style={s.section}>
        <View style={s.labelRow}>
          <Text style={s.label}>Notification Body <Text style={s.required}>*</Text></Text>
          <Text style={s.charCount}>{form.notifBody.length}/300</Text>
        </View>
        <TextInput
          style={[s.input, s.textArea]}
          placeholder="Enter notification message"
          placeholderTextColor={colors.textSecondary}
          value={form.notifBody}
          onChangeText={v => { if (v.length <= 300) updateForm('notifBody', v); }}
          maxLength={300}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={s.section}>
        <Text style={s.label}>Image URL <Text style={s.optional}>(optional)</Text></Text>
        <TextInput
          style={s.input}
          placeholder="https://example.com/image.png"
          placeholderTextColor={colors.textSecondary}
          value={form.imageUrl}
          onChangeText={v => updateForm('imageUrl', v)}
          autoCapitalize="none"
          keyboardType="url"
        />
      </View>

      {/* Live Preview */}
      <View style={s.section}>
        <Text style={s.label}>Live Preview</Text>
        <View style={s.previewCard}>
          <View style={s.previewHeader}>
            <View style={s.previewIconWrap}>
              <Ionicons name="notifications" size={16} color={colors.primary} />
            </View>
            <Text style={s.previewAppName}>TripKart</Text>
            <Text style={s.previewTime}>now</Text>
          </View>
          <Text style={s.previewTitle} numberOfLines={1}>
            {form.notifTitle || 'Notification Title'}
          </Text>
          <Text style={s.previewBody} numberOfLines={3}>
            {form.notifBody || 'Your notification message will appear here...'}
          </Text>
        </View>
      </View>
    </View>
  );

  // ─── Step 3: Coupon ──────────────────────────────────────────────────────────
  const renderStep3 = () => (
    <View>
      <Text style={s.stepTitle}>Attach a Coupon</Text>
      <Text style={s.stepSubtitle}>Link a discount coupon to this campaign.</Text>

      <View style={[s.section, s.switchRow]}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Attach a coupon?</Text>
          <Text style={s.switchDesc}>Users will see the coupon with this notification</Text>
        </View>
        <Switch
          value={form.attachCoupon}
          onValueChange={v => {
            updateForm('attachCoupon', v);
            if (!v) updateForm('couponId', null);
          }}
          trackColor={{ false: colors.borderSubtle, true: colors.primary + '88' }}
          thumbColor={form.attachCoupon ? colors.primary : colors.textSecondary}
        />
      </View>

      {form.attachCoupon && (
        <View style={s.section}>
          <Text style={s.label}>Select Existing Coupon</Text>
          {couponsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
          ) : coupons.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="pricetag-outline" size={32} color={colors.textSecondary} />
              <Text style={s.emptyText}>No coupons available</Text>
            </View>
          ) : (
            <>
              {/* No coupon option */}
              <TouchableOpacity
                style={[s.couponCard, form.couponId === null && s.couponCardSelected]}
                onPress={() => updateForm('couponId', null)}
              >
                <View style={s.couponCardLeft}>
                  <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={s.couponCode}>No Coupon / Skip</Text>
                    <Text style={s.couponMeta}>Do not attach any coupon</Text>
                  </View>
                </View>
                {form.couponId === null && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>

              {coupons.map(coupon => {
                const couponId = coupon._id || coupon.id;
                const isSelected = form.couponId === couponId;
                return (
                  <TouchableOpacity
                    key={couponId}
                    style={[s.couponCard, isSelected && s.couponCardSelected]}
                    onPress={() => updateForm('couponId', couponId)}
                  >
                    <View style={s.couponCardLeft}>
                      <View style={[s.couponBadge, isSelected && { backgroundColor: colors.primary }]}>
                        <Ionicons name="pricetag" size={14} color={isSelected ? '#fff' : colors.textSecondary} />
                      </View>
                      <View style={{ marginLeft: 12 }}>
                        <Text style={[s.couponCode, isSelected && { color: colors.primary }]}>
                          {coupon.code}
                        </Text>
                        <Text style={s.couponMeta}>
                          {coupon.type === 'percentage' ? `${coupon.value}% off` : `₹${coupon.value} off`}
                          {coupon.expiresAt ? ` · Expires ${new Date(coupon.expiresAt).toLocaleDateString()}` : ''}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {selectedCoupon && (
            <View style={s.couponPreview}>
              <View style={s.couponPreviewHeader}>
                <Ionicons name="pricetag" size={16} color={colors.primary} />
                <Text style={s.couponPreviewTitle}>Coupon Preview</Text>
              </View>
              <Text style={s.couponPreviewCode}>{selectedCoupon.code}</Text>
              <Text style={s.couponPreviewDiscount}>
                {selectedCoupon.type === 'percentage'
                  ? `${selectedCoupon.value}% discount`
                  : `₹${selectedCoupon.value} flat discount`}
              </Text>
              {selectedCoupon.expiresAt && (
                <Text style={s.couponPreviewExpiry}>
                  Valid until {new Date(selectedCoupon.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );

  // ─── Step 4: Audience & Deep Link ───────────────────────────────────────────
  const renderStep4 = () => (
    <View>
      <Text style={s.stepTitle}>Audience & Deep Link</Text>
      <Text style={s.stepSubtitle}>Choose who receives this campaign and where it leads.</Text>

      <View style={s.section}>
        <Text style={s.label}>Audience Segment</Text>
        {AUDIENCE_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[s.audienceRow, form.segment === opt.value && s.audienceRowSelected]}
            onPress={() => updateForm('segment', opt.value)}
          >
            <View style={[s.audienceIcon, form.segment === opt.value && { backgroundColor: colors.primary + '22' }]}>
              <Ionicons name={opt.icon} size={18} color={form.segment === opt.value ? colors.primary : colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.audienceLabel, form.segment === opt.value && { color: colors.primary }]}>
                {opt.label}
              </Text>
              <Text style={s.audienceDesc}>{opt.desc}</Text>
            </View>
            <View style={[s.radio, form.segment === opt.value && s.radioSelected]}>
              {form.segment === opt.value && <View style={s.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Audience Preview */}
      <View style={s.audiencePreviewBox}>
        <Ionicons name="people" size={18} color={colors.primary} />
        {audienceLoading ? (
          <ActivityIndicator color={colors.primary} size="small" style={{ marginLeft: 8 }} />
        ) : audienceCount !== null ? (
          <Text style={s.audiencePreviewText}>
            ~{audienceCount.toLocaleString()} users will receive this notification
          </Text>
        ) : (
          <Text style={s.audiencePreviewText}>Estimating audience size...</Text>
        )}
      </View>

      {/* Deep Link */}
      <View style={s.section}>
        <Text style={s.label}>Notification Tap Action</Text>
        <View style={s.chipRow}>
          {DEEP_LINK_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[s.chip, form.deepLinkScreen === opt.value && s.chipActive]}
              onPress={() => {
                updateForm('deepLinkScreen', opt.value);
                if (opt.value !== 'tour') updateForm('deepLinkParams', {});
              }}
            >
              <Text style={[s.chipText, form.deepLinkScreen === opt.value && s.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {form.deepLinkScreen === 'tour' && (
          <View style={{ marginTop: 12 }}>
            <Text style={s.label}>Tour ID <Text style={s.optional}>(optional)</Text></Text>
            <TextInput
              style={s.input}
              placeholder="Enter Tour ID"
              placeholderTextColor={colors.textSecondary}
              value={form.deepLinkParams?.tourId || ''}
              onChangeText={v => updateForm('deepLinkParams', { tourId: v })}
            />
          </View>
        )}
      </View>
    </View>
  );

  // ─── Step 5: Schedule & Review ───────────────────────────────────────────────
  const renderStep5 = () => (
    <View>
      <Text style={s.stepTitle}>Schedule & Review</Text>
      <Text style={s.stepSubtitle}>Choose when to send and review your campaign.</Text>

      {/* Schedule Type */}
      <View style={s.section}>
        <Text style={s.label}>When to Send</Text>
        <View style={s.scheduleRow}>
          {[
            { value: 'now', label: 'Send Now', icon: 'send-outline' },
            { value: 'scheduled', label: 'Schedule Later', icon: 'time-outline' },
            { value: 'recurring', label: 'Recurring', icon: 'repeat-outline' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[s.scheduleBtn, form.scheduleType === opt.value && s.scheduleBtnActive]}
              onPress={() => updateForm('scheduleType', opt.value)}
            >
              <Ionicons
                name={opt.icon}
                size={18}
                color={form.scheduleType === opt.value ? colors.primary : colors.textSecondary}
              />
              <Text style={[s.scheduleBtnText, form.scheduleType === opt.value && { color: colors.primary }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {form.scheduleType === 'scheduled' && (
          <TextInput
            style={[s.input, { marginTop: 12 }]}
            placeholder="YYYY-MM-DD HH:mm"
            placeholderTextColor={colors.textSecondary}
            value={form.scheduledAt}
            onChangeText={v => updateForm('scheduledAt', v)}
          />
        )}

        {form.scheduleType === 'recurring' && (
          <View style={{ marginTop: 12 }}>
            <Text style={s.label}>Recurrence</Text>
            <View style={s.chipRow}>
              {['daily', 'weekly', 'monthly'].map(r => (
                <TouchableOpacity
                  key={r}
                  style={[s.chip, form.recurrence === r && s.chipActive]}
                  onPress={() => updateForm('recurrence', r)}
                >
                  <Text style={[s.chipText, form.recurrence === r && s.chipTextActive]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Review Summary */}
      <View style={s.section}>
        <Text style={s.label}>Campaign Summary</Text>
        <View style={s.summaryCard}>
          {/* Campaign Type */}
          <View style={s.summaryRow}>
            <Text style={s.summaryKey}>Type</Text>
            <View style={[s.typeBadge, { backgroundColor: (selectedType?.color || colors.primary) + '22' }]}>
              <Ionicons name={selectedType?.icon} size={12} color={selectedType?.color || colors.primary} />
              <Text style={[s.typeBadgeText, { color: selectedType?.color || colors.primary }]}>
                {selectedType?.label}
              </Text>
            </View>
          </View>
          <View style={s.summaryDivider} />

          {/* Campaign Title */}
          <View style={s.summaryRow}>
            <Text style={s.summaryKey}>Campaign</Text>
            <Text style={s.summaryValue}>{form.title || '—'}</Text>
          </View>
          <View style={s.summaryDivider} />

          {/* Notification */}
          <View style={s.summaryRow}>
            <Text style={s.summaryKey}>Notification</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[s.summaryValue, { textAlign: 'right' }]} numberOfLines={1}>
                {form.notifTitle || '—'}
              </Text>
              <Text style={[s.summaryMeta, { textAlign: 'right' }]} numberOfLines={2}>
                {form.notifBody || ''}
              </Text>
            </View>
          </View>
          <View style={s.summaryDivider} />

          {/* Audience */}
          <View style={s.summaryRow}>
            <Text style={s.summaryKey}>Audience</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.summaryValue}>{selectedAudience?.label}</Text>
              {audienceCount !== null && (
                <Text style={s.summaryMeta}>~{audienceCount.toLocaleString()} users</Text>
              )}
            </View>
          </View>
          <View style={s.summaryDivider} />

          {/* Schedule */}
          <View style={s.summaryRow}>
            <Text style={s.summaryKey}>Schedule</Text>
            <Text style={s.summaryValue}>
              {form.scheduleType === 'now' ? 'Send Immediately' :
               form.scheduleType === 'scheduled' ? (form.scheduledAt || 'No date set') :
               `Recurring ${form.recurrence || '(not set)'}`}
            </Text>
          </View>

          {/* Coupon */}
          {needsCouponStep && form.attachCoupon && (
            <>
              <View style={s.summaryDivider} />
              <View style={s.summaryRow}>
                <Text style={s.summaryKey}>Coupon</Text>
                <Text style={s.summaryValue}>
                  {selectedCoupon ? selectedCoupon.code : 'None'}
                </Text>
              </View>
            </>
          )}

          {/* Deep Link */}
          {form.deepLinkScreen !== 'none' && (
            <>
              <View style={s.summaryDivider} />
              <View style={s.summaryRow}>
                <Text style={s.summaryKey}>Tap Action</Text>
                <Text style={s.summaryValue}>
                  {DEEP_LINK_OPTIONS.find(o => o.value === form.deepLinkScreen)?.label}
                  {form.deepLinkScreen === 'tour' && form.deepLinkParams?.tourId
                    ? ` (ID: ${form.deepLinkParams.tourId})`
                    : ''}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Notification Preview */}
      <View style={s.section}>
        <Text style={s.label}>Notification Preview</Text>
        <View style={s.previewCard}>
          <View style={s.previewHeader}>
            <View style={s.previewIconWrap}>
              <Ionicons name="notifications" size={16} color={colors.primary} />
            </View>
            <Text style={s.previewAppName}>TripKart</Text>
            <Text style={s.previewTime}>now</Text>
          </View>
          <Text style={s.previewTitle}>{form.notifTitle || 'Notification Title'}</Text>
          <Text style={s.previewBody}>{form.notifBody || 'Your notification message...'}</Text>
        </View>
      </View>

      {/* Launch Button */}
      <TouchableOpacity
        style={[s.launchBtn, loading && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="rocket-outline" size={20} color="#fff" />
            <Text style={s.launchBtnText}>Launch Campaign</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderCurrentStep = () => {
    if (step === 1) return renderStep1();
    if (step === 2) return renderStep2();
    if (needsCouponStep && step === 3) return renderStep3();
    const audienceStep = needsCouponStep ? 4 : 3;
    const scheduleStep = needsCouponStep ? 5 : 4;
    if (step === audienceStep) return renderStep4();
    if (step === scheduleStep) return renderStep5();
    return null;
  };

  const isLastStep = step === totalSteps;

  return (
    <AdminShell title="Create Campaign" showBack onBack={() => router.back()}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Step Indicator */}
        <View style={s.stepIndicatorWrap}>
          {renderStepIndicator()}
          <Text style={s.stepLabel}>
            Step {step} of {totalSteps}
          </Text>
        </View>

        {/* Content */}
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderCurrentStep()}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={s.bottomNav}>
          <TouchableOpacity
            style={[s.navBtn, s.navBtnSecondary, step === 1 && { opacity: 0.4 }]}
            onPress={goPrev}
            disabled={step === 1}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
            <Text style={s.navBtnSecondaryText}>Previous</Text>
          </TouchableOpacity>

          {!isLastStep && (
            <TouchableOpacity style={[s.navBtn, s.navBtnPrimary]} onPress={goNext}>
              <Text style={s.navBtnPrimaryText}>Next</Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </AdminShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors) => StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  // Step Indicator
  stepIndicatorWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  stepDotDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepDotText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  stepDotTextActive: {
    color: colors.primary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: 4,
  },
  stepLineDone: {
    backgroundColor: colors.primary,
  },
  stepLabel: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    marginTop: 8,
  },

  // Step headings
  stepTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 20,
  },

  // Section
  section: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: { color: colors.primary },
  optional: { color: colors.textSecondary, textTransform: 'none', fontFamily: fonts.regular },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  charCount: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary },

  // Input
  input: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },

  // Campaign Type Grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 20,
  },
  typeCard: {
    width: '46%',
    margin: '2%',
    backgroundColor: colors.elevated,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    position: 'relative',
  },
  typeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  typeDesc: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  typeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Notification Preview
  previewCard: {
    backgroundColor: colors.elevated,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  previewAppName: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  previewTime: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  previewTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  previewBody: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Coupon Step
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  switchDesc: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.elevated,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },
  couponCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '11',
  },
  couponCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  couponBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponCode: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  couponMeta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  couponPreview: {
    backgroundColor: colors.primary + '11',
    borderRadius: radius.lg,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  couponPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  couponPreviewTitle: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  couponPreviewCode: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  couponPreviewDiscount: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  couponPreviewExpiry: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: colors.elevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },

  // Audience
  audienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },
  audienceRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '0D',
  },
  audienceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  audienceLabel: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  audienceDesc: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  audiencePreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '11',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary + '44',
    gap: 8,
  },
  audiencePreviewText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.primary,
    flex: 1,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full || 999,
    backgroundColor: colors.elevated,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },
  chipActive: {
    backgroundColor: colors.primary + '22',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
  },

  // Schedule
  scheduleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scheduleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.elevated,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    gap: 4,
  },
  scheduleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '11',
  },
  scheduleBtnText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: colors.elevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: 14,
  },
  summaryKey: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginRight: 12,
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  summaryMeta: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full || 999,
    gap: 5,
  },
  typeBadgeText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },

  // Launch Button
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    gap: 10,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  launchBtnText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: radius.md,
    gap: 6,
  },
  navBtnSecondary: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  navBtnSecondaryText: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  navBtnPrimary: {
    backgroundColor: colors.primary,
  },
  navBtnPrimaryText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: '#fff',
  },
});
