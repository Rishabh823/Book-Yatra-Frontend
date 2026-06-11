import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import Toast from '../components/Toast';
import { useToast } from '../lib/hooks/useToast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, fonts, radius, shadow } from '../lib/theme';
import { members as membersApi } from '../lib/api';
import { useLang } from '../lib/LanguageContext';

const BENEFITS = [
  { icon: 'bus', text: 'Priority seat booking on monthly yatras' },
  { icon: 'shield-checkmark', text: 'Member ID card for identity verification' },
  { icon: 'gift', text: 'Special discounts on seva and donations' },
  { icon: 'people', text: 'Access to exclusive community events' },
  { icon: 'medkit', text: 'Medical aid assistance eligibility' },
  { icon: 'heart', text: 'Marriage assistance support' },
];

export default function Membership() {
  const router = useRouter();
  const { t } = useLang();
  const [form, setForm] = useState({
    fullName: '', phone: '', email: '', address: '',
    occupation: '', reason: '', dateOfBirth: '',
  });
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.fullName || !form.phone) {
      showToast('Full name and phone number are required.');
      return;
    }
    setLoading(true);
    try {
      await membersApi.apply(form);
      setApplied(true);
    } catch (e) {
      showToast(e.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (applied) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }} edges={['top']}>
        <View style={s.successIcon}><Ionicons name="checkmark-circle" size={64} color={colors.success} /></View>
        <Text style={s.successTitle}>Application Submitted!</Text>
        <Text style={s.successSub}>{t.membershipSuccessSub}</Text>
        <TouchableOpacity style={s.cta} onPress={() => router.back()}>
          <Text style={s.ctaText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.head}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} testID="member-back">
            <Ionicons name="arrow-back" size={20} color={colors.secondary} />
          </TouchableOpacity>
          <Text style={s.title}>Join Parivar</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <LinearGradient colors={[colors.secondary, '#3D0D0C']} style={s.hero}>
            <Text style={s.heroOm}>ॐ</Text>
            <Text style={s.heroTitle}>Become a Member</Text>
            <Text style={s.heroSub}>{t.membershipHeroSub}</Text>
          </LinearGradient>

          {/* Benefits */}
          <Text style={s.sectionLabel}>· Member Benefits ·</Text>
          <View style={s.benefits}>
            {BENEFITS.map((b, i) => (
              <View key={i} style={s.benefitRow}>
                <View style={s.benefitIcon}><Ionicons name={b.icon} size={16} color={colors.primary} /></View>
                <Text style={s.benefitText}>{b.text}</Text>
              </View>
            ))}
          </View>

          {/* Form */}
          <Text style={[s.sectionLabel, { marginTop: 8 }]}>· Application Form ·</Text>
          {[
            { k: 'fullName', label: 'Full Name *', icon: 'person-outline' },
            { k: 'phone', label: 'Phone Number *', icon: 'call-outline', kb: 'phone-pad' },
            { k: 'email', label: 'Email (optional)', icon: 'mail-outline', kb: 'email-address' },
            { k: 'address', label: 'Address (optional)', icon: 'home-outline' },
            { k: 'occupation', label: 'Occupation (optional)', icon: 'briefcase-outline' },
            { k: 'dateOfBirth', label: 'Date of Birth (DD/MM/YYYY)', icon: 'calendar-outline' },
          ].map((f) => (
            <View key={f.k} style={s.field}>
              <Text style={s.fieldLabel}>{f.label}</Text>
              <View style={s.inputWrap}>
                <Ionicons name={f.icon} size={18} color={colors.textSecondary} />
                <TextInput
                  testID={`mem-${f.k}`}
                  style={s.input}
                  placeholder={f.label.replace(' *', '')}
                  placeholderTextColor={colors.textDisabled}
                  keyboardType={f.kb || 'default'}
                  value={form[f.k]}
                  onChangeText={(v) => set(f.k, v)}
                />
              </View>
            </View>
          ))}

          <View style={s.field}>
            <Text style={s.fieldLabel}>Why do you want to join?</Text>
            <TextInput
              testID="mem-reason"
              style={s.textarea}
              placeholder="Share your reason for joining the parivar..."
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={form.reason}
              onChangeText={(v) => set('reason', v)}
            />
          </View>

          <TouchableOpacity style={s.cta} onPress={submit} disabled={loading} testID="apply-btn">
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="people" size={16} color="#fff" />
                <Text style={s.ctaText}>Submit Application</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={s.note}>Applications are reviewed within 3–5 business days.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, ...shadow.soft },
  title: { fontFamily: fonts.heading, fontSize: 22, color: colors.secondary },

  hero: { borderRadius: radius.xxl, padding: 28, alignItems: 'center', marginBottom: 24 },
  heroOm: { fontSize: 40, color: '#FFE9C0', fontFamily: fonts.heading },
  heroTitle: { color: '#fff', fontFamily: fonts.heading, fontSize: 22, marginTop: 6 },
  heroSub: { color: '#FFE9C0', fontFamily: fonts.body, fontSize: 13, marginTop: 4 },

  sectionLabel: { fontFamily: fonts.accent, fontSize: 11, color: colors.textSecondary, letterSpacing: 3, marginBottom: 14 },
  benefits: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16, gap: 14, marginBottom: 24, ...shadow.soft },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  benefitText: { fontFamily: fonts.body, fontSize: 13, color: colors.textPrimary, flex: 1 },

  field: { marginBottom: 14 },
  fieldLabel: { fontFamily: fonts.accent, fontSize: 10, color: colors.textSecondary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 54, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSubtle },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, height: 54 },
  textarea: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSubtle, padding: 14, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, minHeight: 100 },

  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: radius.pill, backgroundColor: colors.primary, marginTop: 8, ...shadow.card },
  ctaText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15 },
  note: { textAlign: 'center', marginTop: 14, fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },

  successIcon: { marginBottom: 16 },
  successTitle: { fontFamily: fonts.heading, fontSize: 26, color: colors.secondary, marginBottom: 12, textAlign: 'center' },
  successSub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
});
