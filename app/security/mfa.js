import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Image, Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { securityApi } from '../../lib/api';
import { colors, fonts, radius, shadow } from '../../lib/theme';
import Toast from '../../components/Toast';
import { useToast } from '../../lib/hooks/useToast';

export default function MFAScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();

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
      .then(s => { setMfaEnabled(s.mfaEnabled); setLoading(false); })
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
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <LinearGradient colors={['#14381A', '#16A34A']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <View style={styles.heroIcon}><Ionicons name="checkmark-circle" size={36} color="white" /></View>
          <Text style={styles.heroTitle}>MFA Enabled!</Text>
          <Text style={styles.heroSub}>Save your backup codes before continuing</Text>
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
          <View style={[styles.card, shadow.card, { flexDirection: 'column', gap: 4 }]}>
            <Text style={styles.cardTitle}>Backup Codes</Text>
            <Text style={styles.cardSub}>Save these codes safely. Each can be used once if you lose access to your authenticator.</Text>
            <View style={styles.codesGrid}>
              {backupCodes.map((code, i) => (
                <TouchableOpacity key={i} style={styles.codeChip} onPress={() => { Clipboard.setString(code); }}>
                  <Text style={styles.codeText}>{code}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => { setStep('status'); }}>
            <Text style={styles.primaryBtnText}>I've saved my backup codes</Text>
          </TouchableOpacity>
        </ScrollView>
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      </View>
    );
  }

  // ── Enter OTP to verify setup
  if (step === 'verify') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <LinearGradient colors={['#1E0A0A', '#5C1615']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.back} onPress={() => setStep('setup')}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Enter OTP</Text>
          <Text style={styles.heroSub}>Enter the 6-digit code from your authenticator app</Text>
        </LinearGradient>
        <View style={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 16 }}>
          <TextInput
            style={styles.otpInput}
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
            style={[styles.primaryBtn, (otp.length < 6 || saving) && styles.btnDisabled]}
            onPress={submitOtp}
            disabled={otp.length < 6 || saving}
          >
            <Text style={styles.primaryBtnText}>{saving ? 'Verifying…' : 'Verify & Enable'}</Text>
          </TouchableOpacity>
        </View>
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      </View>
    );
  }

  // ── QR code setup
  if (step === 'setup') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <LinearGradient colors={['#1E0A0A', '#5C1615']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.back} onPress={() => setStep('status')}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Scan QR Code</Text>
          <Text style={styles.heroSub}>Use Google Authenticator, Authy, or similar</Text>
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
          {setupData?.qrCode && (
            <View style={[styles.card, { justifyContent: 'center', alignItems: 'center', paddingVertical: 24 }]}>
              <Image source={{ uri: setupData.qrCode }} style={{ width: 200, height: 200 }} resizeMode="contain" />
            </View>
          )}
          {setupData?.manualEntry && (
            <TouchableOpacity style={[styles.card, shadow.soft]} onPress={() => { Clipboard.setString(setupData.manualEntry); showToast('Secret key copied to clipboard', 'success'); }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardSub}>Manual entry key (tap to copy)</Text>
                <Text style={[styles.cardTitle, { fontFamily: fonts.accent, letterSpacing: 2, fontSize: 13 }]}>{setupData.manualEntry}</Text>
              </View>
              <Ionicons name="copy" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <View style={[styles.card, shadow.soft, { flexDirection: 'column' }]}>
            <Text style={styles.cardTitle}>How to set up</Text>
            {['Install an authenticator app (Google Authenticator, Authy, etc.)', 'Tap "+" to add a new account', 'Scan the QR code above or enter the key manually', 'Enter the 6-digit code shown in the app to verify'].map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                <Text style={[styles.cardSub, { flex: 1 }]}>{s}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('verify')}>
            <Text style={styles.primaryBtnText}>I've scanned the code →</Text>
          </TouchableOpacity>
        </ScrollView>
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      </View>
    );
  }

  // ── Disable MFA
  if (step === 'disable') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <LinearGradient colors={['#1E0A0A', '#5C1615']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.back} onPress={() => setStep('status')}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Disable MFA</Text>
          <Text style={styles.heroSub}>Enter your current OTP to confirm</Text>
        </LinearGradient>
        <View style={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 16 }}>
          <TextInput
            style={styles.otpInput}
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
            style={[styles.dangerBtn, (disableOtp.length < 6 || saving) && styles.btnDisabled]}
            onPress={submitDisableOtp}
            disabled={disableOtp.length < 6 || saving}
          >
            <Text style={styles.primaryBtnText}>{saving ? 'Disabling…' : 'Disable MFA'}</Text>
          </TouchableOpacity>
        </View>
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      </View>
    );
  }

  // ── Status / main view
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={['#1E0A0A', '#5C1615']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={styles.heroIcon}><Ionicons name="shield-checkmark" size={32} color={colors.primary} /></View>
        <Text style={styles.heroTitle}>Two-Factor Auth</Text>
        <Text style={styles.heroSub}>Extra protection for your account</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <View style={[styles.card, shadow.card, { borderLeftWidth: 3, borderLeftColor: mfaEnabled ? '#16A34A' : colors.warning }]}>
          <Ionicons name={mfaEnabled ? 'shield-checkmark' : 'shield-outline'} size={24} color={mfaEnabled ? '#16A34A' : colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>MFA is {mfaEnabled ? 'Active' : 'Inactive'}</Text>
            <Text style={styles.cardSub}>{mfaEnabled ? 'Your account requires a code from your authenticator app on new logins.' : 'Enable two-factor authentication to greatly improve your account security.'}</Text>
          </View>
        </View>

        {mfaEnabled ? (
          <>
            <TouchableOpacity style={[styles.card, shadow.soft]} onPress={async () => {
              const res = await securityApi.getBackupCodes().catch(() => null);
              if (res?.backupCodes) setBackupCodes(res.backupCodes.map(b => b.code));
              showToast('Backup codes generated - save them securely!', 'success');
            }}>
              <Ionicons name="key" size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { flex: 1 }]}>View Backup Codes</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dangerBtn]} onPress={() => setStep('disable')}>
              <Text style={styles.primaryBtnText}>Disable Two-Factor Auth</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.primaryBtn, saving && styles.btnDisabled]} onPress={startSetup} disabled={saving}>
            <Ionicons name="shield-checkmark" size={18} color="white" />
            <Text style={styles.primaryBtnText}>{saving ? 'Setting up…' : 'Enable Two-Factor Auth'}</Text>
          </TouchableOpacity>
        )}

        {[
          { icon: 'phone-portrait', t: 'Authenticator App', s: 'Use any TOTP app — Google Authenticator, Authy, 1Password, etc.' },
          { icon: 'key',            t: 'Backup Codes',      s: '8 single-use codes to access your account if you lose your phone.' },
          { icon: 'shield',         t: 'Phishing Resistant',s: 'TOTP codes are time-based and expire every 30 seconds.' },
        ].map((item, i) => (
          <View key={i} style={[styles.tipRow, shadow.soft]}>
            <View style={styles.tipIcon}><Ionicons name={item.icon} size={18} color={colors.primary} /></View>
            <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{item.t}</Text><Text style={styles.cardSub}>{item.s}</Text></View>
          </View>
        ))}
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 28 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontFamily: fonts.heading, fontSize: 24, color: 'white' },
  heroSub:   { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textPrimary },
  cardSub:   { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  codesGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  codeChip:    { backgroundColor: '#F3F4F6', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8 },
  codeText:    { fontFamily: fonts.accent, fontSize: 13, color: colors.textPrimary, letterSpacing: 1.5 },

  otpInput:    { backgroundColor: colors.surface, borderRadius: radius.lg, fontSize: 28, fontFamily: fonts.bodyBold, letterSpacing: 8, paddingVertical: 20, borderWidth: 1.5, borderColor: colors.borderSubtle, color: colors.textPrimary },

  primaryBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 14 },
  dangerBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.error, borderRadius: radius.lg, paddingVertical: 14 },
  primaryBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: 'white' },
  btnDisabled: { opacity: 0.5 },

  tipRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12 },
  tipIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },

  stepNum:    { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  stepNumText:{ fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primary },
});
