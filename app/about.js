import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fonts } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";

const STATS = [
  { value: "5000+", label: "Devotees Served" },
  { value: "200+", label: "Yatras Completed" },
  { value: "50+", label: "Cities Covered" },
  { value: "12+", label: "Years of Seva" },
];

const FEATURES = [
  {
    icon: "bus",
    color: "#D95D39",
    bg: "#FDECE7",
    title: "Monthly Yatras",
    desc: "Organized pilgrimages to Khatu Shyam Ji, Vrindavan, Mathura & other holy sites every month with AC & Non-AC buses.",
  },
  {
    icon: "people",
    color: "#0284C7",
    bg: "#DBEAFE",
    title: "Community Seva",
    desc: "Medical aid, marriage assistance, food distribution, and warm hospitality for all devotees and pilgrims.",
  },
  {
    icon: "musical-notes",
    color: "#7C3AED",
    bg: "#EDE9FE",
    title: "Devotional Events",
    desc: "Regular bhajan sandhya, kirtan programs, aarti ceremonies, and spiritual discourses for the community.",
  },
  {
    icon: "heart",
    color: "#16A34A",
    bg: "#DCFCE7",
    title: "Transparent Donations",
    desc: "Fully transparent donation management system. Every rupee is accounted for and used for seva activities.",
  },
  {
    icon: "phone-portrait",
    color: "#EA580C",
    bg: "#FFF7ED",
    title: "Smart Booking",
    desc: "Instant seat booking with real-time availability, digital tickets, and secure payments for all yatras.",
  },
  {
    icon: "shield-checkmark",
    color: "#5C1615",
    bg: "#FEF2F2",
    title: "Trusted & Safe",
    desc: "All tours managed by verified operators. Your journey, safety, and comfort are our top priority.",
  },
];

const CONTACT = [
  {
    icon: "location",
    label: "Address",
    value: "C-22, Pandav Nagar, New Delhi – 110092",
    onPress: null,
  },
  {
    icon: "call",
    label: "Phone",
    value: "+91 94167 63420",
    onPress: () => Linking.openURL("tel:+919416763420"),
  },
  {
    icon: "mail",
    label: "Email",
    value: "cipherinfratech@gmail.com",
    onPress: () => Linking.openURL("mailto:cipherinfratech@gmail.com"),
  },
  {
    icon: "logo-whatsapp",
    label: "WhatsApp",
    value: "+91 94167 63420",
    onPress: () => Linking.openURL("https://wa.me/919416763420"),
  },
];

const TEAM = [
  {
    initial: "SS",
    name: "Seva Samiti",
    role: "Spiritual Leadership",
    color: "#5C1615",
  },
  {
    initial: "TK",
    name: "TripKart",
    role: "Technology & Operations",
    color: "#0284C7",
  },
  {
    initial: "CI",
    name: "Cipher Infratech",
    role: "Development Partner",
    color: "#7C3AED",
  },
];

