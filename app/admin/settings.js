import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, Switch, Platform, DeviceEventEmitter,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AdminShell } from '../../lib/AdminScreen';
import { fonts, radius } from '../../lib/theme';
import { api } from '../../lib/api';
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import { useColors } from "../../lib/ThemeContext";

const DEFAULTS = {
  bookingRestrictionPeriod: 0,
  maintenanceMode: false,
  announcement: '',
  allowNewRegistrations: true,
  maxSeatsPerBooking: 10,
  paymentGatewayEnabled: true,
  contactPhone: '',
  contactEmail: '',
};

export default function AdminSettings() {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [cfg, setCfg]         = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    AsyncStorage.getItem('role').then(r => setIsSuperAdmin(r === 'super_admin')).catch(() => {});
    api.get('/settings').then(res => {
      const data = res?.data || res || {};
      setCfg({ ...DEFAULTS, ...data });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (key, val) => {
    setCfg(c => ({ ...c, [key]: val }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', {
        bookingRestrictionPeriod: Number(cfg.bookingRestrictionPeriod) || 0,
        maintenanceMode: cfg.maintenanceMode,
        announcement: cfg.announcement,
        allowNewRegistrations: cfg.allowNewRegistrations,
        maxSeatsPerBooking: Number(cfg.maxSeatsPerBooking) || 10,
        paymentGatewayEnabled: cfg.paymentGatewayEnabled,
        contactPhone: cfg.contactPhone,
        contactEmail: cfg.contactEmail,
      });
      setDirty(false);
      DeviceEventEmitter.emit("appSettingsChanged", cfg);
      showToast('Settings updated successfully.', "success");
    } catch (e) {
      showToast(e.message || 'Failed to save settings.', "error");
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <AdminShell title="Settings" subtitle="App configuration">
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Settings" subtitle="App configuration">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Platform Control ─────────────────────────────── */}
        <SectionLabel icon="shield-outline" title="Platform Control" s={s} colors={colors} />

        {isSuperAdmin && (
          <View style={s.card}>
            <ToggleRow
              icon="construct-outline"
              label="Maintenance Mode"
              hint="Hides all tabs and shows a maintenance screen to all users. Only super admins can access the app."
              value={cfg.maintenanceMode}
              onChange={v => set('maintenanceMode', v)}
              danger
              s={s}
              colors={colors}
            />
          </View>
        )}

        <View style={s.card}>
          <ToggleRow
            icon="person-add-outline"
            label="Allow New Registrations"
            hint="When disabled, new users cannot sign up for an account."
            value={cfg.allowNewRegistrations}
            onChange={v => set('allowNewRegistrations', v)}
            s={s}
            colors={colors}
          />
        </View>

        <View style={s.card}>
          <ToggleRow
            icon="card-outline"
            label="Payment Gateway"
            hint="Enable or disable Razorpay online payments. Cash payments still work."
            value={cfg.paymentGatewayEnabled}
            onChange={v => set('paymentGatewayEnabled', v)}
            s={s}
            colors={colors}
          />
        </View>

        {/* ── Announcement Banner ──────────────────────────── */}
        <SectionLabel icon="megaphone-outline" title="Announcement Banner" s={s} colors={colors} />

        <View style={s.card}>
          <Text style={s.fieldLabel}>Banner Message</Text>
          <Text style={s.hint}>Shown as a banner at the top of the app for all users. Leave empty to hide.</Text>
          <TextInput
            style={[s.input, s.textarea]}
            value={cfg.announcement}
            onChangeText={v => set('announcement', v)}
            placeholder="e.g. Office closed on 15 Aug. Bookings will resume on 16 Aug."
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* ── Booking Rules ────────────────────────────────── */}
        <SectionLabel icon="ticket-outline" title="Booking Rules" s={s} colors={colors} />

        <View style={s.card}>
          <Text style={s.fieldLabel}>Booking Restriction Period</Text>
          <Text style={s.hint}>Users cannot make a new booking within this many days of their last booking. Set to 0 to disable.</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.numInput}
              value={String(cfg.bookingRestrictionPeriod)}
              onChangeText={v => set('bookingRestrictionPeriod', v)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textDisabled}
            />
            <Text style={s.unit}>days</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.fieldLabel}>Max Seats Per Booking</Text>
          <Text style={s.hint}>Maximum number of seats a single user can book in one booking. (1–50)</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.numInput}
              value={String(cfg.maxSeatsPerBooking)}
              onChangeText={v => set('maxSeatsPerBooking', v)}
              keyboardType="numeric"
              placeholder="10"
              placeholderTextColor={colors.textDisabled}
            />
            <Text style={s.unit}>seats</Text>
          </View>
        </View>

        {/* ── Contact Info ─────────────────────────────────── */}
        <SectionLabel icon="call-outline" title="Contact Information" s={s} colors={colors} />

        <View style={s.card}>
          <Text style={s.fieldLabel}>Support Phone</Text>
          <View style={s.iconInput}>
            <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
            <TextInput
              style={s.iconInputField}
              value={cfg.contactPhone}
              onChangeText={v => set('contactPhone', v)}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor={colors.textDisabled}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.fieldLabel}>Support Email</Text>
          <View style={s.iconInput}>
            <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
            <TextInput
              style={s.iconInputField}
              value={cfg.contactEmail}
              onChangeText={v => set('contactEmail', v)}
              placeholder="e.g. support@tripkart.com"
              placeholderTextColor={colors.textDisabled}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* ── Save ─────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.saveBtn, !dirty && s.saveBtnDim]}
          onPress={save}
          disabled={saving || !dirty}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={s.saveBtnTxt}>{dirty ? 'Save Settings' : 'All Saved'}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </AdminShell>
  );
}

