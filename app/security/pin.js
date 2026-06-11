import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pinStorage } from '../../lib/security/secureStorage';
import { securityApi } from '../../lib/api';
import { useAppLock } from '../../lib/security/appLockContext';
import { colors, fonts, radius, shadow } from '../../lib/theme';

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

function PinDots({ length, filled, error }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length }).map((_, i) => (
        <View key={i} style={[styles.dot, i < filled && styles.dotFilled, error && styles.dotError]} />
      ))}
    </View>
  );
}

function PinPad({ onKey }) {
  return (
    <View style={styles.keypad}>
      {KEYS.map((key, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.key, key === '' && styles.keyEmpty]}
          onPress={() => key !== '' && onKey(key)}
          activeOpacity={0.7}
          disabled={key === ''}
        >
          {key === '⌫'
            ? <Ionicons name="backspace-outline" size={22} color={colors.textPrimary} />
            : <Text style={styles.keyText}>{key}</Text>
          }
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function PinScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loadSettings } = useAppLock();

  const [hasPin,        setHasPin]        = useState(false);
  const [localPinHash,  setLocalPinHash]  = useState(false);
  const [pinLen,        setPinLen]        = useState(6);
  const [step,          setStep]          = useState('menu');
  const [pin,           setPin]           = useState('');
  const [firstPin,      setFirstPin]      = useState('');
  const [error,         setError]         = useState('');
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      pinStorage.hasPin(),
      securityApi.getSettings().catch(() => null),
    ]).then(([local, settings]) => {
      setLocalPinHash(local);
      // Backend is source of truth for enabled state; local hash is for verification
      setHasPin(settings?.pinEnabled ?? local);
      setLoading(false);
    });
  }, []);

  const handleKey = useCallback(async (key) => {
    if (key === '⌫') { setPin(p => p.slice(0, -1)); return; }
    const next = pin + key;
    setPin(next);
    if (next.length < pinLen) return;

    // Full PIN entered
    setPin('');

    if (step === 'enter_new') {
      setFirstPin(next);
      setStep('confirm_new');
      setError('');
      return;
    }

    if (step === 'confirm_new') {
      if (next !== firstPin) {
        setError('PINs do not match. Try again.');
        setFirstPin('');
        setStep('enter_new');
        Vibration.vibrate(300);
        return;
      }
      try {
        await pinStorage.savePin(next);
        await securityApi.enablePin();
        setHasPin(true);
        setLocalPinHash(true);
        loadSettings();
        setStep('menu');
        setError('');
        Alert.alert('PIN Set', 'Your app lock PIN has been saved. The app will lock when you leave and return.');
      } catch (e) {
        setError('Failed to save PIN.');
      }
      return;
    }

    if (step === 'enter_current') {
      const result = await pinStorage.verifyPin(next);
      if (!result.valid) {
        if (result.reason === 'no_pin') {
          setError('PIN data not found on this device. Use "Remove PIN" instead.');
        } else {
          setError('Wrong PIN.');
          Vibration.vibrate(300);
        }
        return;
      }
      try {
        await pinStorage.clearPin();
        await securityApi.disablePin();
        setHasPin(false);
        setLocalPinHash(false);
        loadSettings();
        setStep('menu');
        setError('');
        Alert.alert('PIN Removed', 'App lock PIN has been disabled.');
      } catch (e) {
        setError('Failed to remove PIN.');
      }
    }
  }, [pin, pinLen, step, firstPin, loadSettings]);

  const STEP_LABEL = {
    enter_new:     `Choose a ${pinLen}-digit PIN`,
    confirm_new:   `Confirm your ${pinLen}-digit PIN`,
    enter_current: 'Enter your current PIN to disable',
  };

  if (step !== 'menu') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F0A1E' }}>
        <LinearGradient colors={['#0F0A1E', '#1A0F2E', '#0F0A1E']} style={StyleSheet.absoluteFill} />
        <View style={[styles.pinHeader, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => { setStep('menu'); setPin(''); setError(''); }}>
            <Text style={styles.cancelPinText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.pinHeaderTitle}>{STEP_LABEL[step]}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.pinCenter}>
          <Ionicons name="keypad" size={32} color="rgba(255,255,255,0.6)" style={{ marginBottom: 24 }} />
          <PinDots length={pinLen} filled={pin.length} error={!!error} />
          {!!error && <Text style={styles.pinError}>{error}</Text>}
          {!error && step === 'confirm_new' && <Text style={styles.pinHint}>Re-enter to confirm</Text>}
        </View>
        <View style={{ paddingBottom: insets.bottom + 24 }}>
          <PinPad onKey={handleKey} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={['#1E0A0A', '#5C1615']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={styles.heroIcon}>
          <Ionicons name="keypad" size={32} color={colors.primary} />
        </View>
        <Text style={styles.heroTitle}>App Lock PIN</Text>
        <Text style={styles.heroSub}>Lock the app with a {pinLen}-digit PIN</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        {/* PIN length selector */}
        <View style={[styles.card, shadow.soft, { flexDirection: 'column', alignItems: 'stretch' }]}>
          <Text style={styles.cardLabel}>PIN Length</Text>
          <View style={styles.pinLenRow}>
            {[4, 6].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.lenBtn, pinLen === n && styles.lenBtnActive]}
                onPress={() => setPinLen(n)}
              >
                <Text style={[styles.lenBtnText, pinLen === n && styles.lenBtnTextActive]}>{n} digits</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Status */}
        <View style={[styles.card, shadow.card, { borderLeftWidth: 3, borderLeftColor: hasPin ? colors.success : colors.error }]}>
          <Ionicons name={hasPin ? 'lock-closed' : 'lock-open'} size={20} color={hasPin ? colors.success : colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>PIN Lock {hasPin ? 'Enabled' : 'Disabled'}</Text>
            <Text style={styles.cardSub}>{hasPin ? 'App locks automatically when you leave.' : 'No PIN set. Your app is not locked.'}</Text>
          </View>
        </View>

        {/* Action button */}
        {hasPin ? (
          <>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primaryLight }]} onPress={() => { setPin(''); setStep('enter_new'); }}>
              <Ionicons name="refresh" size={18} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Change PIN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
              onPress={() => {
                if (!localPinHash) {
                  Alert.alert(
                    'Remove PIN',
                    'PIN data is not stored on this device. Remove the PIN anyway?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await securityApi.disablePin();
                            setHasPin(false);
                            loadSettings();
                            Alert.alert('PIN Removed', 'App lock PIN has been disabled.');
                          } catch {
                            Alert.alert('Error', 'Could not remove PIN.');
                          }
                        },
                      },
                    ],
                  );
                } else {
                  setPin(''); setStep('enter_current');
                }
              }}
            >
              <Ionicons name="trash" size={18} color={colors.error} />
              <Text style={[styles.actionBtnText, { color: colors.error }]}>Remove PIN</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => { setPin(''); setStep('enter_new'); }}>
            <Ionicons name="keypad" size={18} color="white" />
            <Text style={[styles.actionBtnText, { color: 'white' }]}>Set Up PIN</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.note}>Your PIN is stored securely on this device only and is never sent to our servers.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 28 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontFamily: fonts.heading, fontSize: 24, color: 'white' },
  heroSub:   { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 },

  card:      { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  cardTitle: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textPrimary },
  cardSub:   { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  pinLenRow:       { flexDirection: 'row', gap: 8 },
  lenBtn:          { flex: 1, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.borderSubtle, paddingVertical: 8, alignItems: 'center' },
  lenBtnActive:    { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  lenBtnText:      { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  lenBtnTextActive:{ color: colors.primary },

  actionBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 14 },
  actionBtnText: { fontFamily: fonts.bodyBold, fontSize: 15 },

  note: { fontFamily: fonts.body, fontSize: 12, color: colors.textDisabled, textAlign: 'center', lineHeight: 18 },

  // PIN entry overlay
  cancelPinText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: 'rgba(255,255,255,0.75)' },

  pinHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  pinHeaderTitle: { fontFamily: fonts.bodyMedium, fontSize: 15, color: 'white' },
  pinCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  dotsRow:   { flexDirection: 'row', gap: 14 },
  dot:       { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: 'white', borderColor: 'white' },
  dotError:  { borderColor: '#FF6B6B' },
  pinError:  { fontFamily: fonts.body, fontSize: 13, color: '#FF6B6B' },
  pinHint:   { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  keypad:    { flexDirection: 'row', flexWrap: 'wrap', width: 264, gap: 12, justifyContent: 'center', alignSelf: 'center', marginBottom: 8 },
  key:       { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  keyEmpty:  { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyText:   { fontFamily: fonts.body, fontSize: 24, color: 'white', fontWeight: '300' },
});
