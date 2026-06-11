import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Linking, useWindowDimensions, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, fonts, radius, shadow } from '../lib/theme';

const STATS = [
  { value: '5000+', label: 'Devotees Served' },
  { value: '200+',  label: 'Yatras Completed' },
  { value: '50+',   label: 'Cities Covered' },
  { value: '12+',   label: 'Years of Seva' },
];

const FEATURES = [
  {
    icon: 'bus',
    color: '#D95D39',
    bg: '#FDECE7',
    title: 'Monthly Yatras',
    desc: 'Organized pilgrimages to Khatu Shyam Ji, Vrindavan, Mathura & other holy sites every month with AC & Non-AC buses.',
  },
  {
    icon: 'people',
    color: '#0284C7',
    bg: '#DBEAFE',
    title: 'Community Seva',
    desc: 'Medical aid, marriage assistance, food distribution, and warm hospitality for all devotees and pilgrims.',
  },
  {
    icon: 'musical-notes',
    color: '#7C3AED',
    bg: '#EDE9FE',
    title: 'Devotional Events',
    desc: 'Regular bhajan sandhya, kirtan programs, aarti ceremonies, and spiritual discourses for the community.',
  },
  {
    icon: 'heart',
    color: '#16A34A',
    bg: '#DCFCE7',
    title: 'Transparent Donations',
    desc: 'Fully transparent donation management system. Every rupee is accounted for and used for seva activities.',
  },
  {
    icon: 'phone-portrait',
    color: '#EA580C',
    bg: '#FFF7ED',
    title: 'Smart Booking',
    desc: 'Instant seat booking with real-time availability, digital tickets, and secure payments for all yatras.',
  },
  {
    icon: 'shield-checkmark',
    color: '#5C1615',
    bg: '#FEF2F2',
    title: 'Trusted & Safe',
    desc: 'All tours managed by verified operators. Your journey, safety, and comfort are our top priority.',
  },
];

const CONTACT = [
  {
    icon: 'location',
    label: 'Address',
    value: 'C-22, Pandav Nagar, New Delhi – 110092',
    onPress: null,
  },
  {
    icon: 'call',
    label: 'Phone',
    value: '+91 94167 63420',
    onPress: () => Linking.openURL('tel:+919416763420'),
  },
  {
    icon: 'mail',
    label: 'Email',
    value: 'cipherinfratech@gmail.com',
    onPress: () => Linking.openURL('mailto:cipherinfratech@gmail.com'),
  },
  {
    icon: 'logo-whatsapp',
    label: 'WhatsApp',
    value: '+91 94167 63420',
    onPress: () => Linking.openURL('https://wa.me/919416763420'),
  },
];

const TEAM = [
  { initial: 'SS', name: 'Seva Samiti', role: 'Spiritual Leadership', color: '#5C1615' },
  { initial: 'BY', name: 'Book Yatra', role: 'Technology & Operations', color: '#0284C7' },
  { initial: 'CI', name: 'Cipher Infratech', role: 'Development Partner', color: '#7C3AED' },
];