function SectionLabel({ icon, title, s, colors }) {
  return (
    <View style={s.sectionRow}>
      <Ionicons name={icon} size={13} color={colors.textSecondary} />
      <Text style={s.sectionLabel}>{title}</Text>
    </View>
  );
}

function ToggleRow({ icon, label, hint, value, onChange, danger, s, colors }) {
  return (
    <View>
      <View style={s.toggleTop}>
        <View style={[s.toggleIcon, { backgroundColor: (danger && value ? '#FEE2E2' : colors.primary + '14') }]}>
          <Ionicons name={icon} size={16} color={danger && value ? '#DC2626' : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.fieldLabel, { marginBottom: 0, color: danger && value ? '#DC2626' : colors.textPrimary }]}>{label}</Text>
          <Text style={s.hint} numberOfLines={2}>{hint}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: colors.borderSubtle, true: danger ? '#FCA5A5' : '#86EFAC' }}
          thumbColor={value ? (danger ? '#DC2626' : '#16A34A') : colors.textDisabled}
        />
      </View>
      {danger && value && (
        <View style={s.dangerBanner}>
          <Ionicons name="warning-outline" size={13} color="#DC2626" />
          <Text style={s.dangerTxt}>This feature is currently active and affecting users</Text>
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  sectionRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 8 },
  sectionLabel: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.textSecondary, letterSpacing: 2, textTransform: 'uppercase' },

  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.borderSubtle },

  toggleTop:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary, marginBottom: 4 },
  hint:       { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginBottom: 10 },

  input:       { backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle, paddingHorizontal: 14, paddingVertical: 10, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  textarea:    { height: 80, paddingTop: 10 },

  inputRow:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.bg },
  numInput:    { flex: 1, height: 52, paddingHorizontal: 16, fontFamily: fonts.bodyBold, fontSize: 22, color: colors.textPrimary },
  unit:        { paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },

  iconInput:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle, paddingHorizontal: 14, height: 46 },
  iconInputField: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },

  dangerBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, marginTop: 10 },
  dangerTxt:    { fontFamily: fonts.body, fontSize: 12, color: '#DC2626', flex: 1 },

  saveBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, height: 56, borderRadius: 999, backgroundColor: colors.primary },
  saveBtnDim: { backgroundColor: colors.textDisabled, opacity: 0.6 },
  saveBtnTxt: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15 },
});
