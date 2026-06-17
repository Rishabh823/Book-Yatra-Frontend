import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Switch,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { coupons as couponsApi } from '../../lib/api';
import { colors, fonts, radius, shadow } from '../../lib/theme';
import { DateInput } from '../../components/DateInput';
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const DISCOUNT_TYPES = [
  { key: 'percentage', label: '% Percent',   icon: 'percent',      color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'fixed',      label: '₹ Fixed',     icon: 'cash-outline', color: '#0284C7', bg: '#EFF6FF' },
  { key: 'free_seats', label: 'Free Seats',  icon: 'people',       color: '#16A34A', bg: '#F0FDF4' },
];

const EMPTY_FORM = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  minOrderAmount: '',
  maxDiscount: '',
  usageLimit: '',
  perUserLimit: '',
  expiryDate: '',
  isActive: true,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isExpired(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isExpiringSoon(dateStr) {
  if (!dateStr) return false;
  const diff = new Date(dateStr) - new Date();
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000; // 3 days
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getTypeInfo(type) {
  return DISCOUNT_TYPES.find(t => t.key === type) || DISCOUNT_TYPES[0];
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AdminCouponsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [couponList, setCouponList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [statsModal, setStatsModal] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [statsCoupon, setStatsCoupon] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const { toast, showToast, hideToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const res = await couponsApi.list();
      setCouponList(res.data || res.coupons || res || []);
    } catch (e) {
      console.warn('Failed to load coupons', e);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      code:           item.code || '',
      description:    item.description || '',
      discountType:   item.type || 'percentage',          // model field: type
      discountValue:  item.value != null ? String(item.value) : '',  // model field: value
      minOrderAmount: item.minBookingAmount != null ? String(item.minBookingAmount) : '',  // model field: minBookingAmount
      maxDiscount:    '',
      usageLimit:     item.maxUses != null ? String(item.maxUses) : '',  // model field: maxUses
      perUserLimit:   '',
      expiryDate:     item.validTill ? item.validTill.split('T')[0] : '',  // model field: validTill
      isActive:       item.isActive !== false,
    });
    setShowModal(true);
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = () => {
    const code = form.code.trim();
    if (!code) return 'Coupon code is required.';
    if (!/^[A-Z0-9]+$/.test(code)) return 'Code must contain only uppercase letters and numbers.';
    const val = parseFloat(form.discountValue);
    if (!form.discountValue || isNaN(val) || val <= 0) return 'Discount value must be greater than 0.';
    if (form.discountType === 'percentage' && val > 100) return 'Percentage cannot exceed 100.';
    if (form.expiryDate && new Date(form.expiryDate) < new Date()) return 'Expiry date must be in the future.';
    return null;
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const save = async () => {
    const err = validate();
    if (err) { showToast(err, "error"); return; }

    setSaving(true);
    try {
      // Map form field names → model field names
      const payload = {
        code:              form.code.trim().toUpperCase(),
        description:       form.description.trim(),
        type:              form.discountType,           // model: type
        value:             parseFloat(form.discountValue), // model: value
        minBookingAmount:  form.minOrderAmount ? parseFloat(form.minOrderAmount) : 0, // model: minBookingAmount
        maxUses:           form.usageLimit ? parseInt(form.usageLimit) : 100,  // model: maxUses
        validTill:         form.expiryDate || undefined, // model: validTill (required)
        isActive:          form.isActive,
      };
      if (!payload.validTill) {
        showToast('Expiry date is required.', "error");
        setSaving(false);
        return;
      }

      if (editing) {
        await couponsApi.update(editing._id, payload);
      } else {
        await couponsApi.create(payload);
      }
      setShowModal(false);
      load();
    } catch (e) {
      showToast(e.message || 'Failed to save coupon. Please try again.', "error");
    }
    setSaving(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = (item) => {
    setDeleteTarget(item);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setShowDeleteConfirm(false);
    try {
      await couponsApi.remove(deleteTarget._id);
      setCouponList(prev => prev.filter(c => c._id !== deleteTarget._id));
    } catch (e) {
      showToast(e.message || 'Failed to delete coupon.', "error");
    }
    setDeleteTarget(null);
  };

  // ── Toggle active ─────────────────────────────────────────────────────────

  const handleToggleActive = async (item) => {
    const newVal = !item.isActive;
    // Optimistic update
    setCouponList(prev => prev.map(c => c._id === item._id ? { ...c, isActive: newVal } : c));
    try {
      await couponsApi.update(item._id, { isActive: newVal });
    } catch (e) {
      // Revert on failure
      setCouponList(prev => prev.map(c => c._id === item._id ? { ...c, isActive: !newVal } : c));
      showToast('Failed to update coupon status.', "error");
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const openStats = async (item) => {
    setStatsCoupon(item);
    setStatsData(null);
    setStatsModal(true);
    setStatsLoading(true);
    try {
      const res = await couponsApi.stats(item._id);
      setStatsData(res.data || res.stats || res);
    } catch {
      setStatsData(null);
    }
    setStatsLoading(false);
  };

  // ── Render card ───────────────────────────────────────────────────────────

  const renderItem = ({ item }) => {
    // Map model fields to display — model uses: type, value, validTill, minBookingAmount, maxUses, usedCount
    const typeInfo = getTypeInfo(item.type);
    const expired = isExpired(item.validTill);
    const expiringSoon = isExpiringSoon(item.validTill);
    const usageCount = item.usedCount || 0;
    const usageLimit = item.maxUses || 0;
    const usagePct = usageLimit > 0 ? Math.min(usageCount / usageLimit, 1) : 0;

    return (
      <View style={[styles.card, shadow.soft, expired && styles.cardExpired]}>
        {/* Tap entire info area to open stats */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => openStats(item)}>
          {/* Expired overlay badge */}
          {expired && (
            <View style={styles.expiredBadge}>
              <Text style={styles.expiredBadgeText}>EXPIRED</Text>
            </View>
          )}

          {/* Top row: code + type badge */}
          <View style={styles.cardTopRow}>
            <Text style={styles.couponCode}>{item.code}</Text>
            <View style={[styles.typeBadge, { backgroundColor: typeInfo.bg }]}>
              <Ionicons name={typeInfo.icon} size={11} color={typeInfo.color} />
              <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
            </View>
          </View>

          {/* Discount value */}
          <View style={styles.discountRow}>
            <Text style={styles.discountValue}>
              {item.type === 'percentage'
                ? `${item.value}% OFF`
                : item.type === 'fixed'
                ? `₹${item.value} OFF`
                : `${item.value} Free Seat(s)`}
            </Text>
            {item.minBookingAmount > 0 && (
              <Text style={styles.minOrder}>Min ₹{item.minBookingAmount}</Text>
            )}
          </View>

          {/* Description */}
          {!!item.description && (
            <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
          )}

          {/* Usage bar */}
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>
              {usageCount} / {usageLimit === 0 ? '∞' : usageLimit} used
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${usagePct * 100}%` }]} />
            </View>
          </View>

          {/* Expiry */}
          <View style={styles.expiryRow}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={expired ? colors.error : expiringSoon ? colors.warning : colors.textSecondary}
            />
            <Text style={[
              styles.expiryText,
              expired && styles.expiryExpired,
              expiringSoon && !expired && styles.expirySoon,
            ]}>
              {item.validTill
                ? (expired ? 'Expired ' : expiringSoon ? 'Expires soon · ' : 'Expires ') + formatDate(item.validTill)
                : 'No expiry'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Bottom row: active toggle + edit/delete — sibling, NOT nested */}
        <View style={styles.cardActions}>
          <View style={styles.activeToggleRow}>
            <Switch
              value={item.isActive}
              onValueChange={() => handleToggleActive(item)}
              trackColor={{ false: '#E5E7EB', true: colors.success + '60' }}
              thumbColor={item.isActive ? colors.success : '#9CA3AF'}
              style={styles.toggleSwitch}
            />
            <Text style={[styles.activeLabel, { color: item.isActive ? colors.success : colors.textDisabled }]}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>

          <View style={styles.actionBtns}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => openEdit(item)}
            >
              <Ionicons name="pencil" size={14} color={colors.primary} />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash-outline" size={14} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={['#1E0A0A', '#5C1615']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Coupons</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* List */}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={couponList}
          keyExtractor={item => String(item._id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={44} color={colors.textDisabled} />
              <Text style={styles.emptyTitle}>No coupons yet</Text>
              <Text style={styles.emptyText}>Tap + to create your first coupon.</Text>
            </View>
          }
        />
      )}

      {/* ─── Add / Edit Modal ─────────────────────────────────────────── */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => !saving && setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Coupon' : 'New Coupon'}</Text>
              <TouchableOpacity onPress={() => !saving && setShowModal(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Code */}
              <SectionHead label="Coupon Code" />
              <TextInput
                style={styles.input}
                value={form.code}
                onChangeText={v => f('code', v.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="e.g. YATRA25 *"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                maxLength={20}
              />

              {/* Description */}
              <TextInput
                style={styles.input}
                value={form.description}
                onChangeText={v => f('description', v)}
                placeholder="Short description (optional)"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Discount Type */}
              <SectionHead label="Discount Type" />
              <View style={styles.chipRow}>
                {DISCOUNT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.chip, form.discountType === t.key && { backgroundColor: t.bg, borderColor: t.color }]}
                    onPress={() => f('discountType', t.key)}
                  >
                    <Ionicons name={t.icon} size={14} color={form.discountType === t.key ? t.color : colors.textSecondary} />
                    <Text style={[styles.chipText, form.discountType === t.key && { color: t.color, fontFamily: fonts.bodyBold }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Discount Value */}
              <SectionHead label="Discount Value" />
              <View style={styles.inputWithSuffix}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={form.discountValue}
                  onChangeText={v => f('discountValue', v.replace(/[^0-9.]/g, ''))}
                  placeholder="e.g. 20"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
                <View style={styles.suffixBox}>
                  <Text style={styles.suffixText}>
                    {form.discountType === 'percentage' ? '%' : form.discountType === 'fixed' ? '₹' : 'seats'}
                  </Text>
                </View>
              </View>

              {/* Min Order Amount */}
              <SectionHead label="Minimum Order Amount" />
              <TextInput
                style={styles.input}
                value={form.minOrderAmount}
                onChangeText={v => f('minOrderAmount', v.replace(/[^0-9.]/g, ''))}
                placeholder="0 = no minimum"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />

              {/* Max Discount (percentage only) */}
              {form.discountType === 'percentage' && (
                <>
                  <SectionHead label="Maximum Discount Cap" />
                  <TextInput
                    style={styles.input}
                    value={form.maxDiscount}
                    onChangeText={v => f('maxDiscount', v.replace(/[^0-9.]/g, ''))}
                    placeholder="Max ₹ cap (optional)"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </>
              )}

              {/* Usage Limit */}
              <SectionHead label="Usage Limit" />
              <TextInput
                style={styles.input}
                value={form.usageLimit}
                onChangeText={v => f('usageLimit', v.replace(/[^0-9]/g, ''))}
                placeholder="0 = unlimited"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
              />

              {/* Per User Limit */}
              <SectionHead label="Per User Limit" />
              <TextInput
                style={styles.input}
                value={form.perUserLimit}
                onChangeText={v => f('perUserLimit', v.replace(/[^0-9]/g, ''))}
                placeholder="How many times per user"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
              />

              {/* Expiry Date */}
              <SectionHead label="Expiry Date" />
              <DateInput
                label=""
                value={form.expiryDate}
                onChange={v => f('expiryDate', v)}
                minDate={new Date()}
                style={styles.dateField}
              />

              {/* Active Toggle */}
              <View style={styles.activeRow}>
                <Text style={styles.activeRowLabel}>Active</Text>
                <Switch
                  value={form.isActive}
                  onValueChange={v => f('isActive', v)}
                  trackColor={{ false: '#E5E7EB', true: colors.success + '60' }}
                  thumbColor={form.isActive ? colors.success : '#9CA3AF'}
                />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={styles.saveBtnText}>{editing ? 'Update Coupon' : 'Create Coupon'}</Text>}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── Stats Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={statsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setStatsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '60%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{statsCoupon?.code}</Text>
                <Text style={styles.statsSubtitle}>Usage Statistics</Text>
              </View>
              <TouchableOpacity onPress={() => setStatsModal(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>

            {statsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
            ) : statsData ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.statsGrid}>
                  <StatCard
                    icon="repeat"
                    label="Total Uses"
                    value={statsData.totalUses ?? statsCoupon?.usageCount ?? '—'}
                    color="#7C3AED"
                    bg="#F5F3FF"
                  />
                  <StatCard
                    icon="people"
                    label="Unique Users"
                    value={statsData.uniqueUsers ?? '—'}
                    color="#0284C7"
                    bg="#EFF6FF"
                  />
                  <StatCard
                    icon="cash"
                    label="Total Saved"
                    value={statsData.totalDiscountGiven != null ? `₹${statsData.totalDiscountGiven}` : '—'}
                    color="#16A34A"
                    bg="#F0FDF4"
                  />
                  <StatCard
                    icon="trending-up"
                    label="Revenue"
                    value={statsData.revenueGenerated != null ? `₹${statsData.revenueGenerated}` : '—'}
                    color="#D97706"
                    bg="#FFFBEB"
                  />
                </View>

                {/* Usage bar */}
                {statsCoupon?.maxUses > 0 && (
                  <View style={styles.statsBarWrap}>
                    <View style={styles.statsBarHeader}>
                      <Text style={styles.statsBarLabel}>Usage progress</Text>
                      <Text style={styles.statsBarCount}>
                        {statsCoupon.usedCount || 0} of {statsCoupon.maxUses} used
                      </Text>
                    </View>
                    <View style={styles.statsTrack}>
                      <View
                        style={[
                          styles.statsFill,
                          { width: `${Math.min(((statsCoupon.usedCount || 0) / statsCoupon.maxUses) * 100, 100)}%` },
                        ]}
                      />
                    </View>
                  </View>
                )}
                <View style={{ height: 16 }} />
              </ScrollView>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="bar-chart-outline" size={36} color={colors.textDisabled} />
                <Text style={styles.emptyText}>No stats available yet.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Coupon"
        message={`Are you sure you want to delete "${deleteTarget?.code}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setShowDeleteConfirm(false)}
        onDismiss={() => setShowDeleteConfirm(false)}
        destructive
      />
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHead({ label }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionHeadTxt}>{label}</Text>
    </View>
  );
}

function StatCard({ icon, label, value, color, bg }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    paddingHorizontal: 20, paddingBottom: 16, paddingTop: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontFamily: 'Philosopher_700Bold', fontSize: 22, color: 'white' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Card
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: 14, gap: 8, overflow: 'hidden',
  },
  cardExpired: { opacity: 0.6 },
  expiredBadge: {
    position: 'absolute', top: 10, right: -20, zIndex: 10,
    backgroundColor: colors.error, paddingHorizontal: 28, paddingVertical: 3,
    transform: [{ rotate: '35deg' }],
  },
  expiredBadgeText: {
    fontFamily: fonts.bodyBold, fontSize: 9, color: 'white', letterSpacing: 1,
  },

  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  couponCode: {
    fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
  },
  typeBadgeText: { fontFamily: fonts.bodyBold, fontSize: 11 },

  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  discountValue: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.secondary },
  minOrder: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },

  cardDesc: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },

  usageRow: { gap: 4 },
  usageLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  progressTrack: {
    height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: colors.primary, borderRadius: 2 },

  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expiryText: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  expiryExpired: { color: colors.error, fontFamily: fonts.bodyBold },
  expirySoon: { color: colors.warning, fontFamily: fonts.bodyBold },

  cardActions: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 4,
  },
  activeToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleSwitch: { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] },
  activeLabel: { fontFamily: fonts.bodyMedium, fontSize: 12 },
  actionBtns: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.primary,
  },
  actionBtnDanger: { borderColor: colors.error },
  actionText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textSecondary },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.textDisabled },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '94%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  modalTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  modalClose: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textSecondary },
  statsSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  // Form
  sectionHead: { marginTop: 12, marginBottom: 6 },
  sectionHeadTxt: {
    fontFamily: fonts.accent, fontSize: 9, color: colors.textSecondary,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#F3F4F6', borderRadius: radius.lg,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: fonts.body, fontSize: 14,
    color: colors.textPrimary, marginBottom: 10,
  },
  inputWithSuffix: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  suffixBox: {
    backgroundColor: '#F3F4F6', borderRadius: radius.lg,
    paddingHorizontal: 14, justifyContent: 'center',
  },
  suffixText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSecondary },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: colors.borderSubtle,
    backgroundColor: '#F9FAFB',
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
  dateField: { marginBottom: 10 },
  activeRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12, marginBottom: 8,
  },
  activeRowLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    padding: 14, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: 'white' },

  // Stats
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16,
  },
  statCard: {
    flex: 1, minWidth: '44%', borderRadius: radius.lg,
    padding: 14, alignItems: 'center', gap: 6,
  },
  statIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textAlign: 'center' },

  statsBarWrap: { marginTop: 4, gap: 6 },
  statsBarHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  statsBarLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textPrimary },
  statsBarCount: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  statsTrack: {
    height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden',
  },
  statsFill: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
});
