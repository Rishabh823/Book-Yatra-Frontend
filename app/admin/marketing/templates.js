import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AdminShell } from "../../../lib/AdminScreen";
import { useColors } from "../../../lib/ThemeContext";
import { fonts, radius } from "../../../lib/theme";
import { marketing as mktApi } from "../../../lib/api";
import { useFocusEffect } from "expo-router";

const CATEGORY_COLORS = {
  tour_launch: "#D95D39",
  flash_sale: "#DC2626",
  price_drop: "#D97706",
  limited_seats: "#9333EA",
  festival: "#16A34A",
  weekend: "#0891B2",
  last_chance: "#DC2626",
  referral: "#8B5CF6",
  cashback: "#16A34A",
};

const CATEGORY_LABELS = {
  tour_launch: "Tour Launch",
  flash_sale: "Flash Sale",
  price_drop: "Price Drop",
  limited_seats: "Limited Seats",
  festival: "Festival",
  weekend: "Weekend",
  last_chance: "Last Chance",
  referral: "Referral",
  cashback: "Cashback",
};

const FILTER_CHIPS = [
  "All",
  "Tour Launch",
  "Flash Sale",
  "Price Drop",
  "Limited Seats",
  "Festival",
  "Weekend",
  "Last Chance",
  "Referral",
  "Cashback",
];

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1 },
    chipsRow: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 6,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      marginRight: 8,
      alignSelf: 'flex-start',
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipTxt: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
    },
    chipTxtActive: { color: '#fff', fontFamily: fonts.bodyBold },
    grid: {
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 40,
    },
    gridRow: {
      gap: 10,
      marginBottom: 10,
    },
    templateCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 120,
    },
    categoryBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 50,
      marginBottom: 8,
    },
    categoryTxt: {
      fontFamily: fonts.bodyMedium,
      fontSize: 10,
      color: "#fff",
    },
    templateName: {
      fontFamily: fonts.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
      marginBottom: 8,
      flex: 1,
    },
    platformCountBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      alignSelf: "flex-start",
      backgroundColor: colors.surface,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 50,
    },
    platformCountTxt: {
      fontFamily: fonts.body,
      fontSize: 11,
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
    // Bottom sheet
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
    },
    sheetHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 16,
    },
    sheetCategory: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 50,
      marginBottom: 10,
    },
    sheetCategoryTxt: {
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      color: "#fff",
    },
    sheetName: {
      fontFamily: fonts.heading,
      fontSize: 20,
      color: colors.textPrimary,
      marginBottom: 12,
    },
    sheetLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 11,
      color: colors.textSecondary,
      letterSpacing: 1,
      marginBottom: 6,
      marginTop: 12,
    },
    promptBox: {
      backgroundColor: colors.surface,
      borderRadius: radius.sm,
      padding: 12,
    },
    promptTxt: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    useBtn: {
      backgroundColor: colors.primary,
      borderRadius: radius.pill,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 20,
    },
    useBtnTxt: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: "#fff",
    },
  });
}

function TemplateCard({ template, colors, s, onPress }) {
  const catColor = CATEGORY_COLORS[template.category] || "#6B7280";
  const catLabel = CATEGORY_LABELS[template.category] || template.category || "General";
  const platformCount = Array.isArray(template.platforms)
    ? template.platforms.length
    : 0;

  return (
    <TouchableOpacity style={s.templateCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.categoryBadge, { backgroundColor: catColor }]}>
        <Text style={s.categoryTxt}>{catLabel}</Text>
      </View>
      <Text style={s.templateName} numberOfLines={2}>
        {template.name}
      </Text>
      {platformCount > 0 && (
        <View style={s.platformCountBadge}>
          <Ionicons name="share-social-outline" size={11} color={colors.textSecondary} />
          <Text style={s.platformCountTxt}>{platformCount} platforms</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function categoryKeyFromLabel(label) {
  return Object.entries(CATEGORY_LABELS).find(([, v]) => v === label)?.[0] || null;
}

export default function TemplatesScreen() {
  const router = useRouter();
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await mktApi.getTemplates();
      const arr = Array.isArray(res) ? res : res?.templates || res?.data || [];
      setTemplates(arr);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    if (activeFilter === "All") return templates;
    const key = categoryKeyFromLabel(activeFilter);
    if (!key) return templates;
    return templates.filter((t) => t.category === key);
  }, [templates, activeFilter]);

  // Build rows of 2
  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < filtered.length; i += 2) {
      result.push(filtered.slice(i, i + 2));
    }
    return result;
  }, [filtered]);

  const selectedCatColor =
    selected ? CATEGORY_COLORS[selected.category] || "#6B7280" : "#6B7280";
  const selectedCatLabel =
    selected
      ? CATEGORY_LABELS[selected.category] || selected.category || "General"
      : "";

  return (
    <AdminShell title="Marketing Templates" subtitle="Ready-made campaign templates">
      <View style={s.container}>
        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipsRow}
          contentContainerStyle={{ flexDirection: 'row', alignItems: 'center' }}
        >
          {FILTER_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip}
              style={[s.chip, activeFilter === chip && s.chipActive]}
              onPress={() => setActiveFilter(chip)}
              activeOpacity={0.8}
            >
              <Text
                style={[s.chipTxt, activeFilter === chip && s.chipTxtActive]}
              >
                {chip}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator
            color={colors.primary}
            size="large"
            style={{ marginTop: 60 }}
          />
        ) : filtered.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="documents-outline" size={48} color={colors.border} />
            <Text style={s.emptyTitle}>No Templates Found</Text>
            <Text style={s.emptyTxt}>
              No templates match the selected category.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.grid}
          >
            {rows.map((row, ri) => (
              <View key={ri} style={[{ flexDirection: "row" }, s.gridRow]}>
                {row.map((template) => (
                  <TemplateCard
                    key={template._id}
                    template={template}
                    colors={colors}
                    s={s}
                    onPress={() => setSelected(template)}
                  />
                ))}
                {row.length === 1 && <View style={{ flex: 1 }} />}
              </View>
            ))}
          </ScrollView>
        )}

        {/* Bottom sheet */}
        <Modal
          visible={!!selected}
          transparent
          animationType="slide"
          onRequestClose={() => setSelected(null)}
        >
          <Pressable style={s.overlay} onPress={() => setSelected(null)}>
            <Pressable onPress={() => {}}>
              <View style={s.sheet}>
                <View style={s.sheetHandle} />
                {selected && (
                  <>
                    <View
                      style={[
                        s.sheetCategory,
                        { backgroundColor: selectedCatColor },
                      ]}
                    >
                      <Text style={s.sheetCategoryTxt}>{selectedCatLabel}</Text>
                    </View>
                    <Text style={s.sheetName}>{selected.name}</Text>

                    <Text style={s.sheetLabel}>PROMPT PREVIEW</Text>
                    <View style={s.promptBox}>
                      <Text style={s.promptTxt} numberOfLines={6}>
                        {selected.prompt || selected.description || "No preview available."}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={s.useBtn}
                      onPress={() => {
                        setSelected(null);
                        router.push({
                          pathname: "/admin/marketing/ai-generator",
                          params: { templateId: selected._id },
                        });
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={s.useBtnTxt}>Use This Template</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </AdminShell>
  );
}
