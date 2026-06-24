import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import Toast from '../components/Toast';
import { useToast } from '../lib/hooks/useToast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { fonts } from '../lib/theme';
import { useColors } from '../lib/ThemeContext';
import { contacts as contactsApi } from '../lib/api';

const CATEGORIES = [
  { id: 'general', label: 'General', icon: 'chatbubble-outline' },
  { id: 'booking', label: 'Booking Help', icon: 'ticket-outline' },
  { id: 'complaint', label: 'Complaint', icon: 'warning-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export default function Contact() {
  const router = useRouter();
  const colors = useColors();
  const [form, setForm] = useState({
    name: '', phone: '', email: '', subject: '', message: '', category: 'general',
  });
  const [loading, setLoading] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const s = useMemo(() => makeStyles(colors), [colors]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.phone || !form.subject || !form.message) {
      showToast('Please fill in name, phone, subject and message.');
      return;
    }
    setLoading(true);
    try {
      await contactsApi.submit(form);
      showToast('Your message has been received. We will get back to you soon.', 'success');
      setTimeout(() => router.back(), 1800);
    } catch (e) {
      showToast(e.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.head}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} testID="contact-back">
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.title}>Contact Us</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.grayBand} />

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 24 }} showsVerticalScrollIndicator={false}>
          {/* Info card */}
          <View style={s.infoCard}>
            <InfoRow icon="location" text="C-22, Pandav Nagar, New Delhi - 110092" s={s} />
            <InfoRow icon="call" text="+91 9958985187" s={s} />
            <InfoRow icon="mail" text="info.ssppandavnagar@gmail.com" s={s} />
          </View>

          {/* Category */}
          <Text style={s.sectionLabel}>CATEGORY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.catChip, form.category === c.id && s.catChipActive]}
                  onPress={() => set('category', c.id)}
                  testID={`cat-${c.id}`}
                >
                  <Ionicons name={c.icon} size={14} color={form.category === c.id ? '#fff' : '#D95D39'} />
                  <Text style={[s.catText, form.category === c.id && { color: '#fff' }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Form fields */}
          {[
            { k: 'name', label: 'Full Name *', icon: 'person-outline' },
            { k: 'phone', label: 'Phone *', icon: 'call-outline', kb: 'phone-pad' },
            { k: 'email', label: 'Email (optional)', icon: 'mail-outline', kb: 'email-address' },
            { k: 'subject', label: 'Subject *', icon: 'document-text-outline' },
          ].map((f) => (
            <View key={f.k} style={s.field}>
              <Text style={s.fieldLabel}>{f.label}</Text>
              <View style={s.inputWrap}>
                <Ionicons name={f.icon} size={18} color={colors.textSecondary} />
                <TextInput
                  testID={`contact-${f.k}`}
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
            <Text style={s.fieldLabel}>Message *</Text>
            <TextInput
              testID="contact-message"
              style={s.textarea}
              placeholder="Write your message here..."
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={form.message}
              onChangeText={(v) => set('message', v)}
            />
          </View>

          <TouchableOpacity style={s.cta} onPress={submit} disabled={loading} testID="contact-submit">
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="send" size={16} color="#fff" />
                <Text style={s.ctaText}>Send Message</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

function InfoRow({ icon, text, s }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <Ionicons name={icon} size={18} color="#D95D39" />
      </View>
      <Text style={s.infoText}>{text}</Text>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.textPrimary,
  },
  grayBand: { height: 10, backgroundColor: colors.elevated },

  infoCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 18,
    marginBottom: 24,
    gap: 14,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE8E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { fontFamily: fonts.body, fontSize: 13, color: colors.textPrimary, flex: 1 },

  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textDisabled,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    backgroundColor: colors.elevated,
  },
  catChipActive: { backgroundColor: '#D95D39' },
  catText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textPrimary },

  field: { marginBottom: 16 },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textDisabled,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 54,
    backgroundColor: colors.elevated,
    borderRadius: 12,
  },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, height: 54 },
  textarea: {
    backgroundColor: colors.elevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 120,
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#D95D39',
    marginTop: 8,
  },
  ctaText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15 },
});
