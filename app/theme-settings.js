import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, ACCENT_THEMES, useColors } from "../lib/ThemeContext";
import { fonts } from "../lib/theme";
import { api } from "../lib/api";

const MODE_OPTIONS = [
  {
    key: "light",
    icon: "sunny",
    label: "Light Mode",
    desc: "Classic bright interface",
  },
  {
    key: "dark",
    icon: "moon",
    label: "Dark Mode",
    desc: "Easy on the eyes at night",
  },
  {
    key: "system",
    icon: "phone-portrait",
    label: "System Default",
    desc: "Follows your device setting",
  },
];

export default function ThemeSettings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, modePreference, accentId, setMode, setAccent, isDark } =
    useTheme();
  const themeColors = useColors();
  const styles = useMemo(() => makeStyles(themeColors), [themeColors]);

  const handleSetMode = async (mode) => {
    await setMode(mode);
    api.put("/preferences", { themeMode: mode }).catch(() => {});
  };

  const handleSetAccent = async (id) => {
    await setAccent(id);
    api.put("/preferences", { accentTheme: id }).catch(() => {});
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Flat white header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={20}
            color={themeColors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.title}>Appearance</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Gray band */}
      {/* <View style={styles.grayBand} /> */}

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 32,
          gap: 20,
        }}
      >
        {/* Preview card */}
        <View style={styles.previewCard}>
          <View
            style={[
              styles.previewHeader,
              { backgroundColor: isDark ? "#0F0A0A" : "#F8F7F4" },
            ]}
          >
            <View
              style={[styles.previewDot, { backgroundColor: theme.primary }]}
            />
            <View
              style={[
                styles.previewLine,
                { backgroundColor: isDark ? "#2A201C" : "#E8E4DF", width: 60 },
              ]}
            />
          </View>
          <View style={{ padding: 12, gap: 8 }}>
            <View
              style={[
                styles.previewLine,
                { backgroundColor: theme.primary, width: 80 },
              ]}
            />
            <View
              style={[
                styles.previewLine,
                {
                  backgroundColor: isDark ? "#2A201C" : "#E8E4DF",
                  width: "90%",
                },
              ]}
            />
            <View
              style={[
                styles.previewLine,
                {
                  backgroundColor: isDark ? "#2A201C" : "#E8E4DF",
                  width: "70%",
                },
              ]}
            />
            <View
              style={[styles.previewBtn, { backgroundColor: theme.primary }]}
            >
              <View
                style={[
                  styles.previewLine,
                  { backgroundColor: "rgba(255,255,255,0.6)", width: 40 },
                ]}
              />
            </View>
          </View>
          <Text style={styles.previewLabel}>
            {isDark ? "Dark mode preview" : "Light mode preview"}
          </Text>
        </View>

        {/* Mode selection */}
        <View style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>Brightness Mode</Text>
          {MODE_OPTIONS.map((opt) => {
            const isActive = modePreference === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.modeCard, isActive && styles.modeCardActive]}
                onPress={() => handleSetMode(opt.key)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.modeIcon,
                    {
                      backgroundColor: isActive
                        ? "#FEF3F0"
                        : themeColors.elevated,
                    },
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={isActive ? "#D95D39" : themeColors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.modeLabel,
                      { color: isActive ? "#D95D39" : themeColors.textPrimary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={styles.modeDesc}>{opt.desc}</Text>
                </View>
                {isActive && (
                  <Ionicons name="checkmark-circle" size={22} color="#D95D39" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Accent color themes */}
        <View style={{ gap: 12 }}>
          <Text style={styles.sectionTitle}>Color Theme</Text>
          <View style={styles.accentContainer}>
            <View style={styles.accentGrid}>
              {ACCENT_THEMES.map((accentTheme) => {
                const isActive = accentId === accentTheme.id;
                return (
                  <TouchableOpacity
                    key={accentTheme.id}
                    style={[
                      styles.accentCard,
                      isActive && styles.accentCardActive,
                    ]}
                    onPress={() => handleSetAccent(accentTheme.id)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.accentSwatch,
                        { backgroundColor: accentTheme.primary },
                      ]}
                    >
                      {isActive && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                    <Text style={styles.accentEmoji}>{accentTheme.emoji}</Text>
                    <Text
                      style={[
                        styles.accentName,
                        isActive && { color: accentTheme.primary },
                      ]}
                    >
                      {accentTheme.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Info note */}
        <View style={styles.note}>
          <Ionicons name="information-circle" size={16} color="#D95D39" />
          <Text style={styles.noteText}>
            Theme settings are saved automatically and sync across your devices.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },

    /* Header */
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
    title: {
      flex: 1,
      fontFamily: "Philosopher_700Bold",
      fontSize: 18,
      color: colors.textPrimary,
      marginLeft: 10,
    },

    /* Gray band */
    grayBand: {
      height: 10,
      backgroundColor: colors.elevated,
    },

    /* Preview card */
    previewCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 12,
      overflow: "hidden",
    },
    previewHeader: {
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    previewDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    previewLine: {
      height: 8,
      borderRadius: 4,
    },
    previewBtn: {
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignSelf: "flex-start",
      marginTop: 4,
    },
    previewLabel: {
      textAlign: "center",
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textSecondary,
      paddingBottom: 10,
    },

    /* Section title */
    sectionTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 11,
      color: colors.textDisabled,
      textTransform: "uppercase",
      letterSpacing: 1.5,
    },

    /* Mode cards */
    modeCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 12,
      padding: 14,
    },
    modeCardActive: {
      borderColor: "#D95D39",
      borderWidth: 1.5,
      backgroundColor: "#FEF3F0",
    },
    modeIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    modeLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    modeDesc: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },

    /* Accent grid */
    accentContainer: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 12,
      padding: 14,
    },
    accentGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    accentCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      alignItems: "center",
      gap: 6,
      width: "18%",
      minWidth: 60,
      borderWidth: 2,
      borderColor: "transparent",
    },
    accentCardActive: {
      borderColor: "#D95D39",
    },
    accentSwatch: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    accentEmoji: {
      fontSize: 14,
    },
    accentName: {
      fontFamily: fonts.body,
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: "center",
    },

    /* Note */
    note: {
      flexDirection: "row",
      gap: 8,
      alignItems: "flex-start",
      backgroundColor: "#FEF3F0",
      borderRadius: 12,
      padding: 12,
    },
    noteText: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 12,
      color: "#D95D39",
      lineHeight: 18,
    },
  });