export default function About() {
  const router = useRouter();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const colW = (width - 48 - 12) / 2;

  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>About Us</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.omText}>ॐ</Text>
          <Text style={s.heroTitle}>Shyam Sawariya Parivar</Text>
          <Text style={s.heroTagline}>
            Pilgrimage · Community · Seva · Devotion
          </Text>
          <View style={s.heroUnderline} />
        </View>

        {/* Gray band after hero */}
        <View style={s.grayBand} />

        {/* Stats strip */}
        <View style={s.section}>
          <View style={s.statsStrip}>
            {STATS.map((stat, i) => (
              <React.Fragment key={i}>
                <View style={s.statItem}>
                  <Text style={s.statValue}>{stat.value}</Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                </View>
                {i < STATS.length - 1 && <View style={s.statDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Mission */}
        {/* <View style={s.section}>
          <View style={s.sectionHead}>
            <View style={s.sectionLine} />
            <Text style={s.sectionLabel}>OUR MISSION</Text>
            <View style={s.sectionLine} />
          </View>
          <View style={s.missionCard}>
            <Ionicons
              name="flame"
              size={28}
              color="#D95D39"
              style={{ marginBottom: 12 }}
            />
            <Text style={s.missionText}>
              To make sacred pilgrimages accessible to every devotee — providing
              safe, comfortable, and spiritually enriching yatras across India's
              holy sites, while building a vibrant community of like-minded
              bhakts united by faith in Khatu Shyam Ji.
            </Text>
            <Text style={s.missionMantra}>जय श्री श्याम 🙏</Text>
          </View>
        </View> */}

        {/* What We Do */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <View style={s.sectionLine} />
            <Text style={s.sectionLabel}>WHAT WE DO</Text>
            <View style={s.sectionLine} />
          </View>
          <View style={s.featureGrid}>
            {FEATURES.map((f, i) => (
              <View key={i} style={[s.featureCard, { width: colW }]}>
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
            <Text style={s.sectionLabel}>THE APP</Text>
            <View style={s.sectionLine} />
          </View>
          <View style={s.appCard}>
            <Text style={s.appCardTitle}>TripKart App</Text>
            <Text style={s.appCardSub}>
              A complete digital ecosystem for the Shyam Sawariya Parivar
              community
            </Text>
            <View style={s.appFeatures}>
              {[
                { icon: "phone-portrait", text: "Mobile App for devotees" },
                { icon: "desktop", text: "Web portal for reference" },
                { icon: "settings", text: "Admin panel for operators" },
                { icon: "lock-closed", text: "Enterprise-grade security" },
              ].map((item, i) => (
                <View key={i} style={s.appFeatureRow}>
                  <View style={s.appFeatureDot}>
                    <Ionicons name={item.icon} size={14} color="#D95D39" />
                  </View>
                  <Text style={s.appFeatureText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Team */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <View style={s.sectionLine} />
            <Text style={s.sectionLabel}>OUR TEAM</Text>
            <View style={s.sectionLine} />
          </View>
          {TEAM.map((member, i) => (
            <View key={i} style={s.teamCard}>
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
            <Text style={s.sectionLabel}>CONTACT US</Text>
            <View style={s.sectionLine} />
          </View>
          {CONTACT.map((c, i) => (
            <TouchableOpacity
              key={i}
              style={s.contactCard}
              onPress={c.onPress}
              activeOpacity={c.onPress ? 0.7 : 1}
            >
              <View
                style={[
                  s.contactIcon,
                  { backgroundColor: c.onPress ? "#FEE8E2" : colors.elevated },
                ]}
              >
                <Ionicons
                  name={c.icon}
                  size={18}
                  color={c.onPress ? "#D95D39" : colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.contactLabel}>{c.label}</Text>
                <Text
                  style={[s.contactValue, c.onPress && { color: "#D95D39" }]}
                >
                  {c.value}
                </Text>
              </View>
              {c.onPress && (
                <Ionicons name="open-outline" size={16} color="#D95D39" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerMantra}>जय श्री श्याम 🙏</Text>
          <Text style={s.footerCopy}>
            © 2024 Shyam Sawariya Parivar · TripKart
          </Text>
          <Text style={s.footerDev}>Powered by Cipher Infratech</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderSubtle,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.elevated,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontFamily: fonts.heading,
      fontSize: 20,
      color: colors.textPrimary,
    },

    // Hero
    hero: {
      alignItems: "center",
      paddingVertical: 36,
      paddingHorizontal: 24,
      backgroundColor: colors.surface,
    },
    omText: {
      fontSize: 44,
      color: "#D95D39",
      fontFamily: fonts.heading,
      marginBottom: 12,
    },
    heroTitle: {
      fontFamily: fonts.heading,
      fontSize: 28,
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: 8,
    },
    heroTagline: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 12,
    },
    heroUnderline: {
      height: 3,
      width: 40,
      backgroundColor: "#D95D39",
      borderRadius: 2,
    },

    grayBand: { height: 10, backgroundColor: colors.elevated },

    // Stats
    section: { paddingHorizontal: 16, paddingTop: 28 },
    statsStrip: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.textDisabled,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
    },
    statItem: { flex: 1, alignItems: "center" },
    statDivider: { width: 1, height: 32, backgroundColor: colors.borderSubtle },
    statValue: { fontFamily: fonts.bodyBold, fontSize: 22, color: "#D95D39" },
    statLabel: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textDisabled,
      marginTop: 2,
      textAlign: "center",
    },

    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },
    sectionLine: { flex: 1, height: 1, backgroundColor: colors.borderSubtle },
    sectionLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 11,
      color: colors.textDisabled,
      letterSpacing: 1.5,
      textTransform: "uppercase",
    },

    // Mission
    missionCard: {
      backgroundColor: "#FEF3F0",
      borderRadius: 12,
      padding: 24,
      borderWidth: 1,
      borderColor: "#FECAB7",
      alignItems: "center",
    },
    missionText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 24,
      textAlign: "center",
    },
    missionMantra: {
      fontFamily: fonts.heading,
      fontSize: 18,
      color: "#D95D39",
      marginTop: 16,
    },

    // Features
    featureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    featureCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.textDisabled,
      borderRadius: 12,
      padding: 16,
    },
    featureIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    featureTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    featureDesc: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },

    // App card
    appCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.textDisabled,
      borderRadius: 12,
      padding: 24,
    },
    appCardTitle: {
      fontFamily: fonts.heading,
      fontSize: 22,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    appCardSub: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 20,
      lineHeight: 20,
    },
    appFeatures: { gap: 12 },
    appFeatureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    appFeatureDot: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: "#FEE8E2",
      alignItems: "center",
      justifyContent: "center",
    },
    appFeatureText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textPrimary,
    },

    // Team
    teamCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.textDisabled,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    teamAvatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
    },
    teamInitial: { fontFamily: fonts.bodyBold, fontSize: 15, color: "white" },
    teamName: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    teamRole: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },

    // Contact
    contactCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.textDisabled,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    contactIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    contactLabel: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textDisabled,
    },
    contactValue: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textPrimary,
      marginTop: 1,
    },

    // Footer
    footer: { alignItems: "center", paddingTop: 32, paddingBottom: 8, gap: 6 },
    footerMantra: {
      fontFamily: fonts.heading,
      fontSize: 20,
      color: colors.textPrimary,
    },
    footerCopy: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
    },
    footerDev: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textDisabled,
    },
  });
