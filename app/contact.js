import { useState } from 'react';
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
import { contacts as contactsApi } from '../lib/api';

const CATEGORIES = [
  { id: 'general', label: 'General', icon: 'chatbubble-outline' },
  { id: 'booking', label: 'Booking Help', icon: 'ticket-outline' },
  { id: 'complaint', label: 'Complaint', icon: 'warning-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export default function Contact() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', phone: '', email: '', subject: '', message: '', category: 'general',
  });
  const [loading, setLoading] = useState(false);
  const { toast, showToast, hideToast } = useToast();

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.head}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} testID="contact-back">
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={s.title}>Contact Us</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.grayBand} />

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 24 }} showsVerticalScrollIndicator={false}>
          {/* Info card */}
          <View style={s.infoCard}>
            <InfoRow icon="location" text="C-22, Pandav Nagar, New Delhi - 110092" />
            <InfoRow icon="call" text="+91 9958985187" />
            <InfoRow icon="mail" text="info.ssppandavnagar@gmail.com" />
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
                <Ionicons name={f.icon} size={18} color="#6B7280" />
                <TextInput
                  testID={`contact-${f.k}`}
                  style={s.input}
                  placeholder={f.label.replace(' *', '')}
                  placeholderTextColor="#9CA3AF"
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
              placeholderTextColor="#9CA3AF"
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

function InfoRow({ icon, text }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <Ionicons name={icon} size={18} color="#D95D39" />
      </View>
      <Text style={s.infoText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F4',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.heading,
    fontSize: 20,
    color: '#111827',
  },
  grayBand: { height: 10, backgroundColor: '#F2F2F2' },

  infoCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
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
  infoText: { fontFamily: fonts.body, fontSize: 13, color: '#111827', flex: 1 },

  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: '#9CA3AF',
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
    backgroundColor: '#F2F0ED',
  },
  catChipActive: { backgroundColor: '#D95D39' },
  catText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: '#111827' },

  field: { marginBottom: 16 },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: '#9CA3AF',
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
    backgroundColor: '#F2F0ED',
    borderRadius: 12,
  },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: '#111827', height: 54 },
  textarea: {
    backgroundColor: '#F2F0ED',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#111827',
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