export default function About() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const colW = (width - 48 - 12) / 2;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>About Us</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <LinearGradient colors={['#1E0A0A', '#5C1615', '#8B2C2A']} style={s.hero}>
          <View style={s.omCircle}>
            <Text style={s.omText}>ॐ</Text>
          </View>
          <Text style={s.heroTitle}>Book Yatra</Text>
          <Text style={s.heroSubtitle}>Shyam Sawariya Parivar</Text>
          <Text style={s.heroBadge}>· PANDAV NAGAR, NEW DELHI ·</Text>
          <View style={s.heroTagRow}>
            {['Pilgrimage', 'Community', 'Seva', 'Devotion'].map((tag, i) => (
              <View key={i} style={s.heroTag}>
                <Text style={s.heroTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Stats strip */}
        <View style={s.statsStrip}>
          {STATS.map((stat, i) => (
            <View key={i} style={[s.statItem, i < STATS.length - 1 && s.statBorder]}>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Mission */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <View style={s.sectionLine} />
            <Text style={s.sectionLabel}>Our Mission</Text>
            <View style={s.sectionLine} />
          </View>
          <View style={s.missionCard}>
            <LinearGradient colors={['#FFF4EE', '#FDECE7']} style={s.missionGrad}>
              <Ionicons name="flame" size={28} color={colors.primary} style={{ marginBottom: 12 }} />
              <Text style={s.missionText}>
                To make sacred pilgrimages accessible to every devotee — providing safe, comfortable, and spiritually enriching yatras across India's holy sites, while building a vibrant community of like-minded bhakts united by faith in Khatu Shyam Ji.
              </Text>
              <Text style={s.missionMantra}>जय श्री श्याम 🙏</Text>
            </LinearGradient>
          </View>
        </View>

        {/* What We Do */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <View style={s.sectionLine} />
            <Text style={s.sectionLabel}>What We Do</Text>
            <View style={s.sectionLine} />
          </View>
          <View style={s.featureGrid}>
            {FEATURES.map((f, i) => (
              <View key={i} style={[s.featureCard, { width: colW }, shadow.soft]}>
                <View style={[s.featureIcon, { backgroundColor: f.bg }]}>
                  <Ionicons name={f.icon} size={22} color={f.color} />
                </View>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Our App */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <View style={s.sectionLine} />
            <Text style={s.sectionLabel}>The App</Text>
            <View style={s.sectionLine} />
          </View>
          <LinearGradient colors={['#0F0A0A', '#1E1410']} style={s.appCard}>
            <Text style={s.appCardTitle}>Book Yatra App</Text>
            <Text style={s.appCardSub}>A complete digital ecosystem for the Shyam Sawariya Parivar community</Text>
            <View style={s.appFeatures}>
              {[
                { icon: 'phone-portrait', text: 'Mobile App for devotees' },
                { icon: 'desktop',        text: 'Web portal for reference' },
                { icon: 'settings',       text: 'Admin panel for operators' },
                { icon: 'lock-closed',    text: 'Enterprise-grade security' },
              ].map((item, i) => (
                <View key={i} style={s.appFeatureRow}>
                  <View style={s.appFeatureDot}>
                    <Ionicons name={item.icon} size={14} color={colors.primary} />
                  </View>
                  <Text style={s.appFeatureText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* Team */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <View style={s.sectionLine} />
            <Text style={s.sectionLabel}>Our Team</Text>
            <View style={s.sectionLine} />
          </View>
          {TEAM.map((member, i) => (
            <View key={i} style={[s.teamCard, shadow.soft]}>
              <View style={[s.teamAvatar, { backgroundColor: member.color }]}>
                <Text style={s.teamInitial}>{member.initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.teamName}>{member.name}</Text>
                <Text style={s.teamRole}>{member.role}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            </View>
          ))}
        </View>

        {/* Contact */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <View style={s.sectionLine} />
            <Text style={s.sectionLabel}>Contact Us</Text>
            <View style={s.sectionLine} />
          </View>
          {CONTACT.map((c, i) => (
            <TouchableOpacity
              key={i}
              style={[s.contactCard, shadow.soft]}
              onPress={c.onPress}
              activeOpacity={c.onPress ? 0.7 : 1}
            >
              <View style={[s.contactIcon, { backgroundColor: c.onPress ? colors.primaryLight : '#F3F4F6' }]}>
                <Ionicons name={c.icon} size={18} color={c.onPress ? colors.primary : colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.contactLabel}>{c.label}</Text>
                <Text style={[s.contactValue, c.onPress && { color: colors.primary }]}>{c.value}</Text>
              </View>
              {c.onPress && <Ionicons name="open-outline" size={16} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerMantra}>जय श्री श्याम 🙏</Text>
          <Text style={s.footerCopy}>© 2024 Shyam Sawariya Parivar · Book Yatra</Text>
          <Text style={s.footerDev}>Powered by Cipher Infratech</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    ...shadow.soft,
  },
  headerTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.secondary },

  hero: {
    marginHorizontal: 16, borderRadius: radius.xxl,
    padding: 32, alignItems: 'center', overflow: 'hidden', marginBottom: 0,
  },
  omCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,233,192,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  omText:         { fontSize: 36, color: '#FFE9C0', fontFamily: fonts.heading },
  heroTitle:      { fontFamily: fonts.heading, fontSize: 28, color: 'white', letterSpacing: 0.5 },
  heroSubtitle:   { fontFamily: fonts.body, fontSize: 14, color: 'rgba(255,233,192,0.8)', marginTop: 4 },
  heroBadge:      { fontFamily: fonts.accent, fontSize: 9, letterSpacing: 3, color: 'rgba(255,233,192,0.5)', marginTop: 10 },
  heroTagRow:     { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' },
  heroTag:        { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  heroTagText:    { fontFamily: fonts.bodyMedium, fontSize: 12, color: 'rgba(255,255,255,0.85)' },

  statsStrip: {
    flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: 16,
    borderRadius: radius.xl, padding: 16, marginTop: 12, marginBottom: 8,
    ...shadow.card,
  },
  statItem:  { flex: 1, alignItems: 'center' },
  statBorder:{ borderRightWidth: 1, borderRightColor: colors.borderSubtle },
  statValue: { fontFamily: fonts.heading, fontSize: 18, color: colors.primary },
  statLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },

  section:     { paddingHorizontal: 16, paddingTop: 28 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionLine: { flex: 1, height: 1, backgroundColor: colors.borderSubtle },
  sectionLabel:{ fontFamily: fonts.accent, fontSize: 11, color: colors.textSecondary, letterSpacing: 2 },

  missionCard: { borderRadius: radius.xl, overflow: 'hidden', ...shadow.soft },
  missionGrad: { padding: 24, alignItems: 'center' },
  missionText: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, lineHeight: 24, textAlign: 'center' },
  missionMantra: { fontFamily: fonts.heading, fontSize: 18, color: colors.primary, marginTop: 16 },

  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16 },
  featureIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  featureTitle:{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary, marginBottom: 4 },
  featureDesc: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, lineHeight: 16 },

  appCard:     { borderRadius: radius.xl, padding: 24 },
  appCardTitle:{ fontFamily: fonts.heading, fontSize: 22, color: 'white', marginBottom: 8 },
  appCardSub:  { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 20, lineHeight: 20 },
  appFeatures: { gap: 12 },
  appFeatureRow:{ flexDirection: 'row', alignItems: 'center', gap: 12 },
  appFeatureDot:{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(217,93,57,0.15)', alignItems: 'center', justifyContent: 'center' },
  appFeatureText:{ fontFamily: fonts.bodyMedium, fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  teamCard:   { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 14, marginBottom: 10 },
  teamAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  teamInitial:{ fontFamily: fonts.bodyBold, fontSize: 15, color: 'white' },
  teamName:   { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  teamRole:   { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  contactCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 14, marginBottom: 10 },
  contactIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  contactLabel:{ fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled },
  contactValue:{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary, marginTop: 1 },

  footer:      { alignItems: 'center', paddingTop: 32, paddingBottom: 8, gap: 6 },
  footerMantra:{ fontFamily: fonts.heading, fontSize: 20, color: colors.secondary },
  footerCopy:  { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  footerDev:   { fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled },
});
