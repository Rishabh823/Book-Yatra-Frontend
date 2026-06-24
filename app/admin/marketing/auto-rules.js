import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Alert,
  Modal,
  TextInput,
  Pressable,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminShell } from "../../../lib/AdminScreen";
import { useColors } from "../../../lib/ThemeContext";
import { fonts, radius } from "../../../lib/theme";
import { marketing as mktApi } from "../../../lib/api";
import { useFocusEffect } from "expo-router";

const TRIGGER_COLORS = {
  tour_created: "#16A34A",
  tour_published: "#D95D39",
  seats_low: "#DC2626",
  price_drop: "#D97706",
  tour_starts_soon: "#0891B2",
  festival_season: "#8B5CF6",
};

const TRIGGER_LABELS = {
  tour_created: "New Tour Created",
  tour_published: "Tour Published",
  seats_low: "Seats Low",
  price_drop: "Price Drop",
  tour_starts_soon: "Tour Starts Soon",
  festival_season: "Festival Season",
};

const PLATFORMS = ["Telegram", "WhatsApp", "Facebook", "Instagram"];
const TRIGGERS = Object.keys(TRIGGER_LABELS);
const LANGUAGES = ["English", "Hindi"];

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
    ruleCard: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ruleTop: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    ruleName: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
      flex: 1,
    },
    triggerBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 50,
      marginRight: 10,
    },
    triggerTxt: {
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      color: "#fff",
    },
    ruleMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 10,
    },
    ruleMetaTxt: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
    },
    platformsRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
    platformChip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 50,
      backgroundColor: colors.surface,
    },
    platformChipTxt: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textSecondary,
    },
    ruleActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
    },
    deleteBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: "#DC2626",
    },
    deleteBtnTxt: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: "#DC2626",
    },
    spacer: { flex: 1 },
    activeLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
    },
    emptyBox: {
      alignItems: "center",
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: colors.textPrimary,
      marginTop: 14,
      marginBottom: 6,
    },
    emptyTxt: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    fab: {
      position: "absolute",
      bottom: 24,
      right: 20,
      backgroundColor: colors.primary,
      borderRadius: 28,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      gap: 8,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    fabTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
    // Modal
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 36,
      maxHeight: "90%",
    },
    sheetHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 16,
    },
    sheetTitle: {
      fontFamily: fonts.heading,
      fontSize: 18,
      color: colors.textPrimary,
      marginBottom: 16,
    },
    fieldLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 11,
      color: colors.textSecondary,
      letterSpacing: 1,
      marginBottom: 8,
      marginTop: 14,
    },
    textInput: {
      backgroundColor: colors.surface,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textPrimary,
    },
    radioRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    radioChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 50,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    radioChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "22",
    },
    radioChipTxt: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.textSecondary,
    },
    radioChipTxtActive: { color: colors.primary },
    checkRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    checkChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 50,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    checkChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "22",
    },
    checkChipTxt: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.textSecondary,
    },
    checkChipTxtActive: { color: colors.primary },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: radius.pill,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 20,
    },
    saveBtnTxt: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: "#fff",
    },
  });
}

