import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ACCENT_THEMES } from '../lib/ThemeContext';
import { colors, fonts, radius, shadow } from '../lib/theme';
import { api } from '../lib/api';

const MODE_OPTIONS = [
  { key: 'light',  icon: 'sunny',       label: 'Light Mode',    desc: 'Classic bright interface' },
  { key: 'dark',   icon: 'moon',        label: 'Dark Mode',     desc: 'Easy on the eyes at night' },
  { key: 'system', icon: 'phone-portrait', label: 'System Default', desc: 'Follows your device setting' },
];

export default function ThemeSettings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, modePreference, accentId, setMode, setAccent, isDark } = useTheme();

  const handleSetMode = async (mode) => {
    await setMode(mode);
    api.put('/preferences', { themeMode: mode }).catch(() => {});
  };

  const handleSetAccent = async (id) => {
    await setAccent(id);
    api.put('/preferences', { accentTheme: id }).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={['#1E0A0A', '#5C1615']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.heroTitle}>Appearance</Text>
        <Text style={styles.heroSub}>Theme & color customization</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}>

        {/* Preview card */}
        <View style={[styles.preview, { backgroundColor: isDark ? '#1C1410' : '#FFFFFF' }, shadow.card]}>
          <View style={[styles.previewHeader, { backgroundColor: isDark ? '#0F0A0A' : '#F8F7F4' }]}>
            <View style={[styles.previewDot, { backgroundColor: theme.primary }]} />
            <View style={[styles.previewLine, { backgroundColor: isDark ? '#2A201C' : '#E8E4DF', width: 60 }]} />
          </View>
          <View style={{ padding: 12, gap: 8 }}>
            <View style={[styles.previewLine, { backgroundColor: theme.primary, width: 80 }]} />
            <View style={[styles.previewLine, { backgroundColor: isDark ? '#2A201C' : '#E8E4DF', width: '90%' }]} />
            <View style={[styles.previewLine, { backgroundColor: isDark ? '#2A201C' : '#E8E4DF', width: '70%' }]} />
            <View style={[styles.previewBtn, { backgroundColor: theme.primary }]}>
              <View style={[styles.previewLine, { backgroundColor: 'rgba(255,255,255,0.6)', width: 40 }]} />
            </View>
          </View>
          <Text style={[styles.previewLabel, { color: isDark ? '#9B8F85' : '#6B7280' }]}>
            {isDark ? 'Dark mode preview' : 'Light mode preview'}
          </Text>
        </View>

        {/* Mode selection */}
        <Text style={styles.sectionTitle}>Brightness Mode</Text>
        {MODE_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.modeCard, shadow.soft, modePreference === opt.key && styles.modeCardActive]}
            onPress={() => handleSetMode(opt.key)}
            activeOpacity={0.75}
          >
            <View style={[styles.modeIcon, { backgroundColor: modePreference === opt.key ? colors.primary : '#F3F4F6' }]}>
              <Ionicons name={opt.icon} size={20} color={modePreference === opt.key ? 'white' : colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeLabel}>{opt.label}</Text>
              <Text style={styles.modeDesc}>{opt.desc}</Text>
            </View>
            {modePreference === opt.key && (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}

        {/* Accent color themes */}
        <Text style={styles.sectionTitle}>Color Theme</Text>
        <View style={styles.accentGrid}>
          {ACCENT_THEMES.map(theme => {
            const isActive = accentId === theme.id;
            return (
              <TouchableOpacity
                key={theme.id}
                style={[styles.accentCard, shadow.soft, isActive && styles.accentCardActive]}
                onPress={() => handleSetAccent(theme.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.accentSwatch, { backgroundColor: theme.primary }]}>
                  {isActive && <Ionicons name="checkmark" size={16} color="white" />}
                </View>
                <Text style={styles.accentEmoji}>{theme.emoji}</Text>
                <Text style={[styles.accentName, isActive && { color: theme.primary }]}>{theme.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.note}>
          <Ionicons name="information-circle" size={16} color={colors.primary} />
          <Text style={styles.noteText}>Theme settings are saved automatically and sync across your devices.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero:       { paddingHorizontal: 20, paddingBottom: 24 },
  back:       { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle:  { fontFamily: fonts.heading, fontSize: 24, color: 'white' },
  heroSub:    { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 },

  preview:     { borderRadius: radius.xl, overflow: 'hidden' },
  previewHeader: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewDot:  { width: 10, height: 10, borderRadius: 5 },
  previewLine: { height: 8, borderRadius: 4 },
  previewBtn:  { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start', marginTop: 4 },
  previewLabel:{ textAlign: 'center', fontFamily: fonts.body, fontSize: 11, paddingBottom: 10 },

  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },

  modeCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1.5, borderColor: 'transparent' },
  modeCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  modeIcon:       { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modeLabel:      { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textPrimary },
  modeDesc:       { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 1 },

  accentGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accentCard:     { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, alignItems: 'center', gap: 6, width: '18%', minWidth: 60, borderWidth: 2, borderColor: 'transparent' },
  accentCardActive: { borderColor: colors.primary },
  accentSwatch:   { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  accentEmoji:    { fontSize: 14 },
  accentName:     { fontFamily: fonts.body, fontSize: 10, color: colors.textSecondary, textAlign: 'center' },

  note:     { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: 12 },
  noteText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.secondary, lineHeight: 18 },
});
