import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, TextInput, Image, Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { securityApi } from '../../lib/api';
import { fonts, radius, shadow } from '../../lib/theme';
import { useColors } from '../../lib/ThemeContext';
import Toast from '../../components/Toast';
import { useToast } from '../../lib/hooks/useToast';

export default function MFAScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [mfaEnabled,  setMfaEnabled]  = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [step,        setStep]        = useState('status');
  const [setupData,   setSetupData]   = useState(null);   // { secret, qrCode, otpauthUrl }
  const [otp,         setOtp]         = useState('');
  const [disableOtp,  setDisableOtp]  = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    securityApi.getSettings()
      .then(st => { setMfaEnabled(st.mfaEnabled); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const startSetup = useCallback(async () => {
    setSaving(true);
    try {
      const data = await securityApi.setupMFA();
      setSetupData(data);
      setStep('setup');
    } catch (e) {
      showToast(e.message, 'error');
    }
    setSaving(false);
  }, [showToast]);

  const submitOtp = useCallback(async () => {
    if (otp.length < 6) return;
    setSaving(true);
    try {
      const res = await securityApi.verifyAndEnableMFA(otp);
      setBackupCodes(res.backupCodes || []);
      setMfaEnabled(true);
      setStep('backup');
    } catch (e) {
      showToast(e.message || 'Invalid code', 'error');
    }
    setSaving(false);
    setOtp('');
  }, [otp, showToast]);

  const submitDisableOtp = useCallback(async () => {
    if (disableOtp.length < 6) return;
    setSaving(true);
    try {
      await securityApi.disableMFA(disableOtp);
      setMfaEnabled(false);
      setStep('status');
    } catch (e) {
      showToast(e.message || 'Invalid code', 'error');
    }
    setSaving(false);
    setDisableOtp('');
  }, [disableOtp, showToast]);

  // ── Backup codes view
  if (step === 'backup') {
    return (
      <View style={s.container}>
        <View style={[s.header, { paddingTop: insets.top }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => setStep('status')}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.headerTitle}>MFA Enabled!</Text>
            <Text style={s.headerSub}>Save your backup codes</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
          <View style={[s.card, shadow.card, { flexDirection: 'column', gap: 4 }]}>
            <Text style={s.cardTitle}>Backup Codes</Text>
            <Text style={s.cardSub}>Save these codes safely. Each can be used once if you lose access to your authenticator.</Text>
            <View style={s.codesGrid}>
              {backupCodes.map((code, i) => (
                <TouchableOpacity key={i} style={s.codeChip} onPress={() => { Clipboard.setString(code); }}>
                  <Text style={s.codeText}>{code}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity style={s.primaryBtn} onPress={() => { setStep('status'); }}>
            <Text style={s.primaryBtnText}>I've saved my backup codes</Text>
          </TouchableOpacity>
        </ScrollView>
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      </View>
    );
  }

  // ── Enter OTP to verify setup
  if (step === 'verify') {
    return (
      <View style={s.container}>
        <View style={[s.header, { paddingTop: insets.top }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => setStep('setup')}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.headerTitle}>Enter OTP</Text>
            <Text style={s.headerSub}>6-digit code from authenticator app</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 16 }}>
          <TextInput
            style={s.otpInput}
            value={otp}
            onChangeText={v => setOtp(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="numeric"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={colors.textDisabled}
            textAlign="center"
            autoFocus
          />
          <TouchableOpacity
            style={[s.primaryBtn, (otp.length < 6 || saving) && s.btnDisabled]}
            onPress={submitOtp}
            disabled={otp.length < 6 || saving}
          >
            <Text style={s.primaryBtnText}>{saving ? 'Verifying…' : 'Verify & Enable'}</Text>
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      </View>
    );
  }

  // ── QR code setup
  if (step === 'setup') {
    return (
      <View style={s.container}>
        <View style={[s.header, { paddingTop: insets.top }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => setStep('status')}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.headerTitle}>Scan QR Code</Text>
            <Text style={s.headerSub}>Use Google Authenticator or similar</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
          {setupData?.qrCode && (
            <View style={[s.card, { justifyContent: 'center', alignItems: 'center', paddingVertical: 24 }]}>
              <Image source={{ uri: setupData.qrCode }} style={{ width: 200, height: 200 }} resizeMode="contain" />
            </View>
          )}
          {setupData?.manualEntry && (
            <TouchableOpacity style={[s.card, shadow.soft]} onPress={() => { Clipboard.setString(setupData.manualEntry); showToast('Secret key copied to clipboard', 'success'); }}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardSub}>Manual entry key (tap to copy)</Text>
                <Text style={[s.cardTitle, { fontFamily: fonts.accent, letterSpacing: 2, fontSize: 13 }]}>{setupData.manualEntry}</Text>
              </View>
              <Ionicons name="copy" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <View style={[s.card, shadow.soft, { flexDirection: 'column' }]}>
            <Text style={s.cardTitle}>How to set up</Text>
            {['Install an authenticator app (Google Authenticator, Authy, etc.)', 'Tap "+" to add a new account', 'Scan the QR code above or enter the key manually', 'Enter the 6-digit code shown in the app to verify'].map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
                <Text style={[s.cardSub, { flex: 1 }]}>{item}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={s.primaryBtn} onPress={() => setStep('verify')}>
            <Text style={s.primaryBtnText}>I've scanned the code →</Text>
          </TouchableOpacity>
        </ScrollView>
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      </View>
    );
  }

  // ── Disable MFA
  if (step === 'disable') {
    return (
      <View style={s.container}>
        <View style={[s.header, { paddingTop: insets.top }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => setStep('status')}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.headerTitle}>Disable MFA</Text>
            <Text style={s.headerSub}>Enter your current OTP to confirm</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 16 }}>
          <TextInput
            style={s.otpInput}
            value={disableOtp}
            onChangeText={v => setDisableOtp(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="numeric"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={colors.textDisabled}
            textAlign="center"
            autoFocus
          />
          <TouchableOpacity
            style={[s.dangerBtn, (disableOtp.length < 6 || saving) && s.btnDisabled]}
            onPress={submitDisableOtp}
            disabled={disableOtp.length < 6 || saving}
          >
            <Text style={s.primaryBtnText}>{saving ? 'Disabling…' : 'Disable MFA'}</Text>
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      </View>
    );
  }

  // ── Status / main view
  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.headerTitle}>Two-Factor Auth</Text>
          <Text style={s.headerSub}>Extra protection for your account</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <View style={[s.card, shadow.card, { borderLeftWidth: 3, borderLeftColor: mfaEnabled ? '#16A34A' : colors.warning }]}>
          <Ionicons name={mfaEnabled ? 'shield-checkmark' : 'shield-outline'} size={24} color={mfaEnabled ? '#16A34A' : colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>MFA is {mfaEnabled ? 'Active' : 'Inactive'}</Text>
            <Text style={s.cardSub}>{mfaEnabled ? 'Your account requires a code from your authenticator app on new logins.' : 'Enable two-factor authentication to greatly improve your account security.'}</Text>
          </View>
        </View>

        {mfaEnabled ? (
          <>
            <TouchableOpacity style={[s.card, shadow.soft]} onPress={async () => {
              const res = await securityApi.getBackupCodes().catch(() => null);
              if (res?.backupCodes) setBackupCodes(res.backupCodes.map(b => b.code));
              showToast('Backup codes generated - save them securely!', 'success');
            }}>
              <Ionicons name="key" size={20} color={colors.primary} />
              <Text style={[s.cardTitle, { flex: 1 }]}>View Backup Codes</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.dangerBtn]} onPress={() => setStep('disable')}>
              <Text style={s.primaryBtnText}>Disable Two-Factor Auth</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[s.primaryBtn, saving && s.btnDisabled]} onPress={startSetup} disabled={saving}>
            <Ionicons name="shield-checkmark" size={18} color="white" />
            <Text style={s.primaryBtnText}>{saving ? 'Setting up…' : 'Enable Two-Factor Auth'}</Text>
          </TouchableOpacity>
        )}

        {[
          { icon: 'phone-portrait', t: 'Authenticator App', s: 'Use any TOTP app — Google Authenticator, Authy, 1Password, etc.' },
          { icon: 'key',            t: 'Backup Codes',      s: '8 single-use codes to access your account if you lose your phone.' },
          { icon: 'shield',         t: 'Phishing Resistant',s: 'TOTP codes are time-based and expire every 30 seconds.' },
        ].map((item, i) => (
          <View key={i} style={[s.tipRow, shadow.soft]}>
            <View style={s.tipIcon}><Ionicons name={item.icon} size={18} color={colors.primary} /></View>
            <View style={{ flex: 1 }}><Text style={s.cardTitle}>{item.t}</Text><Text style={s.cardSub}>{item.s}</Text></View>
          </View>
        ))}
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Philosopher_700Bold', fontSize: 18, color: colors.textPrimary },
  headerSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 1 },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.borderSubtle },
  cardTitle: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textPrimary },
  cardSub:   { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  codesGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  codeChip:    { backgroundColor: colors.elevated, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8 },
  codeText:    { fontFamily: fonts.accent, fontSize: 13, color: colors.textPrimary, letterSpacing: 1.5 },

  otpInput:    { backgroundColor: colors.elevated, borderRadius: radius.lg, fontSize: 28, fontFamily: fonts.bodyBold, letterSpacing: 8, paddingVertical: 20, borderWidth: 1.5, borderColor: colors.borderSubtle, color: colors.textPrimary },

  primaryBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 14 },
  dangerBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.error, borderRadius: radius.lg, paddingVertical: 14 },
  primaryBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: 'white' },
  btnDisabled: { opacity: 0.5 },

  tipRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12 },
  tipIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },

  stepNum:    { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  stepNumText:{ fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primary },
});
