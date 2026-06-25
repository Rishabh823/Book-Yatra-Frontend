import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fonts, radius } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";

const SECTIONS = [
  {
    title: "1. Information We Collect",
    icon: "document-text-outline",
    content: [
      {
        sub: "Personal Information",
        text: "When you register or use TripKart, we collect your name, email address, phone number, and profile photo.",
      },
      {
        sub: "Location Data",
        text: "We collect your device location to show nearby tours, live bus tracking, and to improve route accuracy. Location is only collected when you use the app.",
      },
      {
        sub: "Device Information",
        text: "We collect device identifiers, operating system version, and app usage data to improve app performance and fix bugs.",
      },
      {
        sub: "Payment Information",
        text: "We do not store your card or bank details. Payments are processed securely through Razorpay. We only store transaction IDs and booking references.",
      },
      {
        sub: "Emergency Contacts",
        text: "If you provide emergency contact details, they are stored securely and only used in SOS situations.",
      },
    ],
  },
  {
    title: "2. How We Use Your Information",
    icon: "settings-outline",
    content: [
      { sub: "", text: "To create and manage your account" },
      { sub: "", text: "To process tour bookings and payments" },
      { sub: "", text: "To provide live bus tracking and location services" },
      { sub: "", text: "To send booking confirmations and trip notifications" },
      { sub: "", text: "To respond to support queries and feedback" },
      { sub: "", text: "To improve our services and app experience" },
      { sub: "", text: "To send promotional offers (you can opt out anytime)" },
      { sub: "", text: "To comply with legal obligations" },
    ],
  },
  {
    title: "3. Information Sharing",
    icon: "share-social-outline",
    content: [
      {
        sub: "Tour Operators",
        text: "We share your name and phone number with the tour operator for your booking. This is necessary to complete your journey.",
      },
      {
        sub: "Payment Processors",
        text: "Payment details are shared with Razorpay solely for processing transactions. We do not sell your financial data.",
      },
      {
        sub: "Legal Requirements",
        text: "We may disclose your information if required by law, court order, or government authority.",
      },
      {
        sub: "We Never Sell Your Data",
        text: "We do not sell, rent, or trade your personal information to third parties for marketing purposes.",
      },
    ],
  },
  {
    title: "4. Data Storage & Security",
    icon: "shield-checkmark-outline",
    content: [
      {
        sub: "",
        text: "Your data is stored on secure servers with encryption. We use industry-standard SSL/TLS protocols to protect data in transit.",
      },
      {
        sub: "",
        text: "Access to personal data is restricted to authorised personnel only.",
      },
      {
        sub: "",
        text: "We retain your data as long as your account is active or as needed to provide services. You may request deletion at any time.",
      },
    ],
  },
  {
    title: "5. Permissions We Request",
    icon: "lock-closed-outline",
    content: [
      {
        sub: "Location (Fine & Coarse)",
        text: "Used for live bus tracking and showing nearby tours. You can disable this in device settings.",
      },
      {
        sub: "Camera & Storage",
        text: "Used for uploading profile photos and travel documents. Only accessed when you choose to upload.",
      },
      {
        sub: "Notifications",
        text: "Used to send booking updates, departure alerts, and trip reminders. You can manage this in device settings.",
      },
      {
        sub: "Biometrics",
        text: "Optional. Used for quick and secure app login via fingerprint or Face ID.",
      },
    ],
  },
  {
    title: "6. Your Rights",
    icon: "person-outline",
    content: [
      {
        sub: "Access",
        text: "You can view all data we hold about you via your profile.",
      },
      {
        sub: "Correction",
        text: "You can update your personal details at any time in the app.",
      },
      {
        sub: "Deletion",
        text: "You can request deletion of your account and all associated data by contacting us.",
      },
      {
        sub: "Opt-Out",
        text: "You can unsubscribe from marketing notifications at any time in app settings.",
      },
    ],
  },
  {
    title: "7. Children's Privacy",
    icon: "happy-outline",
    content: [
      {
        sub: "",
        text: "TripKart is not intended for children under 13 years of age. We do not knowingly collect personal data from children. If you believe a child has provided us personal information, please contact us and we will delete it promptly.",
      },
    ],
  },
  {
    title: "8. Cookies & Analytics",
    icon: "analytics-outline",
    content: [
      {
        sub: "",
        text: "We use anonymised analytics to understand how users interact with the app. This data cannot identify you personally and helps us improve the user experience.",
      },
    ],
  },
  {
    title: "9. Changes to This Policy",
    icon: "refresh-outline",
    content: [
      {
        sub: "",
        text: "We may update this Privacy Policy from time to time. We will notify you of significant changes via the app or email. Continued use of TripKart after changes means you accept the updated policy.",
      },
    ],
  },
  {
    title: "10. Contact Us",
    icon: "mail-outline",
    content: [
      {
        sub: "",
        text: "If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:\n\nEmail: support@tripkart.in\nCompany: CipherInfraTech\nAddress: India",
      },
    ],
  },
];

export default function PrivacyPolicyScreen() {
  const colors = useColors();
  const router = useRouter();
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons
              name="shield-checkmark"
              size={36}
              color={colors.primary}
            />
          </View>
          <Text style={s.heroTitle}>Your Privacy Matters</Text>
          <Text style={s.heroSub}>
            TripKart is committed to protecting your personal data. This policy
            explains what we collect, how we use it, and your rights.
          </Text>
          <View style={s.effectiveBadge}>
            <Ionicons
              name="calendar-outline"
              size={13}
              color={colors.textSecondary}
            />
            <Text style={s.effectiveText}>Effective Date: 25 June 2026</Text>
          </View>
        </View>

        {/* Sections */}
        {SECTIONS.map((section, si) => (
          <View key={si} style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionIconBox}>
                <Ionicons
                  name={section.icon}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <Text style={s.sectionTitle}>{section.title}</Text>
            </View>
            {section.content.map((item, ii) => (
              <View key={ii} style={s.item}>
                {item.sub ? <Text style={s.itemSub}>{item.sub}</Text> : null}
                <Text style={s.itemText}>{item.text}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={s.footer}>
          <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
          <Text style={s.footerText}>
            © 2026 TripKart · CipherInfraTech · All rights reserved
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
      backgroundColor: colors.surface,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.elevated,
    },
    headerTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 17,
      color: colors.textPrimary,
    },

    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 40 },

    // Hero
    hero: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 20,
      alignItems: "center",
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    heroIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    heroTitle: {
      fontFamily: fonts.heading,
      fontSize: 22,
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: "center",
    },
    heroSub: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 21,
      marginBottom: 12,
    },
    effectiveBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.elevated,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    effectiveText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.textSecondary,
    },

    // Sections
    section: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    sectionIconBox: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: colors.textPrimary,
      flex: 1,
    },

    item: { marginBottom: 10 },
    itemSub: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.textPrimary,
      marginBottom: 3,
    },
    itemText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
    },

    // Footer
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 8,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
    },
    footerText: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
    },
  });
}