function RuleCard({ rule, colors, s, onToggle, onDelete }) {
  const triggerColor = TRIGGER_COLORS[rule.trigger] || "#6B7280";
  const triggerLabel = TRIGGER_LABELS[rule.trigger] || rule.trigger || "Unknown";
  const platforms = Array.isArray(rule.platforms) ? rule.platforms : [];

  return (
    <View style={s.ruleCard}>
      <View style={s.ruleTop}>
        <Text style={s.ruleName} numberOfLines={1}>
          {rule.name}
        </Text>
        <View style={[s.triggerBadge, { backgroundColor: triggerColor }]}>
          <Text style={s.triggerTxt}>{triggerLabel}</Text>
        </View>
      </View>

      {rule.language && (
        <View style={s.ruleMeta}>
          <Ionicons name="language-outline" size={13} color={colors.textSecondary} />
          <Text style={s.ruleMetaTxt}>{rule.language}</Text>
        </View>
      )}

      {platforms.length > 0 && (
        <View style={s.platformsRow}>
          {platforms.map((p) => (
            <View key={p} style={s.platformChip}>
              <Text style={s.platformChipTxt}>{p}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={s.ruleActions}>
        <TouchableOpacity style={s.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={13} color="#DC2626" />
          <Text style={s.deleteBtnTxt}>Delete</Text>
        </TouchableOpacity>
        <View style={s.spacer} />
        <Text style={s.activeLabel}>{rule.isActive ? "Active" : "Inactive"}</Text>
        <Switch
          value={!!rule.isActive}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary + "66" }}
          thumbColor={rule.isActive ? colors.primary : "#9CA3AF"}
        />
      </View>
    </View>
  );
}

const DEFAULT_FORM = {
  name: "",
  trigger: "",
  platforms: [],
  language: "English",
};

export default function AutoRulesScreen() {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await mktApi.getAutoRules();
      const arr = Array.isArray(res) ? res : res?.rules || res?.data || [];
      setRules(arr);
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleToggle = useCallback(async (rule) => {
    try {
      await mktApi.updateAutoRule(rule._id, { isActive: !rule.isActive });
      setRules((prev) =>
        prev.map((r) =>
          r._id === rule._id ? { ...r, isActive: !r.isActive } : r
        )
      );
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to update rule");
    }
  }, []);

  const handleDelete = useCallback(
    (rule) => {
      Alert.alert(
        "Delete Rule",
        `Delete "${rule.name}"? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await mktApi.deleteAutoRule(rule._id);
                load(true);
              } catch (e) {
                Alert.alert("Error", e?.message || "Failed to delete rule");
              }
            },
          },
        ]
      );
    },
    [load]
  );

  const togglePlatform = useCallback((p) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      Alert.alert("Validation", "Please enter a rule name.");
      return;
    }
    if (!form.trigger) {
      Alert.alert("Validation", "Please select a trigger.");
      return;
    }
    if (form.platforms.length === 0) {
      Alert.alert("Validation", "Please select at least one platform.");
      return;
    }
    setSaving(true);
    try {
      await mktApi.createAutoRule({
        name: form.name.trim(),
        trigger: form.trigger,
        platforms: form.platforms,
        language: form.language,
        isActive: true,
      });
      setShowModal(false);
      setForm({ ...DEFAULT_FORM });
      load(true);
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to create rule");
    } finally {
      setSaving(false);
    }
  }, [form, load]);

  return (
    <AdminShell title="Auto Campaign Rules" subtitle="Automated posting triggers">
      <View style={s.container}>
        {loading ? (
          <ActivityIndicator
            color={colors.primary}
            size="large"
            style={{ marginTop: 60 }}
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load(true);
                }}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          >
            {rules.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons
                  name="flash-outline"
                  size={48}
                  color={colors.border}
                />
                <Text style={s.emptyTitle}>No Auto Rules</Text>
                <Text style={s.emptyTxt}>
                  Add rules to automatically post campaigns when specific events
                  occur.
                </Text>
              </View>
            ) : (
              rules.map((rule) => (
                <RuleCard
                  key={rule._id}
                  rule={rule}
                  colors={colors}
                  s={s}
                  onToggle={() => handleToggle(rule)}
                  onDelete={() => handleDelete(rule)}
                />
              ))
            )}
          </ScrollView>
        )}

        {/* FAB */}
        <TouchableOpacity
          style={s.fab}
          onPress={() => {
            setForm({ ...DEFAULT_FORM });
            setShowModal(true);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.fabTxt}>Add Rule</Text>
        </TouchableOpacity>

        {/* Add Rule Modal */}
        <Modal
          visible={showModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowModal(false)}
        >
          <Pressable style={s.overlay} onPress={() => setShowModal(false)}>
            <Pressable onPress={() => {}}>
              <ScrollView
                style={s.sheet}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={s.sheetHandle} />
                <Text style={s.sheetTitle}>Add Auto Rule</Text>

                {/* Rule Name */}
                <Text style={s.fieldLabel}>RULE NAME</Text>
                <TextInput
                  style={s.textInput}
                  value={form.name}
                  onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                  placeholder="e.g. Announce New Tour"
                  placeholderTextColor={colors.textSecondary}
                />

                {/* Trigger */}
                <Text style={s.fieldLabel}>TRIGGER</Text>
                <View style={s.radioRow}>
                  {TRIGGERS.map((key) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        s.radioChip,
                        form.trigger === key && s.radioChipActive,
                      ]}
                      onPress={() => setForm((p) => ({ ...p, trigger: key }))}
                    >
                      <Text
                        style={[
                          s.radioChipTxt,
                          form.trigger === key && s.radioChipTxtActive,
                        ]}
                      >
                        {TRIGGER_LABELS[key]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Platforms */}
                <Text style={s.fieldLabel}>PLATFORMS</Text>
                <View style={s.checkRow}>
                  {PLATFORMS.map((p) => {
                    const active = form.platforms.includes(p);
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[s.checkChip, active && s.checkChipActive]}
                        onPress={() => togglePlatform(p)}
                      >
                        {active && (
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color={colors.primary}
                          />
                        )}
                        <Text
                          style={[
                            s.checkChipTxt,
                            active && s.checkChipTxtActive,
                          ]}
                        >
                          {p}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Language */}
                <Text style={s.fieldLabel}>LANGUAGE</Text>
                <View style={s.radioRow}>
                  {LANGUAGES.map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      style={[
                        s.radioChip,
                        form.language === lang && s.radioChipActive,
                      ]}
                      onPress={() => setForm((p) => ({ ...p, language: lang }))}
                    >
                      <Text
                        style={[
                          s.radioChipTxt,
                          form.language === lang && s.radioChipTxtActive,
                        ]}
                      >
                        {lang}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[s.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.saveBtnTxt}>Save Rule</Text>
                  )}
                </TouchableOpacity>

                <View style={{ height: 20 }} />
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </AdminShell>
  );
}
