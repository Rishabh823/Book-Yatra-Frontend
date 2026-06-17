import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import Toast from '../../components/Toast';
import { useToast } from '../../lib/hooks/useToast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, fonts, radius, shadow } from '../../lib/theme';
import { auth as authApi } from '../../lib/api';

// ─── Step indicators ─────────────────────────────────────────────────────────
const STEP_LABELS_REG = ['Email', 'Verify', 'Profile'];

function StepBar({ step }) {
  return (
    <View style={sd.outer}>
      <View style={sd.track}>
        {[1, 2, 3].map((n, i) => (
          <React.Fragment key={n}>
            {i > 0 && <View style={[sd.line, step > i && sd.lineDone]} />}
            <View style={sd.stepWrap}>
              <View style={[sd.dot, step >= n && sd.dotActive, step > n && sd.dotDone]}>
                {step > n
                  ? <Ionicons name="checkmark" size={13} color="#fff" />
                  : <Text style={[sd.num, step >= n && { color: '#fff' }]}>{n}</Text>
                }
              </View>
              <Text style={[sd.lbl, step >= n && sd.lblActive]} numberOfLines={1}>
                {STEP_LABELS_REG[i]}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
const sd = StyleSheet.create({
  outer:     { marginVertical: 16, paddingHorizontal: 8 },
  track:     { flexDirection: 'row', alignItems: 'flex-start' },
  stepWrap:  { alignItems: 'center', width: 62 },
  dot:       { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.borderSubtle },
  dotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotDone:   { backgroundColor: colors.success, borderColor: colors.success },
  num:       { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  line:      { flex: 1, height: 2, backgroundColor: colors.borderSubtle, marginTop: 15, marginHorizontal: 2 },
  lineDone:  { backgroundColor: colors.success },
  lbl:       { fontFamily: fonts.body, fontSize: 10, color: colors.textSecondary, marginTop: 5, textAlign: 'center' },
  lblActive: { color: colors.primary, fontFamily: fonts.bodyBold },
});

// ─── Main component ───────────────────────────────────────────────────────────
export default function Register() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [regType, setRegType] = useState(params.type || null); // 'user' | 'manager' | null
  const [step, setStep] = useState(1);    // 1=email, 2=otp, 3=details
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [form, setForm] = useState({ firstName: '', middleName: '', lastName: '', phone: '', password: '', businessName: '' });

  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  const { toast, showToast, hideToast } = useToast();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isManager = regType === 'manager';

  // ── Step 1: send OTP ──────────────────────────────────────────────────────
  const onSendOtp = async () => {
    if (!email.trim()) { showToast('Please enter your email address'); return; }
    setLoading(true);
    try {
      await authApi.sendRegOtp(email.trim().toLowerCase());
      showToast(`OTP sent to ${email}`, 'success');
      setStep(2);
    } catch (e) {
      showToast(e.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP (accepts pre-built code for auto-verify path) ────────
  const onVerifyOtp = async (codeOverride) => {
    const code = codeOverride ?? otp.join('');
    if (code.length < 6) { showToast('Please enter the full 6-digit OTP'); return; }
    setLoading(true);
    try {
      await authApi.verifyRegOtp(email.trim().toLowerCase(), code);
      showToast('Email verified!', 'success');
      setStep(3);
    } catch (e) {
      showToast(e.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) {
      otpRefs[idx + 1].current?.focus();
    } else if (val && idx === 5) {
      // Last digit filled — auto-verify immediately using the fresh array
      const code = next.join('');
      if (code.length === 6) onVerifyOtp(code);
    }
    if (!val && idx > 0) otpRefs[idx - 1].current?.focus();
  };

  // ── Step 3: create account ────────────────────────────────────────────────
  const onCreateAccount = async () => {
    const { firstName, lastName, phone, password, businessName } = form;
    if (!firstName.trim() || !lastName.trim()) { showToast('First name and last name are required'); return; }
    if (!phone.trim()) { showToast('Phone number is required'); return; }
    if (!password || password.length < 6) { showToast('Password must be at least 6 characters'); return; }
    if (isManager && !businessName.trim()) { showToast('Business / organization name is required'); return; }

    setLoading(true);
    try {
      const payload = {
        email: email.trim().toLowerCase(),
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || undefined,
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        password: form.password,
        ...(isManager && { businessName: form.businessName.trim() }),
      };

      if (isManager) {
        await authApi.registerManager(payload);
      } else {
        await authApi.registerUser(payload);
      }

      // Auto-login with the credentials just used (use the correct endpoint per role)
      const loginRes = isManager
        ? await authApi.loginManager(payload.email, payload.password)
        : await authApi.login(payload.email, payload.password);
      showToast('Welcome to TripKart!', 'success');

      // Small delay so toast is visible, then navigate
      setTimeout(() => {
        if (loginRes?.user?.role === 'user' && !(loginRes?.user?.joinedOperators?.length > 0)) {
          router.replace('/select-operators');
        } else {
          router.replace('/(tabs)');
        }
      }, 800);
    } catch (e) {
      showToast(e.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Type selector screen ──────────────────────────────────────────────────
  if (!regType) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <LinearGradient colors={[colors.secondary, '#1E0504']} style={s.hero}>
          <View style={[s.decCircle, { width: 200, height: 200, top: -70, right: -60 }]} />
          <View style={[s.decCircle, { width: 120, height: 120, bottom: 10, left: -40 }]} />
          <TouchableOpacity onPress={() => router.back()} style={s.back}>
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
          <View style={s.logoBox}>
            <Ionicons name="people" size={30} color={colors.primary} />
          </View>
          <Text style={s.appLabel}>BOOK YATRA</Text>
          <Text style={s.title}>Create Account</Text>
          <Text style={s.sub}>Choose how you want to join</Text>
        </LinearGradient>

        <View style={s.typeCard__container}>
          <TouchableOpacity style={s.typeCard} onPress={() => setRegType('user')} testID="reg-type-user">
            <View style={[s.typeIcon, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="person" size={26} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.typeTitle}>I'm a Traveler</Text>
              <Text style={s.typeSub}>Book tours, track yatras & manage your bookings</Text>
            </View>
            <View style={s.typeChevron}>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.typeCard} onPress={() => setRegType('manager')} testID="reg-type-manager">
            <View style={[s.typeIcon, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="bus" size={26} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.typeTitle}>I'm a Tour Manager</Text>
              <Text style={s.typeSub}>Create & manage tours, handle bookings & team</Text>
            </View>
            <View style={s.typeChevron}>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={s.loginRow}>
            <Text style={s.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/auth/login')} testID="goto-login">
              <Text style={s.linkSmall}>Login here</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Registration flow (steps 1-3) ─────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>

          {/* Hero */}
          <LinearGradient colors={[colors.secondary, '#1E0504']} style={s.hero}>
            <View style={[s.decCircle, { width: 200, height: 200, top: -70, right: -60 }]} />
            <View style={[s.decCircle, { width: 120, height: 120, bottom: 10, left: -40 }]} />
            <TouchableOpacity
              onPress={() => { if (step > 1) setStep(step - 1); else setRegType(null); }}
              style={s.back}
            >
              <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <View style={s.logoBox}>
              <Ionicons name={isManager ? 'bus' : 'person'} size={30} color={colors.primary} />
            </View>
            <Text style={s.appLabel}>BOOK YATRA</Text>
            <Text style={s.title}>{isManager ? 'Tour Manager' : 'Create Account'}</Text>
            <Text style={s.sub}>
              {step === 1 ? 'Step 1 — Verify your email' :
               step === 2 ? 'Step 2 — Enter the OTP' :
                            'Step 3 — Complete your profile'}
            </Text>
          </LinearGradient>

          {/* ── Form Card ── */}
          <View style={s.formCard}>
          {/* Type badge */}
          <View style={s.badgeRow}>
            <View style={[s.badge, isManager && s.badgeManager]}>
              <Ionicons name={isManager ? 'bus-outline' : 'person-outline'} size={13} color={isManager ? '#D97706' : colors.primary} />
              <Text style={[s.badgeText, isManager && { color: '#D97706' }]}>
                {isManager ? 'Tour Manager Account' : 'Traveler Account'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => { setRegType(null); setStep(1); }}>
              <Text style={s.changeType}>Change</Text>
            </TouchableOpacity>
          </View>

          <StepBar step={step} />

          <View style={{ paddingHorizontal: 24 }}>

            {/* ── STEP 1: Email ── */}
            {step === 1 && (
              <>
                <Text style={s.stepTitle}>Enter your email address</Text>
                <Text style={s.stepSub}>We'll send a 6-digit OTP to verify it.</Text>
                <View style={ss.field}>
                  <Text style={ss.label}>Email Address</Text>
                  <View style={ss.inputWrap}>
                    <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
                    <TextInput
                      testID="reg-email-input"
                      style={ss.input}
                      placeholder="you@example.com"
                      placeholderTextColor={colors.textDisabled}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={[s.cta, isManager && s.ctaManager]}
                  onPress={onSendOtp}
                  disabled={loading}
                  testID="send-otp-btn"
                >
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={s.ctaText}>Send OTP</Text>
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === 2 && (
              <>
                <Text style={s.stepTitle}>Enter the 6-digit OTP</Text>
                <Text style={s.stepSub}>Sent to <Text style={{ fontFamily: fonts.bodyBold, color: colors.textPrimary }}>{email}</Text></Text>

                <View style={s.otpRow}>
                  {otp.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={otpRefs[i]}
                      style={[s.otpBox, digit && s.otpBoxFilled]}
                      value={digit}
                      onChangeText={(v) => handleOtpChange(v, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      testID={`otp-input-${i}`}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[s.cta, isManager && s.ctaManager]}
                  onPress={onVerifyOtp}
                  disabled={loading}
                  testID="verify-otp-btn"
                >
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={s.ctaText}>Verify OTP</Text>
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={{ alignSelf: 'center', marginTop: 16 }} onPress={onSendOtp}>
                  <Text style={s.linkSmall}>Resend OTP</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── STEP 3: Details ── */}
            {step === 3 && (
              <>
                <Text style={s.stepTitle}>Complete your profile</Text>
                <Text style={s.stepSub}>Almost there — just a few more details.</Text>

                {[
                  { k: 'firstName',    label: 'First Name',          icon: 'person-outline',   placeholder: 'e.g. Raj',       required: true },
                  { k: 'middleName',   label: 'Middle Name',         icon: 'person-outline',   placeholder: 'Optional' },
                  { k: 'lastName',     label: 'Last Name',           icon: 'person-outline',   placeholder: 'e.g. Sharma',    required: true },
                  { k: 'phone',        label: 'Phone Number',        icon: 'call-outline',     placeholder: '+91 98xxxxxxxx', required: true, kb: 'phone-pad' },
                  ...(isManager ? [{ k: 'businessName', label: 'Business / Org Name', icon: 'business-outline', placeholder: 'e.g. Jai Shyam Travels', required: true }] : []),
                  { k: 'password',     label: 'Set Password',        icon: 'lock-closed-outline', placeholder: '6+ characters', secure: true, required: true },
                ].map((f) => (
                  <View key={f.k} style={ss.field}>
                    <Text style={ss.label}>{f.label}{f.required && <Text style={{ color: colors.primary }}> *</Text>}</Text>
                    <View style={ss.inputWrap}>
                      <Ionicons name={f.icon} size={18} color={colors.textSecondary} />
                      <TextInput
                        testID={`reg-${f.k}-input`}
                        style={ss.input}
                        placeholder={f.placeholder}
                        placeholderTextColor={colors.textDisabled}
                        secureTextEntry={!!f.secure}
                        autoCapitalize={f.k === 'phone' || f.k === 'password' ? 'none' : 'words'}
                        keyboardType={f.kb || 'default'}
                        value={form[f.k]}
                        onChangeText={(v) => set(f.k, v)}
                      />
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={[s.cta, isManager && s.ctaManager]}
                  onPress={onCreateAccount}
                  disabled={loading}
                  testID="register-submit-btn"
                >
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={s.ctaText}>{isManager ? 'Register as Manager' : 'Create Account'}</Text>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            <View style={s.loginRow}>
              <Text style={s.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/auth/login')} testID="goto-login">
                <Text style={s.linkSmall}>Login here</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>{/* /formCard */}
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  // ── Hero ──────────────────────────────────────────────────────────────────
  hero:         { paddingTop: 28, paddingBottom: 56, paddingHorizontal: 28, alignItems: 'center', overflow: 'hidden', minHeight: 220 },
  decCircle:    { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)' },
  back:         { position: 'absolute', top: 20, left: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  logoBox:      { width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  appLabel:     { color: colors.primary, fontFamily: fonts.accent, fontSize: 10, letterSpacing: 5, marginBottom: 8 },
  title:        { color: '#fff', fontFamily: fonts.heading, fontSize: 28, textAlign: 'center' },
  sub:          { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.body, fontSize: 13, marginTop: 6, textAlign: 'center' },

  // ── Type selector ─────────────────────────────────────────────────────────
  typeCard__container: { backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40, flex: 1, gap: 14 },
  typeCard:     { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 18, borderWidth: 1.5, borderColor: colors.borderSubtle, ...shadow.soft },
  typeIcon:     { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  typeTitle:    { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary, marginBottom: 4 },
  typeSub:      { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  typeChevron:  { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },

  // ── Form card ─────────────────────────────────────────────────────────────
  formCard:     { backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28, flex: 1, paddingBottom: 40 },

  // ── Badge row ─────────────────────────────────────────────────────────────
  badgeRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, marginTop: 24, marginBottom: 0 },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  badgeManager: { backgroundColor: '#FFF7ED', borderColor: '#FDE68A' },
  badgeText:    { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary },
  changeType:   { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },

  // ── Step content ──────────────────────────────────────────────────────────
  stepTitle:    { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textPrimary, marginTop: 4, marginBottom: 4 },
  stepSub:      { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginBottom: 4 },

  // ── OTP boxes ─────────────────────────────────────────────────────────────
  otpRow:       { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 20 },
  otpBox:       { width: 46, height: 58, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.borderSubtle, backgroundColor: colors.surface, textAlign: 'center', fontSize: 24, fontFamily: fonts.bodyBold, color: colors.textPrimary },
  otpBoxFilled: { borderColor: colors.primary, backgroundColor: colors.primaryLight },

  // ── CTA ───────────────────────────────────────────────────────────────────
  cta:          { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, height: 58, borderRadius: radius.pill, ...shadow.card },
  ctaManager:   { backgroundColor: '#D97706' },
  ctaText:      { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15, letterSpacing: 0.3 },

  // ── Footer ────────────────────────────────────────────────────────────────
  loginRow:     { flexDirection: 'row', justifyContent: 'center', marginTop: 20, alignItems: 'center' },
  loginText:    { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  linkSmall:    { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
});

const ss = StyleSheet.create({
  field:    { marginTop: 14 },
  label:    { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary, marginBottom: 8 },
  inputWrap:{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 56, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.borderSubtle },
  input:    { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary, height: 56 },
});
